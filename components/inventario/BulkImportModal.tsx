"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Upload, AlertTriangle, Info, CheckCircle, Loader2 } from "lucide-react";
import { Tables } from "@/lib/supabase/types";
import { parsearIngreso, bulkCreateProductos, ParsedProducto } from "@/app/actions/importar";
import { calcularMargenes } from "@/lib/calculos";
import { formatMoney, cn } from "@/lib/utils";

type Expositor = Pick<Tables<"expositores">, "id" | "nombre" | "comision_dominga" | "tiene_iva">;

type Paso = "subir" | "procesando" | "revision" | "importando" | "listo";

interface Props {
  expositor: Expositor;
  eventoId: string;
  onClose: () => void;
}

export function BulkImportModal({ expositor, eventoId, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [paso, setPaso] = useState<Paso>("subir");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [notas, setNotas] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productos, setProductos] = useState<ParsedProducto[]>([]);
  const [advertencias, setAdvertencias] = useState<string[]>([]);
  const [notasParser, setNotasParser] = useState("");
  const [creadosCount, setCreadosCount] = useState(0);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleBackdrop(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  function handleFileSelect(file: File) {
    setArchivo(file);
    setError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  async function handleProcesar() {
    if (!archivo) return;
    setPaso("procesando");
    setError(null);

    const fd = new FormData();
    fd.append("archivo", archivo);

    const result = await parsearIngreso(fd, {
      nombre: expositor.nombre,
      tiene_iva: expositor.tiene_iva,
      comision_dominga: expositor.comision_dominga,
    }, notas);

    if ("error" in result) {
      setError(result.error);
      setPaso("subir");
      return;
    }

    setProductos(result.productos);
    setAdvertencias(result.advertencias);
    setNotasParser(result.notas);
    setPaso("revision");
  }

  async function handleImportar() {
    const validos = productos.filter((p) => p.valido);
    if (validos.length === 0) return;

    setPaso("importando");
    const result = await bulkCreateProductos(validos, expositor.id, eventoId);

    if ("error" in result) {
      setError(result.error);
      setPaso("revision");
      return;
    }

    setCreadosCount(result.creados);
    setPaso("listo");
  }

  function handleReset() {
    setArchivo(null);
    setNotas("");
    setError(null);
    setProductos([]);
    setAdvertencias([]);
    setNotasParser("");
    setPaso("subir");
  }

  function updateProducto(idx: number, field: keyof ParsedProducto, value: string | number | null) {
    setProductos((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        const updated = { ...p, [field]: value };
        updated.valido = !!updated.descripcion && typeof updated.pvp === "number" && updated.pvp > 0;
        return updated;
      })
    );
  }

  function removeProducto(idx: number) {
    setProductos((prev) => prev.filter((_, i) => i !== idx));
  }

  const validCount = productos.filter((p) => p.valido).length;
  const warnCount = productos.filter((p) => !p.valido).length;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdrop}
      className="backdrop:bg-black/40 backdrop:backdrop-blur-sm bg-transparent p-0 max-w-2xl w-full mx-auto rounded-2xl shadow-xl"
    >
      <div className="bg-surface rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div>
            <h2 className="font-semibold">Importar inventario</h2>
            <p className="text-xs text-ink-muted">{expositor.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cream-100 text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {/* ── PASO: SUBIR ── */}
          {paso === "subir" && (
            <div className="space-y-4">
              <p className="text-sm text-ink-muted">
                Sube una orden de ingreso en CSV, Excel o PDF. Claude extraerá los productos automáticamente.
              </p>

              {/* Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                  dragging ? "border-rose-400 bg-rose-50" : "border-line hover:border-rose-300 hover:bg-cream-50",
                  archivo && "border-emerald-400 bg-emerald-50"
                )}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
                {archivo ? (
                  <div className="space-y-1">
                    <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="font-medium text-sm">{archivo.name}</p>
                    <p className="text-xs text-ink-muted">{(archivo.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-ink-subtle mx-auto" />
                    <p className="text-sm font-medium">Arrastra aquí o haz clic para seleccionar</p>
                    <p className="text-xs text-ink-muted">CSV · Excel (.xlsx) · PDF</p>
                  </div>
                )}
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1.5">
                  Notas de la orden <span className="font-normal">(opcional)</span>
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  placeholder='Ej: "Los precios están sin IVA" · "Orden de ingreso mayo 2026"'
                  className="w-full text-sm rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-300 resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                onClick={handleProcesar}
                disabled={!archivo}
                className={cn(
                  "btn-primary w-full justify-center",
                  !archivo && "opacity-40 cursor-not-allowed"
                )}
              >
                Procesar documento →
              </button>
            </div>
          )}

          {/* ── PASO: PROCESANDO ── */}
          {(paso === "procesando" || paso === "importando") && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto" />
              <p className="text-sm font-medium">
                {paso === "procesando" ? "Leyendo documento con IA…" : "Creando productos…"}
              </p>
              <p className="text-xs text-ink-muted">
                {paso === "procesando" ? "Esto puede tomar unos segundos." : ""}
              </p>
            </div>
          )}

          {/* ── PASO: REVISIÓN ── */}
          {paso === "revision" && (
            <div className="space-y-4">
              {/* Notas del parser */}
              {notasParser && (
                <div className="flex gap-2 bg-blue-50 text-blue-800 rounded-lg px-4 py-3 text-sm">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{notasParser}</p>
                </div>
              )}

              {/* Advertencias */}
              {advertencias.length > 0 && (
                <div className="bg-amber-50 rounded-lg px-4 py-3 text-sm space-y-1">
                  <div className="flex gap-2 text-amber-800 font-medium mb-1">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    Advertencias
                  </div>
                  <ul className="space-y-0.5 text-amber-700 list-disc list-inside">
                    {advertencias.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}

              {/* Tabla */}
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-xs min-w-[560px]">
                  <thead>
                    <tr className="text-left text-ink-subtle border-b border-line">
                      <th className="py-1.5 pr-2 w-5"></th>
                      <th className="py-1.5 pr-3 w-20">Código</th>
                      <th className="py-1.5 pr-3">Descripción</th>
                      <th className="py-1.5 pr-3 w-20">PVP</th>
                      <th className="py-1.5 pr-3 w-16">Cant.</th>
                      <th className="py-1.5 pr-3 w-24 text-right">Margen marca</th>
                      <th className="py-1.5 w-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {productos.map((p, i) => {
                      const margenes = p.pvp ? calcularMargenes(p.pvp, expositor.comision_dominga, expositor.tiene_iva) : null;
                      return (
                        <tr key={i} className={cn(!p.valido && "bg-amber-50")}>
                          <td className="py-2 pr-2">
                            {p.valido
                              ? <span className="text-emerald-500">✓</span>
                              : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            }
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              value={p.codigo ?? ""}
                              onChange={(e) => updateProducto(i, "codigo", e.target.value || null)}
                              placeholder="—"
                              className="w-full bg-transparent border-b border-transparent hover:border-line focus:border-rose-300 focus:outline-none px-0.5"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              value={p.descripcion}
                              onChange={(e) => updateProducto(i, "descripcion", e.target.value)}
                              className={cn(
                                "w-full bg-transparent border-b border-transparent hover:border-line focus:border-rose-300 focus:outline-none px-0.5",
                                !p.descripcion && "border-amber-300"
                              )}
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              value={p.pvp ?? ""}
                              min={0}
                              step="0.01"
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                updateProducto(i, "pvp", isNaN(v) ? null : v);
                              }}
                              placeholder="?"
                              className={cn(
                                "w-full bg-transparent border-b border-transparent hover:border-line focus:border-rose-300 focus:outline-none px-0.5",
                                !p.pvp && "border-amber-300"
                              )}
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              value={p.cantidad}
                              min={1}
                              step={1}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (!isNaN(v) && v > 0) updateProducto(i, "cantidad", v);
                              }}
                              className="w-full bg-transparent border-b border-transparent hover:border-line focus:border-rose-300 focus:outline-none px-0.5"
                            />
                          </td>
                          <td className="py-2 pr-3 text-right text-ink-muted">
                            {margenes ? formatMoney(margenes.margenMarca) : "—"}
                          </td>
                          <td className="py-2">
                            <button
                              onClick={() => removeProducto(i)}
                              className="text-ink-subtle hover:text-red-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {productos.length === 0 && (
                <p className="text-sm text-ink-muted text-center py-4">
                  No hay productos para importar.
                </p>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
            </div>
          )}

          {/* ── PASO: LISTO ── */}
          {paso === "listo" && (
            <div className="py-12 text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="font-semibold">
                {creadosCount} {creadosCount === 1 ? "producto importado" : "productos importados"}
              </p>
              <p className="text-sm text-ink-muted">Para {expositor.nombre}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {(paso === "revision" || paso === "listo") && (
          <div className="px-5 py-4 border-t border-line shrink-0 flex items-center justify-between gap-3">
            {paso === "revision" && (
              <>
                <div className="text-xs text-ink-muted">
                  {validCount > 0 && <span className="text-emerald-700 font-medium">{validCount} listos</span>}
                  {validCount > 0 && warnCount > 0 && <span className="mx-1">·</span>}
                  {warnCount > 0 && <span className="text-amber-600">{warnCount} con advertencias</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleReset} className="btn-secondary text-sm">
                    ← Volver
                  </button>
                  <button
                    onClick={handleImportar}
                    disabled={validCount === 0}
                    className={cn("btn-primary text-sm", validCount === 0 && "opacity-40 cursor-not-allowed")}
                  >
                    Importar {validCount > 0 ? `${validCount} productos` : ""} →
                  </button>
                </div>
              </>
            )}
            {paso === "listo" && (
              <>
                <button onClick={handleReset} className="btn-secondary text-sm">
                  Importar otra orden
                </button>
                <button onClick={onClose} className="btn-primary text-sm">
                  Cerrar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
