import { jsPDF } from "jspdf";
import { autoTable, type CellHookData } from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Views } from "./supabase/types";
import type { ReporteMarca } from "./reporte-marca";
import { formatMoney } from "./utils";

type Liquidacion = Views<"liquidacion_marca">;

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function nombreArchivo(reporte: ReporteMarca, eventoNombre: string, ext: "pdf" | "xlsx"): string {
  return `reporte-${slug(reporte.marca)}-${slug(eventoNombre)}.${ext}`;
}

function resumenLiquidacion(liq: Liquidacion): Array<[string, number]> {
  const filas: Array<[string, number]> = [
    ["Total ventas (PVP)", liq.total_ventas ?? 0],
    [`Comisión Dominga (${liq.comision_dominga ?? 0}%)`, liq.total_margen_dominga ?? 0],
    ["Valor marca", liq.total_margen_marca ?? 0],
  ];
  if ((liq.fee_participacion ?? 0) > 0 && liq.estado !== "pagado") {
    filas.push(["Fee participación", -(liq.fee_participacion ?? 0)]);
  }
  if ((liq.pago_envio ?? 0) > 0) {
    filas.push(["Envío", -(liq.pago_envio ?? 0)]);
  }
  filas.push(["Balance", liq.balance_real ?? 0]);
  filas.push(["A transferir", liq.valor_a_transferir ?? 0]);
  return filas;
}

function encabezadosVentas(tieneIva: boolean): string[] {
  return [
    "Cantidad",
    "Código",
    "Producto",
    "Marca",
    "PVP unitario",
    "Total PVP",
    ...(tieneIva ? ["Base sin IVA", "IVA 15%"] : []),
    "Valor marca",
  ];
}

const ENCABEZADOS_SOBRANTE = ["Código", "Producto", "Marca", "Recibidas", "Vendidas", "Sobrante"];

function etiquetaIva(tieneIva: boolean): string {
  return tieneIva ? "Con IVA 15% (incluido en el PVP)" : "Sin IVA";
}

export function crearExcel(reporte: ReporteMarca, liq: Liquidacion, eventoNombre: string): XLSX.WorkBook {
  const { tieneIva, totalVentas, totalSobrante } = reporte;

  const ventas = [
    encabezadosVentas(tieneIva),
    ...reporte.ventas.map((l) => [
      l.cantidad,
      l.codigo,
      l.descripcion,
      l.marca,
      l.pvpUnitario,
      l.totalPvp,
      ...(tieneIva ? [l.precioBase ?? 0, l.iva ?? 0] : []),
      l.valorMarca,
    ]),
    [
      totalVentas.cantidad,
      "",
      "TOTAL",
      "",
      "",
      totalVentas.totalPvp,
      ...(tieneIva ? [totalVentas.precioBase ?? 0, totalVentas.iva ?? 0] : []),
      totalVentas.valorMarca,
    ],
  ];

  const sobrante = [
    ENCABEZADOS_SOBRANTE,
    ...reporte.sobrante.map((l) => [l.codigo, l.descripcion, l.marca, l.recibidas, l.vendidas, l.sobrante]),
    ["", "TOTAL", "", totalSobrante.recibidas, totalSobrante.vendidas, totalSobrante.sobrante],
  ];

  const resumen = [
    ["Marca", reporte.marca],
    ["Evento", eventoNombre],
    ["IVA", etiquetaIva(tieneIva)],
    [],
    ...resumenLiquidacion(liq),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), "Resumen");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ventas), "Ventas");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sobrante), "Inventario sobrante");
  return wb;
}

// rose-600 y cream-100 de tailwind.config, en RGB para jsPDF
const ROSE: [number, number, number] = [166, 68, 97];
const CREAM: [number, number, number] = [250, 242, 232];

export function crearPdf(reporte: ReporteMarca, liq: Liquidacion, eventoNombre: string): jsPDF {
  const { tieneIva, totalVentas, totalSobrante } = reporte;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  let y = margin;
  // autoTable no devuelve la posición final; se captura en cada página dibujada
  const seguirDesde = (data: { cursor: { y: number } | null }) => {
    y = data.cursor?.y ?? y;
  };

  doc.setFont("helvetica", "bold").setFontSize(18).text(reporte.marca, margin, y + 10);
  y += 30;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(90);
  doc.text(eventoNombre, margin, y);
  y += 14;
  doc.text(`${etiquetaIva(tieneIva)} · Generado el ${new Date().toLocaleDateString("es-EC")}`, margin, y);
  doc.setTextColor(0);
  y += 16;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: 260,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3 },
    body: resumenLiquidacion(liq).map(([label, valor]) => [label, formatMoney(valor)]),
    columnStyles: { 1: { halign: "right" } },
    didParseCell: (data) => {
      if (data.row.index === data.table.body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = CREAM;
      }
    },
    didDrawPage: seguirDesde,
  });

  // columnStyles solo aplica al cuerpo; así encabezado y totales quedan alineados con los números
  const alinearDerecha = (columnas: number[]) => (data: CellHookData) => {
    if (columnas.includes(data.column.index)) data.cell.styles.halign = "right";
  };
  const estiloTabla = {
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: ROSE, textColor: 255 },
    footStyles: { fillColor: CREAM, textColor: 0, fontStyle: "bold" as const },
    showFoot: "lastPage" as const,
    didDrawPage: seguirDesde,
  };

  y += 24;
  doc.setFont("helvetica", "bold").setFontSize(13).text("Ventas", margin, y);
  y += 8;
  if (reporte.ventas.length === 0) {
    doc.setFont("helvetica", "normal").setFontSize(9).text("Sin ventas registradas.", margin, y + 12);
    y += 12;
  } else {
    autoTable(doc, {
      ...estiloTabla,
      startY: y,
      head: [encabezadosVentas(tieneIva)],
      body: reporte.ventas.map((l) => [
        String(l.cantidad),
        l.codigo,
        l.descripcion,
        l.marca,
        formatMoney(l.pvpUnitario),
        formatMoney(l.totalPvp),
        ...(tieneIva ? [formatMoney(l.precioBase), formatMoney(l.iva)] : []),
        formatMoney(l.valorMarca),
      ]),
      foot: [
        [
          String(totalVentas.cantidad),
          "",
          "Total",
          "",
          "",
          formatMoney(totalVentas.totalPvp),
          ...(tieneIva ? [formatMoney(totalVentas.precioBase), formatMoney(totalVentas.iva)] : []),
          formatMoney(totalVentas.valorMarca),
        ],
      ],
      didParseCell: alinearDerecha(tieneIva ? [4, 5, 6, 7, 8] : [4, 5, 6]),
    });
  }

  y += 24;
  doc.setFont("helvetica", "bold").setFontSize(13).text("Inventario sobrante", margin, y);
  y += 8;
  if (reporte.sobrante.length === 0) {
    doc.setFont("helvetica", "normal").setFontSize(9).text("Todas las piezas se vendieron.", margin, y + 12);
  } else {
    autoTable(doc, {
      ...estiloTabla,
      startY: y,
      head: [ENCABEZADOS_SOBRANTE],
      body: reporte.sobrante.map((l) => [
        l.codigo,
        l.descripcion,
        l.marca,
        String(l.recibidas),
        String(l.vendidas),
        String(l.sobrante),
      ]),
      foot: [
        [
          "",
          "Total",
          "",
          String(totalSobrante.recibidas),
          String(totalSobrante.vendidas),
          String(totalSobrante.sobrante),
        ],
      ],
      didParseCell: alinearDerecha([3, 4, 5]),
    });
  }

  return doc;
}
