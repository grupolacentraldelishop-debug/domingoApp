"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Tables } from "@/lib/supabase/types";
import { ExpositorCard } from "./ExpositorCard";
import { ExpositorFormModal } from "./ExpositorFormModal";

type ExpositorWithCount = Tables<"expositores"> & { productos: { id: string }[] };

type ModalState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; expositor: Tables<"expositores"> };

interface Props {
  eventoId: string;
  expositores: ExpositorWithCount[];
}

export function ExpositoresClient({ eventoId, expositores }: Props) {
  const [modal, setModal] = useState<ModalState>({ type: "closed" });

  return (
    <>
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={() => setModal({ type: "create" })}>
          <Plus size={16} />
          Agregar marca
        </button>
      </div>

      {expositores.length === 0 ? (
        <div className="text-center py-16 text-ink-muted">
          <p className="text-base">Aún no hay marcas en este evento.</p>
          <button
            className="btn-primary mt-4"
            onClick={() => setModal({ type: "create" })}
          >
            <Plus size={16} />
            Agregar primera marca
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {expositores.map((e) => (
            <ExpositorCard
              key={e.id}
              expositor={e}
              productoCount={e.productos.length}
              eventoId={eventoId}
              onEdit={() => setModal({ type: "edit", expositor: e })}
            />
          ))}
        </div>
      )}

      {modal.type !== "closed" && (
        <ExpositorFormModal
          eventoId={eventoId}
          expositor={modal.type === "edit" ? modal.expositor : undefined}
          onClose={() => setModal({ type: "closed" })}
        />
      )}
    </>
  );
}
