import { Tables } from "@/lib/supabase/types";
import { formatMoney } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Receipt } from "lucide-react";

type Boleta = Tables<"boletas"> & { profile_nombre: string | null };

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transf.",
};

export function BoletasHistory({ boletas }: { boletas: Boleta[] }) {
  if (boletas.length === 0) {
    return (
      <div className="text-center py-8 text-ink-muted">
        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Aún no hay ventas registradas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {boletas.map((b) => (
        <div key={b.id} className="card text-sm flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">#{b.id.slice(-6).toUpperCase()}</span>
              <span className="text-xs bg-cream-200 px-1.5 py-0.5 rounded text-ink-muted">
                {METODO_LABEL[b.metodo_pago] ?? b.metodo_pago}
              </span>
              {b.pide_factura && (
                <span className="text-xs bg-rose-100 px-1.5 py-0.5 rounded text-rose-700">
                  Factura
                </span>
              )}
            </div>
            <p className="text-xs text-ink-subtle mt-0.5">
              {b.cliente !== "Consumidor final" ? b.cliente : "Consumidor final"} ·{" "}
              {b.profile_nombre ?? "—"}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-semibold">{formatMoney(b.total_pvp)}</p>
            <p className="text-xs text-ink-subtle">{formatDate(b.fecha)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
