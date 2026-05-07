"use client";

import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { Tables } from "@/lib/supabase/types";
import { ProductoCard } from "./ProductoCard";
import { ProductoFormModal } from "./ProductoFormModal";
import { BulkImportModal } from "./BulkImportModal";
import { cn } from "@/lib/utils";

type Expositor = Pick<
  Tables<"expositores">,
  "id" | "nombre" | "comision_dominga" | "tiene_iva"
>;
type Producto = Tables<"productos">;

interface Props {
  eventoId: string;
  expositores: Expositor[];
  productos: Producto[];
}

export function InventarioClient({ eventoId, expositores, productos }: Props) {
  const [activeTab, setActiveTab] = useState<string>("todas");
  const [addModal, setAddModal] = useState<Expositor | null>(null);
  const [importModal, setImportModal] = useState(false);

  const expositorMap = new Map(expositores.map((e) => [e.id, e]));

  const filtered =
    activeTab === "todas"
      ? productos
      : productos.filter((p) => p.expositor_id === activeTab);

  const activeExpositor =
    activeTab !== "todas" ? expositorMap.get(activeTab) ?? null : null;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex overflow-x-auto gap-1 pb-1 flex-1">
          <TabButton
            active={activeTab === "todas"}
            onClick={() => setActiveTab("todas")}
            label={`Todas (${productos.length})`}
          />
          {expositores.map((e) => {
            const count = productos.filter((p) => p.expositor_id === e.id).length;
            return (
              <TabButton
                key={e.id}
                active={activeTab === e.id}
                onClick={() => setActiveTab(e.id)}
                label={`${e.nombre} (${count})`}
              />
            );
          })}
        </div>

        {activeExpositor && (
          <div className="flex gap-1.5 shrink-0 ml-2">
            <button
              className="btn-secondary"
              onClick={() => setImportModal(true)}
            >
              <Upload size={16} />
              Importar
            </button>
            <button
              className="btn-primary"
              onClick={() => setAddModal(activeExpositor)}
            >
              <Plus size={16} />
              Agregar
            </button>
          </div>
        )}
      </div>

      {activeTab === "todas" && (
        <div className="flex justify-end mb-4">
          <p className="text-sm text-ink-muted">
            Selecciona una marca para agregar productos.
          </p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-ink-muted">
          {activeTab === "todas"
            ? "No hay productos en este evento todavía."
            : "Esta marca no tiene productos aún."}
          {activeExpositor && (
            <button
              className="btn-primary mt-4 mx-auto block"
              onClick={() => setAddModal(activeExpositor)}
            >
              <Plus size={16} />
              Agregar primer producto
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {activeTab === "todas"
            ? expositores.map((e) => {
                const ps = productos.filter((p) => p.expositor_id === e.id);
                if (ps.length === 0) return null;
                return (
                  <section key={e.id}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                        {e.nombre}
                      </h3>
                      <button
                        className="btn-secondary h-7 px-2 text-xs"
                        onClick={() => setAddModal(e)}
                      >
                        <Plus size={12} /> Agregar
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {ps.map((p) => (
                        <ProductoCard key={p.id} producto={p} eventoId={eventoId} />
                      ))}
                    </div>
                  </section>
                );
              })
            : (
              <div className="grid sm:grid-cols-2 gap-3">
                {filtered.map((p) => (
                  <ProductoCard key={p.id} producto={p} eventoId={eventoId} />
                ))}
              </div>
            )}
        </div>
      )}

      {addModal && (
        <ProductoFormModal
          expositor={addModal}
          eventoId={eventoId}
          onClose={() => setAddModal(null)}
        />
      )}

      {importModal && activeExpositor && (
        <BulkImportModal
          expositor={activeExpositor}
          eventoId={eventoId}
          onClose={() => setImportModal(false)}
        />
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors",
        active
          ? "bg-ink text-cream-50"
          : "bg-white border-hairline text-ink-muted hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}
