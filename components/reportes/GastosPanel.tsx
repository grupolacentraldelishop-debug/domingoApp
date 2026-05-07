"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Tables } from "@/lib/supabase/types";
import { formatMoney, cn } from "@/lib/utils";
import { createGasto, deleteGasto } from "@/app/actions/gastos";

const schema = z.object({
  concepto: z.string().min(1, "Requerido"),
  monto: z.number({ invalid_type_error: "Número requerido" }).positive(),
  fecha: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  eventoId: string;
  gastos: Tables<"gastos">[];
}

export function GastosPanel({ eventoId, gastos }: Props) {
  const [adding, setAdding] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      concepto: "",
      monto: 0,
      fecha: new Date().toISOString().slice(0, 10),
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await createGasto(eventoId, values);
    if ("error" in result) {
      setServerError(result.error ?? "Error");
    } else {
      reset();
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    await deleteGasto(id, eventoId);
  }

  const total = gastos.reduce((acc, g) => acc + g.monto, 0);

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Gastos del evento</h3>
        <span className="text-sm font-semibold text-rose-700">{formatMoney(total)}</span>
      </div>

      {gastos.length === 0 && !adding && (
        <p className="text-sm text-ink-muted">Sin gastos registrados.</p>
      )}

      {gastos.map((g) => (
        <div key={g.id} className="flex items-center justify-between text-sm gap-2">
          <div className="min-w-0">
            <p className="truncate">{g.concepto}</p>
            <p className="text-xs text-ink-subtle">{g.fecha}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-medium">{formatMoney(g.monto)}</span>
            <button
              onClick={() => handleDelete(g.id)}
              className="text-ink-subtle hover:text-rose-500"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 pt-1 border-t border-line">
          <input
            {...register("concepto")}
            className={cn("input", errors.concepto && "ring-2 ring-rose-400")}
            placeholder="Concepto del gasto"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              {...register("monto", { valueAsNumber: true })}
              className={cn("input", errors.monto && "ring-2 ring-rose-400")}
              placeholder="Monto $"
            />
            <input
              type="date"
              {...register("fecha")}
              className="input"
            />
          </div>
          {serverError && (
            <p className="text-xs text-rose-600">{serverError}</p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? "Guardando…" : "Agregar"}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); reset(); }}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="btn-secondary w-full"
        >
          <Plus size={15} /> Agregar gasto
        </button>
      )}
    </div>
  );
}
