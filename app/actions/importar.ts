"use server";

import Anthropic from "@anthropic-ai/sdk";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ParsedProducto {
  codigo: string | null;
  descripcion: string;
  pvp: number | null;
  cantidad: number;
  valido: boolean;
}

export interface ParseResultado {
  productos: ParsedProducto[];
  advertencias: string[];
  notas: string;
}

interface ExpositorData {
  nombre: string;
  tiene_iva: boolean;
  comision_dominga: number;
}

function buildPrompt(expositor: ExpositorData, notasUsuario: string): string {
  const ivaLabel = expositor.tiene_iva ? "Con IVA 15% incluido en el PVP" : "Sin IVA";
  return `Eres un asistente para la aplicación Dominga que gestiona pop-ups de marcas en Ecuador.

Marca: "${expositor.nombre}" | IVA: ${ivaLabel} | Comisión Dominga: ${expositor.comision_dominga}%${notasUsuario ? `\nNotas del usuario: "${notasUsuario}"` : ""}

Analiza este documento de ingreso de inventario y registra los productos con la herramienta ${TOOL_NAME}. En "notas" deja un breve resumen de qué se encontró y cualquier discrepancia con la marca.

Reglas importantes:
- pvp es el precio de venta al público en dólares (número positivo)
- Si el documento indica precios SIN IVA y la marca tiene IVA 15%, calcula pvp = precio_sin_iva * 1.15 y redondea a 2 decimales
- Si no puedes determinar el pvp con certeza, usa null y menciona el producto en advertencias
- Detecta si algún nombre de marca en el documento no coincide con "${expositor.nombre}" y advierte
- Si no se especifica cantidad, usa 1
- Incluye todos los productos encontrados aunque tengan datos incompletos
- El campo "codigo" es opcional (SKU, referencia); usa null si no existe`;
}

// Una herramienta con input_schema hace que la API entregue el JSON ya parseado;
// pedir JSON en texto libre fallaba con inventarios largos (respuesta cortada a la mitad)
const TOOL_NAME = "registrar_inventario";

const registrarInventarioTool: Anthropic.Tool = {
  name: TOOL_NAME,
  description: "Registra los productos extraídos del documento de ingreso de inventario.",
  input_schema: {
    type: "object",
    properties: {
      productos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            codigo: { type: ["string", "null"], description: "SKU o referencia; null si no existe" },
            descripcion: { type: "string" },
            pvp: { type: ["number", "null"], description: "Precio de venta al público en dólares" },
            cantidad: { type: "number" },
          },
          required: ["codigo", "descripcion", "pvp", "cantidad"],
        },
      },
      advertencias: { type: "array", items: { type: "string" } },
      notas: { type: "string" },
    },
    required: ["productos", "advertencias", "notas"],
  },
};

const respuestaSchema = z.object({
  productos: z.array(
    z.object({
      codigo: z.string().nullish(),
      descripcion: z.string().nullish(),
      pvp: z.number().nullish(),
      cantidad: z.number().nullish(),
    })
  ),
  advertencias: z.array(z.string()).nullish(),
  notas: z.string().nullish(),
});

function normalizarRespuesta(input: unknown): ParseResultado | { error: string } {
  const parsed = respuestaSchema.safeParse(input);
  if (!parsed.success) return { error: "La respuesta de Claude no tiene el formato esperado. Intenta de nuevo." };

  const productos: ParsedProducto[] = parsed.data.productos.map((p) => ({
    codigo: p.codigo ?? null,
    descripcion: p.descripcion ?? "",
    pvp: p.pvp ?? null,
    cantidad: p.cantidad != null && p.cantidad > 0 ? Math.round(p.cantidad) : 1,
    valido: !!p.descripcion && p.pvp != null && p.pvp > 0,
  }));

  return {
    productos,
    advertencias: parsed.data.advertencias ?? [],
    notas: parsed.data.notas ?? "",
  };
}

export async function parsearIngreso(
  formData: FormData,
  expositor: ExpositorData,
  notasUsuario: string
): Promise<ParseResultado | { error: string }> {
  const archivo = formData.get("archivo") as File | null;
  if (!archivo) return { error: "No se recibió ningún archivo" };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEY no configurada en el servidor" };

  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(expositor, notasUsuario);
  const nombre = archivo.name.toLowerCase();

  try {
    let messages: Anthropic.MessageParam[];

    if (nombre.endsWith(".pdf")) {
      const buffer = await archivo.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      messages = [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ];
    } else {
      let tabularText: string;

      if (nombre.endsWith(".csv")) {
        const text = await archivo.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        tabularText = JSON.stringify(result.data, null, 2);
      } else {
        // Excel (.xlsx / .xls)
        const buffer = await archivo.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("El archivo Excel no tiene hojas");
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) throw new Error("No se pudo leer la hoja del archivo Excel");
        const data = XLSX.utils.sheet_to_json(sheet);
        tabularText = JSON.stringify(data, null, 2);
      }

      messages = [
        {
          role: "user",
          content: `${prompt}\n\nContenido del documento (JSON tabular):\n\`\`\`json\n${tabularText}\n\`\`\``,
        },
      ];
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      tools: [registrarInventarioTool],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages,
    });

    if (response.stop_reason === "max_tokens") {
      return {
        error:
          "El documento tiene demasiados productos para procesarlo de una sola vez. Divídelo en partes más pequeñas e inténtalo de nuevo.",
      };
    }

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse) return { error: "No se pudieron extraer productos del documento. Intenta de nuevo." };
    return normalizarRespuesta(toolUse.input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Error al procesar el documento: ${msg}` };
  }
}

export async function bulkCreateProductos(
  items: Omit<ParsedProducto, "valido">[],
  expositorId: string,
  eventoId: string
): Promise<{ creados: number } | { error: string }> {
  if (items.length === 0) return { error: "No hay productos para importar" };

  const supabase = createClient();

  const rows = items.map((p) => ({
    expositor_id: expositorId,
    descripcion: p.descripcion,
    codigo: p.codigo ?? null,
    pvp: p.pvp!,
    cantidad: p.cantidad,
  }));

  const { error } = await supabase.from("productos").insert(rows);
  if (error) return { error: error.message };

  revalidatePath(`/eventos/${eventoId}/inventario`);
  return { creados: rows.length };
}
