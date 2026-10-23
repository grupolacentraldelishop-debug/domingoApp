import { calcularMargenes } from "./calculos";

export interface MarcaReporteInput {
  nombre: string;
  tieneIva: boolean;
  comisionDominga: number;
}

export interface VentaReporteInput {
  producto_id: string;
  codigo: string | null;
  descripcion: string;
  cantidad: number;
  pvp_unitario: number;
  pvp: number;
  margen_marca: number;
}

export interface ProductoReporteInput {
  codigo: string | null;
  descripcion: string;
  cantidad: number;
  vendidos: number;
}

export interface LineaVenta {
  codigo: string;
  descripcion: string;
  marca: string;
  cantidad: number;
  pvpUnitario: number;
  totalPvp: number;
  // null cuando la marca no tiene IVA
  precioBase: number | null;
  iva: number | null;
  valorMarca: number;
}

export interface LineaSobrante {
  codigo: string;
  descripcion: string;
  marca: string;
  recibidas: number;
  vendidas: number;
  sobrante: number;
}

export interface ReporteMarca {
  marca: string;
  tieneIva: boolean;
  ventas: LineaVenta[];
  totalVentas: {
    cantidad: number;
    totalPvp: number;
    precioBase: number | null;
    iva: number | null;
    valorMarca: number;
  };
  sobrante: LineaSobrante[];
  totalSobrante: {
    recibidas: number;
    vendidas: number;
    sobrante: number;
  };
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function porCodigo(a: { codigo: string; descripcion: string }, b: { codigo: string; descripcion: string }) {
  return (
    a.codigo.localeCompare(b.codigo, "es", { numeric: true }) ||
    a.descripcion.localeCompare(b.descripcion, "es")
  );
}

// Las ventas deben venir ya filtradas: solo de esta marca y de boletas no anuladas.
export function construirReporteMarca(
  marca: MarcaReporteInput,
  ventas: VentaReporteInput[],
  productos: ProductoReporteInput[]
): ReporteMarca {
  // Se agrupa por producto y precio: si el PVP cambió durante el evento, cada precio queda en su fila.
  const grupos = new Map<string, LineaVenta>();
  for (const v of ventas) {
    const key = `${v.producto_id}|${v.pvp_unitario}`;
    const linea = grupos.get(key) ?? {
      codigo: v.codigo ?? "",
      descripcion: v.descripcion,
      marca: marca.nombre,
      cantidad: 0,
      pvpUnitario: v.pvp_unitario,
      totalPvp: 0,
      precioBase: null,
      iva: null,
      valorMarca: 0,
    };
    linea.cantidad += v.cantidad;
    linea.totalPvp = r2(linea.totalPvp + v.pvp);
    linea.valorMarca = r2(linea.valorMarca + v.margen_marca);
    grupos.set(key, linea);
  }

  const lineasVenta = Array.from(grupos.values()).map((l) => {
    if (!marca.tieneIva) return l;
    // Mismo desglose unitario que el trigger de productos, multiplicado por la cantidad
    const { precioBase } = calcularMargenes(l.pvpUnitario, marca.comisionDominga, true);
    const base = r2(precioBase * l.cantidad);
    return { ...l, precioBase: base, iva: r2(l.totalPvp - base) };
  });
  lineasVenta.sort(porCodigo);

  const lineasSobrante: LineaSobrante[] = productos
    .filter((p) => p.cantidad - p.vendidos > 0)
    .map((p) => ({
      codigo: p.codigo ?? "",
      descripcion: p.descripcion,
      marca: marca.nombre,
      recibidas: p.cantidad,
      vendidas: p.vendidos,
      sobrante: p.cantidad - p.vendidos,
    }))
    .sort(porCodigo);

  const sum = <T>(rows: T[], f: (r: T) => number) => r2(rows.reduce((acc, r) => acc + f(r), 0));

  return {
    marca: marca.nombre,
    tieneIva: marca.tieneIva,
    ventas: lineasVenta,
    totalVentas: {
      cantidad: sum(lineasVenta, (l) => l.cantidad),
      totalPvp: sum(lineasVenta, (l) => l.totalPvp),
      precioBase: marca.tieneIva ? sum(lineasVenta, (l) => l.precioBase ?? 0) : null,
      iva: marca.tieneIva ? sum(lineasVenta, (l) => l.iva ?? 0) : null,
      valorMarca: sum(lineasVenta, (l) => l.valorMarca),
    },
    sobrante: lineasSobrante,
    totalSobrante: {
      recibidas: sum(lineasSobrante, (l) => l.recibidas),
      vendidas: sum(lineasSobrante, (l) => l.vendidas),
      sobrante: sum(lineasSobrante, (l) => l.sobrante),
    },
  };
}
