"use client";

import { useState } from "react";
import { Pencil, Trash2, Package } from "lucide-react";
import { Tables } from "@/lib/supabase/types";
import { formatMoney, cn } from "@/lib/utils";
import { deleteExpositor } from "@/app/actions/expositores";

interface Props {
  expositor: Tables<"expositores">;
  productoCount: number;
  eventoId: string;
  onEdit: () => void;
}

const estadoBadge = {
  pendiente: { label: "Pendiente", className: "bg-cream-200 text-ink-muted" },
  confirmado: { label: "Confirmada", className: "bg-rose-100 text-rose-700" },
  pagado: { label: "Fee pagado", className: "bg-emerald-50 text-emerald-700" },
} satisfies Record<string, { label: string; className: string }>;

export function ExpositorCard({ expositor, productoCount, eventoId, onEdit }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const badge =
    (estadoBadge as Record<string, { label: string; className: string }>)[expositor.estado] ??
    estadoBadge.pendiente;

  async function handleDelete() {
    setDeleteError(null);
    if (
      !confirm(
        `¿Eliminar la marca "${expositor.nombre}"? Se eliminarán también todos sus productos. Esta acción no se puede deshacer.`
      )
    )
      return;

    setDeleting(true);
    const result = await deleteExpositor(expositor.id, eventoId);
    setDeleting(false);

    if ("error" in result) {
      setDeleteError(result.error ?? "Error inesperado");
    }
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{expositor.nombre}</h3>
          <span
            className={cn(
              "inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium",
              badge.className
            )}
          >
            {badge.label}
          </span>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="btn-secondary h-8 px-2"
            title="Editar marca"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn h-8 px-2 bg-white border-hairline text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            title="Eliminar marca"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-2 text-sm">
        <div>
          <p className="text-xs text-ink-subtle">Comisión Dominga</p>
          <p className="font-medium">{expositor.comision_dominga}%</p>
        </div>
        <div>
          <p className="text-xs text-ink-subtle">IVA</p>
          <p className="font-medium">{expositor.tiene_iva ? "Con IVA 15%" : "Sin IVA"}</p>
        </div>
        {expositor.fee_participacion > 0 && (
          <div>
            <p className="text-xs text-ink-subtle">Fee participación</p>
            <p className="font-medium">{formatMoney(expositor.fee_participacion)}</p>
          </div>
        )}
        {expositor.pago_envio > 0 && (
          <div>
            <p className="text-xs text-ink-subtle">Envío</p>
            <p className="font-medium">{formatMoney(expositor.pago_envio)}</p>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-line flex items-center gap-1.5 text-sm text-ink-muted">
        <Package size={14} />
        <span>
          {productoCount} {productoCount === 1 ? "producto" : "productos"}
        </span>
      </div>

      {expositor.notas && (
        <p className="text-xs text-ink-subtle italic leading-relaxed">{expositor.notas}</p>
      )}

      {deleteError && (
        <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded">{deleteError}</p>
      )}
    </div>
  );
}
