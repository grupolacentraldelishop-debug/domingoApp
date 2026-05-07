"use client";

import { useEffect, useRef, useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Tables } from "@/lib/supabase/types";
import { anularBoleta } from "@/app/actions/ventas";
import { formatMoney, formatDate, cn } from "@/lib/utils";

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
  transferencia: "Transferencia",
};

interface Props {
  boleta: Boleta;
  eventoId: string;
  expositorNombre: (id: string) => string;
  onClose: () => void;
}

export function BoletaDetalleModal({ boleta, eventoId, expositorNombre, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleBackdrop(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  async function handleAnular() {
    setLoading(true);
    setError(null);
    const result = await anularBoleta(boleta.id, eventoId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  }

  const anulada = boleta.estado === "anulada";

  // Agrupar ventas por expositor
  const porExpositor = boleta.ventas.reduce<Record<string, Venta[]>>((acc, v) => {
    (acc[v.expositor_id] ??= []).push(v);
    return acc;
  }, {});

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdrop}
      className="backdrop:bg-black/40 backdrop:backdrop-blur-sm bg-transparent p-0 max-w-lg w-full mx-auto rounded-2xl shadow-xl"
    >
      <div className="bg-surface rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base">
              #{boleta.id.slice(-6).toUpperCase()}
            </span>
            {anulada ? (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                Anulada
              </span>
            ) : (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                Activa
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cream-100 text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Info general */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-ink-subtle">Fecha</p>
              <p className="font-medium">{formatDate(boleta.fecha)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-subtle">Método de pago</p>
              <p className="font-medium">{METODO_LABEL[boleta.metodo_pago] ?? boleta.metodo_pago}</p>
            </div>
            <div>
              <p className="text-xs text-ink-subtle">Cliente</p>
              <p className="font-medium">{boleta.cliente}</p>
            </div>
            {boleta.profile_nombre && (
              <div>
                <p className="text-xs text-ink-subtle">Registrado por</p>
                <p className="font-medium">{boleta.profile_nombre}</p>
              </div>
            )}
          </div>

          {/* Datos de factura */}
          {boleta.pide_factura && (
            <div className="bg-rose-50 rounded-lg px-4 py-3 text-sm space-y-1">
              <p className="text-xs font-medium text-rose-700 mb-1.5">Datos de factura</p>
              {boleta.cliente_razon_social && (
                <p><span className="text-ink-subtle">Razón social: </span>{boleta.cliente_razon_social}</p>
              )}
              {boleta.cliente_identificacion && (
                <p><span className="text-ink-subtle">RUC/CI: </span>{boleta.cliente_identificacion}</p>
              )}
              {boleta.cliente_email && (
                <p><span className="text-ink-subtle">Email: </span>{boleta.cliente_email}</p>
              )}
              {boleta.cliente_telefono && (
                <p><span className="text-ink-subtle">Teléfono: </span>{boleta.cliente_telefono}</p>
              )}
              {boleta.cliente_direccion && (
                <p><span className="text-ink-subtle">Dirección: </span>{boleta.cliente_direccion}</p>
              )}
            </div>
          )}

          {/* Ítems por marca */}
          <div>
            <p className="text-xs font-medium text-ink-subtle mb-2">Ítems</p>
            <div className="space-y-3">
              {Object.entries(porExpositor).map(([expId, ventas]) => (
                <div key={expId}>
                  <p className="text-xs text-ink-muted font-medium mb-1">{expositorNombre(expId)}</p>
                  <div className="space-y-1">
                    {ventas.map((v) => (
                      <div key={v.id} className="flex items-center justify-between text-sm">
                        <span className="text-ink-base">
                          {v.descripcion}
                          {v.cantidad > 1 && (
                            <span className="text-ink-muted ml-1">×{v.cantidad}</span>
                          )}
                        </span>
                        <span className="font-medium shrink-0 ml-2">{formatMoney(v.pvp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="border-t border-line pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">Margen marcas</span>
              <span>{formatMoney(boleta.total_marca)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Comisión Dominga</span>
              <span className="text-rose-700">{formatMoney(boleta.total_dominga)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total PVP</span>
              <span>{formatMoney(boleta.total_pvp)}</span>
            </div>
          </div>

          {/* Anulación */}
          {!anulada && (
            <div className="border-t border-line pt-3">
              {!confirmando ? (
                <button
                  onClick={() => setConfirmando(true)}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Anular venta
                </button>
              ) : (
                <div className="bg-red-50 rounded-lg px-4 py-3 space-y-3">
                  <div className="flex gap-2 text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>¿Anular esta boleta? El stock de los productos se restaurará. Esta acción no se puede deshacer.</p>
                  </div>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleAnular}
                      disabled={loading}
                      className={cn(
                        "text-sm font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white",
                        loading && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      {loading ? "Anulando…" : "Confirmar anulación"}
                    </button>
                    <button
                      onClick={() => { setConfirmando(false); setError(null); }}
                      disabled={loading}
                      className="text-sm text-ink-muted px-3 py-1.5 rounded-lg hover:bg-cream-100"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
