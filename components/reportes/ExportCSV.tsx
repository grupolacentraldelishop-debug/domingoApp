"use client";

import { Download } from "lucide-react";
import { Views } from "@/lib/supabase/types";

type FacturacionRow = Views<"ventas_con_datos_facturacion">;

interface Props {
  rows: FacturacionRow[];
}

export function ExportCSV({ rows }: Props) {
  function download() {
    const headers = [
      "Boleta ID",
      "Fecha",
      "Identificación",
      "Razón Social",
      "Email",
      "Dirección",
      "Teléfono",
      "Método Pago",
      "Total PVP",
      "Items",
    ];

    const lines = rows.map((r) => {
      const items =
        Array.isArray(r.items)
          ? (r.items as Array<{ descripcion?: string; cantidad?: number; pvp?: number }>)
              .map((i) => `${i.cantidad}x ${i.descripcion} $${i.pvp}`)
              .join(" | ")
          : "";
      return [
        r.boleta_id ?? "",
        r.fecha ?? "",
        r.cliente_identificacion ?? "",
        r.cliente_razon_social ?? "",
        r.cliente_email ?? "",
        r.cliente_direccion ?? "",
        r.cliente_telefono ?? "",
        r.metodo_pago ?? "",
        String(r.total_pvp ?? 0),
        items,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventas-facturacion-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button onClick={download} className="btn-secondary">
      <Download size={15} />
      Exportar CSV ({rows.length} {rows.length === 1 ? "boleta" : "boletas"})
    </button>
  );
}
