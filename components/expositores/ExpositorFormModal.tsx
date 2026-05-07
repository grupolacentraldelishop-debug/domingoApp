"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { Tables } from "@/lib/supabase/types";
import { createExpositor, updateExpositor } from "@/app/actions/expositores";
import { cn } from "@/lib/utils";

const schema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  tiene_iva: z.boolean(),
  comision_dominga: z.number({ invalid_type_error: "Ingresa un número" }).min(0).max(100),
  fee_participacion: z.number({ invalid_type_error: "Ingresa un número" }).min(0),
  pago_envio: z.number({ invalid_type_error: "Ingresa un número" }).min(0),
  estado: z.enum(["pendiente", "confirmado", "pagado"]),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  eventoId: string;
  expositor?: Tables<"expositores">;
  onClose: () => void;
}

export function ExpositorFormModal({ eventoId, expositor, onClose }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isEdit = !!expositor;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: expositor
      ? {
          nombre: expositor.nombre,
          tiene_iva: expositor.tiene_iva,
          comision_dominga: expositor.comision_dominga,
          fee_participacion: expositor.fee_participacion,
          pago_envio: expositor.pago_envio,
          estado: expositor.estado as "pendiente" | "confirmado" | "pagado",
          notas: expositor.notas ?? "",
        }
      : {
          nombre: "",
          tiene_iva: false,
          comision_dominga: 30,
          fee_participacion: 0,
          pago_envio: 0,
          estado: "pendiente",
          notas: "",
        },
  });

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = isEdit
      ? await updateExpositor(expositor.id, eventoId, values)
      : await createExpositor(eventoId, values);

    if ("error" in result) {
      setServerError(result.error ?? "Error inesperado");
    } else {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 m-auto w-full max-w-lg rounded-lg bg-white p-0 shadow-xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm open:flex open:flex-col"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-line">
        <h2 className="text-lg">{isEdit ? "Editar marca" : "Nueva marca"}</h2>
        <button onClick={onClose} className="text-ink-muted hover:text-ink">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-5 py-4 overflow-y-auto">
        <div>
          <label className="label">Nombre de la marca</label>
          <input
            {...register("nombre")}
            className={cn("input mt-1", errors.nombre && "ring-2 ring-rose-400")}
            placeholder="Ej: Taller Raíces"
            autoFocus
          />
          {errors.nombre && <p className="text-xs text-rose-600 mt-1">{errors.nombre.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Comisión Dominga (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register("comision_dominga", { valueAsNumber: true })}
              className={cn("input mt-1", errors.comision_dominga && "ring-2 ring-rose-400")}
              placeholder="30"
            />
            {errors.comision_dominga && (
              <p className="text-xs text-rose-600 mt-1">{errors.comision_dominga.message}</p>
            )}
          </div>

          <div>
            <label className="label">Estado</label>
            <select {...register("estado")} className="input mt-1">
              <option value="pendiente">Pendiente</option>
              <option value="confirmado">Confirmada</option>
              <option value="pagado">Fee pagado</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Fee de participación ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register("fee_participacion", { valueAsNumber: true })}
              className={cn("input mt-1", errors.fee_participacion && "ring-2 ring-rose-400")}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="label">Pago de envío ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register("pago_envio", { valueAsNumber: true })}
              className={cn("input mt-1", errors.pago_envio && "ring-2 ring-rose-400")}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="tiene_iva"
            {...register("tiene_iva")}
            className="h-4 w-4 rounded border-line accent-rose-600"
          />
          <label htmlFor="tiene_iva" className="text-sm text-ink cursor-pointer">
            La marca factura con IVA 15%
          </label>
        </div>

        <div>
          <label className="label">Notas internas (opcional)</label>
          <textarea
            {...register("notas")}
            rows={2}
            className="input mt-1 h-auto py-2 resize-none"
            placeholder="Observaciones, acuerdos especiales..."
          />
        </div>

        {serverError && (
          <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded">{serverError}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Agregar marca"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
