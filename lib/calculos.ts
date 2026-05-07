export interface MargenesMuestra {
  precioBase: number;
  ivaUnitario: number;
  margenMarca: number;
  margenDominga: number;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcularMargenes(
  pvp: number,
  comisionDominga: number,
  tieneIva: boolean
): MargenesMuestra {
  const factorDominga = comisionDominga / 100;
  const factorMarca = 1 - factorDominga;

  if (tieneIva) {
    const precioBase = r2(pvp / 1.15);
    const ivaUnitario = r2(pvp - precioBase);
    return {
      precioBase,
      ivaUnitario,
      margenMarca: r2(pvp * factorMarca),
      margenDominga: r2(pvp * factorDominga),
    };
  }

  return {
    precioBase: pvp,
    ivaUnitario: 0,
    margenMarca: r2(pvp * factorMarca),
    margenDominga: r2(pvp * factorDominga),
  };
}

export function liquidarMarca(params: {
  totalVentasPvp: number;
  totalMargenMarca: number;
  totalMargenDominga: number;
  feeParticipacion: number;
  pagoEnvio: number;
  comisionDominga: number;
}): {
  valorATransferir: number;
  balanceReal: number;
} {
  const deducciones = params.feeParticipacion + params.pagoEnvio;
  const bruto = params.totalMargenMarca;
  const balanceReal = r2(bruto - deducciones);
  const valorATransferir = Math.max(0, balanceReal);
  return { valorATransferir, balanceReal };
}
