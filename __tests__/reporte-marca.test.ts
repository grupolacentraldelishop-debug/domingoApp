import { describe, expect, it } from "bun:test";
import { construirReporteMarca, type VentaReporteInput } from "../lib/reporte-marca";

const gorki = { nombre: "Gorki", tieneIva: true, comisionDominga: 30 };
const tulip = { nombre: "Tulip", tieneIva: false, comisionDominga: 30 };

function venta(over: Partial<VentaReporteInput>): VentaReporteInput {
  return {
    producto_id: "p1",
    codigo: "Gorki08",
    descripcion: "Collar Reloj Sencillo",
    cantidad: 1,
    pvp_unitario: 20,
    pvp: 20,
    margen_marca: 14,
    ...over,
  };
}

describe("construirReporteMarca — ventas", () => {
  it("agrupa varias boletas del mismo producto en una fila", () => {
    const r = construirReporteMarca(gorki, [venta({}), venta({ cantidad: 2, pvp: 40, margen_marca: 28 })], []);
    expect(r.ventas).toHaveLength(1);
    expect(r.ventas[0]).toMatchObject({ cantidad: 3, totalPvp: 60, valorMarca: 42, marca: "Gorki" });
  });

  it("con IVA desglosa base e IVA sin cambiar el valor de la marca", () => {
    const r = construirReporteMarca(gorki, [venta({})], []);
    expect(r.ventas[0]).toMatchObject({ precioBase: 17.39, iva: 2.61, valorMarca: 14 });
    expect(r.totalVentas).toMatchObject({ precioBase: 17.39, iva: 2.61, valorMarca: 14 });
  });

  it("sin IVA no hay desglose", () => {
    const r = construirReporteMarca(tulip, [venta({ codigo: "T1" })], []);
    expect(r.ventas[0]?.precioBase).toBeNull();
    expect(r.ventas[0]?.iva).toBeNull();
    expect(r.totalVentas.iva).toBeNull();
  });

  it("separa filas si el PVP del producto cambió durante el evento", () => {
    const r = construirReporteMarca(gorki, [venta({}), venta({ pvp_unitario: 18, pvp: 18, margen_marca: 12.6 })], []);
    expect(r.ventas).toHaveLength(2);
    expect(r.totalVentas).toMatchObject({ cantidad: 2, totalPvp: 38, valorMarca: 26.6 });
  });

  it("ordena por código de forma natural", () => {
    const r = construirReporteMarca(
      tulip,
      [venta({ producto_id: "a", codigo: "G10" }), venta({ producto_id: "b", codigo: "G2" })],
      []
    );
    expect(r.ventas.map((l) => l.codigo)).toEqual(["G2", "G10"]);
  });
});

describe("construirReporteMarca — inventario sobrante", () => {
  it("lista solo productos con piezas sin vender", () => {
    const r = construirReporteMarca(
      tulip,
      [],
      [
        { codigo: "T1", descripcion: "Taza", cantidad: 8, vendidos: 3 },
        { codigo: "T2", descripcion: "Plato", cantidad: 2, vendidos: 2 },
        { codigo: null, descripcion: "Vaso", cantidad: 4, vendidos: 0 },
      ]
    );
    expect(r.sobrante.map((l) => l.descripcion)).toEqual(["Vaso", "Taza"]);
    expect(r.sobrante[1]).toMatchObject({ recibidas: 8, vendidas: 3, sobrante: 5 });
    expect(r.totalSobrante).toEqual({ recibidas: 12, vendidas: 3, sobrante: 9 });
  });
});
