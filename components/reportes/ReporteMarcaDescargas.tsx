"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Views } from "@/lib/supabase/types";
import type { ReporteMarca } from "@/lib/reporte-marca";

type Liquidacion = Views<"liquidacion_marca">;

interface Props {
  reporte: ReporteMarca;
  liq: Liquidacion;
  eventoNombre: string;
}

export function ReporteMarcaDescargas({ reporte, liq, eventoNombre }: Props) {
  const [generando, setGenerando] = useState<"pdf" | "excel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generar(tipo: "pdf" | "excel") {
    setGenerando(tipo);
    setError(null);
    try {
      // Import dinámico: jsPDF y xlsx solo se descargan al pedir un archivo
      const [archivos, XLSX] = await Promise.all([
        import("@/lib/reporte-marca-archivos"),
        import("xlsx"),
      ]);
      if (tipo === "pdf") {
        archivos.crearPdf(reporte, liq, eventoNombre).save(archivos.nombreArchivo(reporte, eventoNombre, "pdf"));
      } else {
        XLSX.writeFile(
          archivos.crearExcel(reporte, liq, eventoNombre),
          archivos.nombreArchivo(reporte, eventoNombre, "xlsx")
        );
      }
    } catch {
      setError("No se pudo generar el archivo. Intenta de nuevo.");
    } finally {
      setGenerando(null);
    }
  }

  return (
    <div className="pt-2 border-t border-line space-y-2">
      <p className="text-xs text-ink-subtle">
        {reporte.totalVentas.cantidad} piezas vendidas · {reporte.totalSobrante.sobrante} sobrantes por
        devolver
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => generar("pdf")}
          disabled={generando !== null}
          className="btn-secondary flex-1"
        >
          <FileText size={15} />
          {generando === "pdf" ? "Generando…" : "PDF"}
        </button>
        <button
          onClick={() => generar("excel")}
          disabled={generando !== null}
          className="btn-secondary flex-1"
        >
          <FileSpreadsheet size={15} />
          {generando === "excel" ? "Generando…" : "Excel"}
        </button>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
