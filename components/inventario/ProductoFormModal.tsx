"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { Tables } from "@/lib/supabase/types";
import { createProducto } from "@/app/actions/productos";
import { calcularMargenes } from "@/lib/calculos";
import { formatMoney, cn } from "@/lib/utils";

const schema = z.object({
  descripcion: z.string().min(1, "La descripción es requerida"),
  codigo: z.string().optional(),
  pvp: z.number({ invalid_type_error: "Ingresa un número" }).positive("Debe ser mayor a 0"),
  cantidad: z.number({ invalid_type_error: "Ingresa un número" }).int().min(0),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  expositor: Pick<Tables<"expositores">, "id" | "nombre" | "comision_dominga" | "tiene_iva">;
  eventoId: string;
  onClose: () => void;
}

export function ProductoFormModal({ expositor, eventoId, onClose }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { descripcion: "", codigo: "", pvp: 0, cantidad: 1 },
  });

  const pvpValue = useWatch({ control, name: "pvp" });
  const margenes =
    pvpValue > 0
      ? calcularMargenes(pvpValue, expositor.comision_dominga, expositor.tiene_iva)
      : null;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await createProducto(expositor.id, eventoId, values);
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
        <div>
          <h2 className="text-lg">Nuevo producto</h2>
          <p className="text-xs text-ink-muted">{expositor.nombre}</p>
        </div>
        <button onClick={onClose} className="text-ink-muted hover:text-ink">
          <X size={20} />
        </button>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 px-5 py-4 overflow-y-auto"
      >
        <div>
          <label className="label">Descripción / nombre del producto</label>
          <input
            {...register("descripcion")}
            className={cn("input mt-1", errors.descripcion && "ring-2 ring-rose-400")}
            placeholder="Ej: Collar de plata tejido"
            autoFocus
          />
          {errors.descripcion && (
            <p className="text-xs text-rose-600 mt-1">{errors.descripcion.message}</p>
          )}
        </div>

        <div>
          <label className="label">Código SKU (opcional)</label>
          <input
            {...register("codigo")}
            className="input mt-1"
            placeholder="Ej: COL-001"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">PVP ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              {...register("pvp", { valueAsNumber: true })}
              className={cn("input mt-1", errors.pvp && "ring-2 ring-rose-400")}
              placeholder="0.00"
            />
            {errors.pvp && (
              <p className="text-xs text-rose-600 mt-1">{errors.pvp.message}</p>
            )}
          </div>
          <div>
            <label className="label">Cantidad en stock</label>
            <input
              type="number"
              min="0"
              {...register("cantidad", { valueAsNumber: true })}
              className={cn("input mt-1", errors.cantidad && "ring-2 ring-rose-400")}
              placeholder="1"
            />
          </div>
        </div>

        {margenes && (
          <div className="rounded-lg bg-cream-100 p-3 text-sm space-y-1">
            <p className="label text-xs mb-2">Preview de márgenes</p>
            {expositor.tiene_iva && (
              <div className="flex justify-between text-ink-muted">
                <span>Precio base (sin IVA)</span>
                <span>{formatMoney(margenes.precioBase)}</span>
              </div>
            )}
            {expositor.tiene_iva && (
              <div className="flex justify-between text-ink-muted">
                <span>IVA 15%</span>
                <span>{formatMoney(margenes.ivaUnitario)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium text-rose-700">
              <span>Margen Dominga ({expositor.comision_dominga}%)</span>
              <span>{formatMoney(margenes.margenDominga)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Margen marca</span>
              <span>{formatMoney(margenes.margenMarca)}</span>
            </div>
          </div>
        )}

        {serverError && (
          <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded">{serverError}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Guardando…" : "Agregar producto"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
