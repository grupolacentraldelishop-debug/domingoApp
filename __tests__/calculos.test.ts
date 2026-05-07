import { describe, expect, it } from "bun:test";
import { calcularMargenes, liquidarMarca } from "../lib/calculos";

// Helper: round to 2 decimals for assertions
const r2 = (n: number) => Math.round(n * 100) / 100;

describe("calcularMargenes", () => {
  // === Ejemplo canónico del prompt maestro ===
  it("PVP $115, comisión 30%, con IVA → margen_marca=$80.50, margen_dominga=$34.50", () => {
    const m = calcularMargenes(115, 30, true);
    expect(m.margenMarca).toBe(80.5);
    expect(m.margenDominga).toBe(34.5);
    expect(m.precioBase).toBe(100); // 115/1.15
    expect(m.ivaUnitario).toBe(15); // 115-100
  });

  it("PVP $115, comisión 30%, sin IVA → margen_marca=$80.50, margen_dominga=$34.50", () => {
    const m = calcularMargenes(115, 30, false);
    expect(m.margenMarca).toBe(80.5);
    expect(m.margenDominga).toBe(34.5);
    expect(m.precioBase).toBe(115);
    expect(m.ivaUnitario).toBe(0);
  });

  // === Comisión 0% ===
  it("comisión 0% → todo el margen es de la marca", () => {
    const m = calcularMargenes(100, 0, false);
    expect(m.margenMarca).toBe(100);
    expect(m.margenDominga).toBe(0);
  });

  it("comisión 0%, con IVA", () => {
    const m = calcularMargenes(115, 0, true);
    expect(m.margenMarca).toBe(115);
    expect(m.margenDominga).toBe(0);
    expect(m.precioBase).toBe(100);
    expect(m.ivaUnitario).toBe(15);
  });

  // === Comisión 100% ===
  it("comisión 100% → todo el margen es de Dominga", () => {
    const m = calcularMargenes(100, 100, false);
    expect(m.margenMarca).toBe(0);
    expect(m.margenDominga).toBe(100);
  });

  // === PVP mínimo ===
  it("PVP $0.01, comisión 30%, sin IVA", () => {
    const m = calcularMargenes(0.01, 30, false);
    expect(m.margenDominga).toBe(r2(0.01 * 0.3));
    expect(m.margenMarca).toBe(r2(0.01 * 0.7));
    expect(m.margenDominga + m.margenMarca).toBeLessThanOrEqual(0.01 + 0.01); // rounding tolerance
  });

  // === Con IVA: verifica precio_base y redondeo ===
  it("PVP $46, comisión 30%, con IVA", () => {
    const m = calcularMargenes(46, 30, true);
    expect(m.precioBase).toBe(r2(46 / 1.15)); // 40.00
    expect(m.ivaUnitario).toBe(r2(46 - m.precioBase));
    expect(m.margenDominga).toBe(r2(46 * 0.3)); // 13.80
    expect(m.margenMarca).toBe(r2(46 * 0.7)); // 32.20
  });

  // === Comisión no entera ===
  it("comisión 33.33%, sin IVA → suma de márgenes = PVP", () => {
    const pvp = 50;
    const m = calcularMargenes(pvp, 33.33, false);
    // Due to rounding, sum might differ by at most $0.02
    expect(Math.abs(m.margenMarca + m.margenDominga - pvp)).toBeLessThanOrEqual(0.02);
  });

  // === IVA unitario consistency ===
  it("precio_base + iva_unitario = pvp (con IVA)", () => {
    const pvp = 230;
    const m = calcularMargenes(pvp, 25, true);
    expect(r2(m.precioBase + m.ivaUnitario)).toBe(pvp);
  });

  // === Los márgenes cubren el PVP completo (con IVA) ===
  it("margen_marca + margen_dominga ≈ pvp (con IVA)", () => {
    const pvp = 115;
    const m = calcularMargenes(pvp, 30, true);
    expect(Math.abs(m.margenMarca + m.margenDominga - pvp)).toBeLessThanOrEqual(0.01);
  });
});

describe("liquidarMarca", () => {
  it("marca con ventas y fee, balance positivo", () => {
    const result = liquidarMarca({
      totalVentasPvp: 500,
      totalMargenMarca: 350,
      totalMargenDominga: 150,
      feeParticipacion: 50,
      pagoEnvio: 20,
      comisionDominga: 30,
      feePagado: false,
    });
    expect(result.balanceReal).toBe(280); // 350 - 50 - 20
    expect(result.valorATransferir).toBe(280);
  });

  it("balance negativo → valorATransferir = $0.00, balanceReal negativo", () => {
    const result = liquidarMarca({
      totalVentasPvp: 50,
      totalMargenMarca: 35,
      totalMargenDominga: 15,
      feeParticipacion: 50,
      pagoEnvio: 10,
      comisionDominga: 30,
      feePagado: false,
    });
    expect(result.balanceReal).toBe(-25); // 35 - 50 - 10
    expect(result.valorATransferir).toBe(0); // capped at 0
  });

  it("sin ventas, sin fee → todo cero", () => {
    const result = liquidarMarca({
      totalVentasPvp: 0,
      totalMargenMarca: 0,
      totalMargenDominga: 0,
      feeParticipacion: 0,
      pagoEnvio: 0,
      comisionDominga: 30,
      feePagado: false,
    });
    expect(result.balanceReal).toBe(0);
    expect(result.valorATransferir).toBe(0);
  });

  it("fee > margen → balance negativo", () => {
    const result = liquidarMarca({
      totalVentasPvp: 100,
      totalMargenMarca: 70,
      totalMargenDominga: 30,
      feeParticipacion: 100,
      pagoEnvio: 0,
      comisionDominga: 30,
      feePagado: false,
    });
    expect(result.balanceReal).toBe(-30); // 70 - 100
    expect(result.valorATransferir).toBe(0);
  });

  it("sin fee ni envío → valorATransferir = totalMargenMarca", () => {
    const result = liquidarMarca({
      totalVentasPvp: 1000,
      totalMargenMarca: 700,
      totalMargenDominga: 300,
      feeParticipacion: 0,
      pagoEnvio: 0,
      comisionDominga: 30,
      feePagado: false,
    });
    expect(result.valorATransferir).toBe(700);
    expect(result.balanceReal).toBe(700);
  });

  it("fee pagado → no se resta del balance", () => {
    const result = liquidarMarca({
      totalVentasPvp: 500,
      totalMargenMarca: 350,
      totalMargenDominga: 150,
      feeParticipacion: 50,
      pagoEnvio: 20,
      comisionDominga: 30,
      feePagado: true,
    });
    expect(result.balanceReal).toBe(330); // 350 - 0 - 20
    expect(result.valorATransferir).toBe(330);
  });
});
