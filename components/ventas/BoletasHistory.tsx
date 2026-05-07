"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import { Tables } from "@/lib/supabase/types";
import { formatMoney, formatDate, cn } from "@/lib/utils";
import { BoletaDetalleModal } from "./BoletaDetalleModal";

type Venta = Pick<
  Tables<"ventas">,
  "id" | "descripcion" | "cantidad" | "pvp_unitario" | "pvp" | "margen_marca" | "margen_dominga" | "expositor_id"
>;

type Boleta = Tables<"boletas"> & {
  profile_nombre: string | null;
  ventas: Venta[];
};

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transf.",
};

interface Props {
  boletas: Boleta[];
  expositorMap: Map<string, string>;
  eventoId: string;
}

export function BoletasHistory({ boletas, expositorMap, eventoId }: Props) {
  const [selected, setSelected] = useState<Boleta | null>(null);

  if (boletas.length === 0) {
    return (
      <div className="text-center py-8 text-ink-muted">
        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Aún no hay ventas registradas.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {boletas.map((b) => {
          const anulada = b.estado === "anulada";
          return (
            <button
              key={b.id}
              onClick={() => setSelected(b)}
              className={cn(
                "card text-sm flex items-center justify-between gap-3 w-full text-left transition-colors hover:bg-cream-50",
                anulada && "opacity-50"
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium", anulada && "line-through text-ink-muted")}>
                    #{b.id.slice(-6).toUpperCase()}
                  </span>
                  <span className="text-xs bg-cream-200 px-1.5 py-0.5 rounded text-ink-muted">
                    {METODO_LABEL[b.metodo_pago] ?? b.metodo_pago}
                  </span>
                  {b.pide_factura && (
                    <span className="text-xs bg-rose-100 px-1.5 py-0.5 rounded text-rose-700">
                      Factura
                    </span>
                  )}
                  {anulada && (
                    <span className="text-xs bg-red-100 px-1.5 py-0.5 rounded text-red-600">
                      Anulada
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-subtle mt-0.5">
                  {b.cliente !== "Consumidor final" ? b.cliente : "Consumidor final"} ·{" "}
                  {b.profile_nombre ?? "—"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={cn("font-semibold", anulada && "line-through text-ink-muted")}>
                  {formatMoney(b.total_pvp)}
                </p>
                <p className="text-xs text-ink-subtle">{formatDate(b.fecha)}</p>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <BoletaDetalleModal
          boleta={selected}
          eventoId={eventoId}
          expositorNombre={(id) => expositorMap.get(id) ?? "Marca"}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
