"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { Update } from "@/lib/supabase/types";

const ProductoSchema = z.object({
  descripcion: z.string().min(1, "La descripción es requerida").max(200),
  codigo: z.string().max(50).optional().nullable(),
  pvp: z.number().positive("El PVP debe ser mayor a 0"),
  cantidad: z.number().int().min(0),
});

export type ProductoFormValues = z.infer<typeof ProductoSchema>;

function revalidateInventario(eventoId: string) {
  revalidatePath(`/eventos/${eventoId}/inventario`);
}

export async function createProducto(
  expositorId: string,
  eventoId: string,
  values: ProductoFormValues
) {
  const supabase = createClient();
  const parsed = ProductoSchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const { error } = await supabase.from("productos").insert({
    ...parsed.data,
    expositor_id: expositorId,
  });

  if (error) return { error: error.message };
  revalidateInventario(eventoId);
  return { success: true };
}

export async function updateProductoField(
  productoId: string,
  eventoId: string,
  field: "descripcion" | "codigo" | "pvp" | "cantidad",
  rawValue: string
) {
  const supabase = createClient();
  let updateData: Update<"productos">;

  if (field === "pvp") {
    const n = parseFloat(rawValue);
    if (isNaN(n) || n <= 0) return { error: "PVP inválido" };
    updateData = { pvp: n };
  } else if (field === "cantidad") {
    const n = parseInt(rawValue, 10);
    if (isNaN(n) || n < 0) return { error: "Cantidad inválida" };
    updateData = { cantidad: n };
  } else if (field === "descripcion") {
    updateData = { descripcion: rawValue.trim() };
  } else {
    updateData = { codigo: rawValue.trim() || null };
  }

  const { error } = await supabase
    .from("productos")
    .update(updateData)
    .eq("id", productoId);

  if (error) return { error: error.message };
  revalidateInventario(eventoId);
  return { success: true };
}

export async function deleteProducto(productoId: string, eventoId: string) {
  const supabase = createClient();

  const { count } = await supabase
    .from("ventas")
    .select("id", { count: "exact", head: true })
    .eq("producto_id", productoId);

  if (count && count > 0) {
    return {
      error: `Este producto tiene ${count} ${count === 1 ? "venta registrada" : "ventas registradas"} y no puede eliminarse.`,
    };
  }

  const { error } = await supabase.from("productos").delete().eq("id", productoId);
  if (error) return { error: error.message };
  revalidateInventario(eventoId);
  return { success: true };
}
