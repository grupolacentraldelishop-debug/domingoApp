"use client";

import { useState, useRef } from "react";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Tables } from "@/lib/supabase/types";
import { formatMoney, cn } from "@/lib/utils";
import { updateProductoField, deleteProducto } from "@/app/actions/productos";

type Producto = Tables<"productos">;

interface Props {
  producto: Producto;
  eventoId: string;
}

type EditableField = "descripcion" | "codigo" | "pvp" | "cantidad";

export function ProductoCard({ producto, eventoId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState<EditableField | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function saveField(field: EditableField, value: string) {
    const original = String(producto[field] ?? "");
    if (value === original) return;
    setSaving(field);
    setSaveError(null);
    const result = await updateProductoField(producto.id, eventoId, field, value);
    setSaving(null);
    if ("error" in result) setSaveError(result.error ?? "Error al guardar");
  }

  async function handleDelete() {
    setDeleteError(null);
    if (!confirm(`¿Eliminar "${producto.descripcion}"?`)) return;
    setDeleting(true);
    const result = await deleteProducto(producto.id, eventoId);
    setDeleting(false);
    if ("error" in result) setDeleteError(result.error ?? "Error al eliminar");
  }

  const disponibles = producto.cantidad - producto.vendidos;

  return (
    <div className={cn("card text-sm", saving && "opacity-60")}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <InlineField
            value={producto.descripcion}
            onSave={(v) => saveField("descripcion", v)}
            className="font-medium text-base"
            placeholder="Descripción"
          />
          {producto.codigo && (
            <p className="text-xs text-ink-subtle mt-0.5">{producto.codigo}</p>
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn h-7 w-7 px-0 bg-white border-hairline text-rose-500 hover:bg-rose-50 shrink-0"
          title="Eliminar"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div>
          <p className="text-xs text-ink-subtle">PVP</p>
          <InlineField
            value={String(producto.pvp)}
            onSave={(v) => saveField("pvp", v)}
            type="number"
            prefix="$"
            className="font-semibold"
          />
        </div>
        <div>
          <p className="text-xs text-ink-subtle">Stock</p>
          <InlineField
            value={String(producto.cantidad)}
            onSave={(v) => saveField("cantidad", v)}
            type="number"
            className="font-semibold"
          />
        </div>
        <div>
          <p className="text-xs text-ink-subtle">Disponibles</p>
          <p
            className={cn(
              "font-semibold",
              disponibles === 0 && "text-rose-600",
              disponibles > 0 && disponibles < 3 && "text-amber-600"
            )}
          >
            {disponibles}
          </p>
        </div>
      </div>

      {producto.margen_marca != null && (
        <>
          <button
            onClick={() => setExpanded((x) => !x)}
            className="flex items-center gap-1 text-xs text-ink-subtle mt-3 hover:text-ink"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? "Ocultar márgenes" : "Ver márgenes"}
          </button>

          {expanded && (
            <div className="mt-2 pt-2 border-t border-line space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-subtle">Margen Dominga</span>
                <span className="font-medium text-rose-700">
                  {formatMoney(producto.margen_dominga)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-subtle">Margen marca</span>
                <span className="font-medium">{formatMoney(producto.margen_marca)}</span>
              </div>
              {producto.iva_unitario != null && producto.iva_unitario > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink-subtle">IVA</span>
                  <span>{formatMoney(producto.iva_unitario)}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {saveError && (
        <p className="text-xs text-rose-600 mt-2">{saveError}</p>
      )}
      {deleteError && (
        <p className="text-xs text-rose-600 mt-2">{deleteError}</p>
      )}
    </div>
  );
}

function InlineField({
  value,
  onSave,
  type = "text",
  prefix,
  className,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void;
  type?: "text" | "number";
  prefix?: string;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    setEditing(false);
    onSave(draft);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-0.5">
        {prefix && <span className="text-ink-subtle">{prefix}</span>}
        <input
          ref={inputRef}
          type={type}
          step={type === "number" ? "0.01" : undefined}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-full bg-cream-100 rounded px-1 focus:outline-none focus:ring-1 focus:ring-rose-300"
          autoFocus
        />
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      className={cn(
        "text-left hover:bg-cream-100 rounded px-0.5 -mx-0.5 transition-colors",
        className
      )}
      title="Haz clic para editar"
    >
      {prefix && <span className="text-ink-subtle mr-0.5">{prefix}</span>}
      {value || <span className="text-ink-subtle italic">{placeholder}</span>}
    </button>
  );
}
