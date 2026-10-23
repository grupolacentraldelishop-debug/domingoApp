"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { ReporteMarca } from "@/lib/reporte-marca";
import { formatMoney, cn } from "@/lib/utils";

interface Props {
  reporte: ReporteMarca;
  onClose: () => void;
}

export function VentasMarcaModal({ reporte, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { tieneIva, ventas, totalVentas } = reporte;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleBackdrop(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  const th = "px-3 py-2 font-medium whitespace-nowrap";
  const td = "px-3 py-2 whitespace-nowrap";
  const num = "text-right tabular-nums";

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdrop}
      // Escape cierra el <dialog> nativo; se sincroniza el estado del padre
      onClose={onClose}
      className="backdrop:bg-black/40 backdrop:backdrop-blur-sm bg-transparent p-0 max-w-3xl w-[calc(100%-2rem)] mx-auto rounded-2xl shadow-xl"
    >
      <div className="bg-white rounded-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-2 px-5 py-4 border-b border-line">
          <div>
            <h3 className="font-semibold text-base">Ventas · {reporte.marca}</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              {totalVentas.cantidad} {totalVentas.cantidad === 1 ? "pieza vendida" : "piezas vendidas"} ·{" "}
              {tieneIva ? "Con IVA 15% (incluido en el PVP)" : "Sin IVA"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cream-100 text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* En celular la tabla obligaría a desplazarse en horizontal para ver el valor marca */}
        <div className="sm:hidden max-h-[70vh] overflow-y-auto text-sm">
          {ventas.map((l) => (
            <div key={`${l.codigo}|${l.descripcion}|${l.pvpUnitario}`} className="px-5 py-3 border-b border-line">
              <div className="flex justify-between gap-3">
                <span className="font-medium">{l.descripcion}</span>
                <span className="font-medium tabular-nums shrink-0">{formatMoney(l.valorMarca)}</span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                {l.codigo && `${l.codigo} · `}
                {l.cantidad} × {formatMoney(l.pvpUnitario)} = {formatMoney(l.totalPvp)}
                {tieneIva && ` · Base ${formatMoney(l.precioBase)} · IVA ${formatMoney(l.iva)}`}
              </p>
            </div>
          ))}
          <div className="px-5 py-3 bg-cream-100 space-y-1 tabular-nums">
            <div className="flex justify-between">
              <span className="text-ink-muted">Total PVP ({totalVentas.cantidad} piezas)</span>
              <span>{formatMoney(totalVentas.totalPvp)}</span>
            </div>
            {tieneIva && (
              <>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Base sin IVA</span>
                  <span>{formatMoney(totalVentas.precioBase)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">IVA 15%</span>
                  <span>{formatMoney(totalVentas.iva)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-semibold">
              <span>Valor marca</span>
              <span>{formatMoney(totalVentas.valorMarca)}</span>
            </div>
          </div>
        </div>

        <div className="hidden sm:block max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-100 text-left text-xs text-ink-muted sticky top-0">
              <tr>
                <th className={cn(th, num)}>Cant.</th>
                <th className={th}>Código</th>
                <th className={th}>Producto</th>
                <th className={cn(th, num)}>PVP unit.</th>
                <th className={cn(th, num)}>Total PVP</th>
                {tieneIva && (
                  <>
                    <th className={cn(th, num)}>Base sin IVA</th>
                    <th className={cn(th, num)}>IVA 15%</th>
                  </>
                )}
                <th className={cn(th, num)}>Valor marca</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((l) => (
                <tr key={`${l.codigo}|${l.descripcion}|${l.pvpUnitario}`} className="border-t border-line">
                  <td className={cn(td, num)}>{l.cantidad}</td>
                  <td className={cn(td, "text-ink-muted")}>{l.codigo}</td>
                  <td className={cn(td, "whitespace-normal min-w-[10rem]")}>{l.descripcion}</td>
                  <td className={cn(td, num)}>{formatMoney(l.pvpUnitario)}</td>
                  <td className={cn(td, num)}>{formatMoney(l.totalPvp)}</td>
                  {tieneIva && (
                    <>
                      <td className={cn(td, num)}>{formatMoney(l.precioBase)}</td>
                      <td className={cn(td, num)}>{formatMoney(l.iva)}</td>
                    </>
                  )}
                  <td className={cn(td, num, "font-medium")}>{formatMoney(l.valorMarca)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-cream-100 font-semibold">
              <tr className="border-t border-line">
                <td className={cn(td, num)}>{totalVentas.cantidad}</td>
                <td className={td} colSpan={2}>
                  Total
                </td>
                <td className={td} />
                <td className={cn(td, num)}>{formatMoney(totalVentas.totalPvp)}</td>
                {tieneIva && (
                  <>
                    <td className={cn(td, num)}>{formatMoney(totalVentas.precioBase)}</td>
                    <td className={cn(td, num)}>{formatMoney(totalVentas.iva)}</td>
                  </>
                )}
                <td className={cn(td, num)}>{formatMoney(totalVentas.valorMarca)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </dialog>
  );
}
