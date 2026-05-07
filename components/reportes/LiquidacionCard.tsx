import { Views } from "@/lib/supabase/types";
import { formatMoney, cn } from "@/lib/utils";

type Liquidacion = Views<"liquidacion_marca">;

export function LiquidacionCard({ liq }: { liq: Liquidacion }) {
  const negativo = (liq.valor_a_transferir ?? 0) <= 0 && (liq.balance_real ?? 0) < 0;

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{liq.nombre}</h3>
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              liq.tiene_iva ? "bg-rose-100 text-rose-700" : "bg-cream-200 text-ink-muted"
            )}
          >
            {liq.tiene_iva ? "Con IVA 15%" : "Sin IVA"} · {liq.comision_dominga}% comisión
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-subtle">A transferir</p>
          <p className={cn("text-lg font-bold", negativo ? "text-rose-600" : "text-emerald-700")}>
            {formatMoney(liq.valor_a_transferir ?? 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-1.5 text-sm">
        <div className="flex justify-between col-span-2 py-1 border-t border-line">
          <span className="text-ink-muted">Total ventas (PVP)</span>
          <span className="font-medium">{formatMoney(liq.total_ventas)}</span>
        </div>
        <div className="flex justify-between col-span-2">
          <span className="text-ink-muted">Margen marca</span>
          <span>{formatMoney(liq.total_margen_marca)}</span>
        </div>
        <div className="flex justify-between col-span-2">
          <span className="text-ink-muted">Margen Dominga ({liq.comision_dominga}%)</span>
          <span className="text-rose-700">{formatMoney(liq.total_margen_dominga)}</span>
        </div>
        {(liq.fee_participacion ?? 0) > 0 && (
          <div className="flex justify-between col-span-2">
            <span className="text-ink-muted">Fee participación</span>
            <span className="text-rose-600">−{formatMoney(liq.fee_participacion)}</span>
          </div>
        )}
        {(liq.pago_envio ?? 0) > 0 && (
          <div className="flex justify-between col-span-2">
            <span className="text-ink-muted">Envío</span>
            <span className="text-rose-600">−{formatMoney(liq.pago_envio)}</span>
          </div>
        )}
        <div className="flex justify-between col-span-2 pt-1 border-t border-line font-semibold">
          <span>Balance real</span>
          <span className={cn(negativo && "text-rose-600")}>
            {formatMoney(liq.balance_real)}
          </span>
        </div>
      </div>

      {negativo && (
        <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded">
          El balance es negativo: fee y/o envío superan el margen. Se transfiere $0.00 y el saldo
          queda pendiente.
        </p>
      )}
    </div>
  );
}
