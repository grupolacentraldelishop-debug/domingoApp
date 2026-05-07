"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type EventoOpt = { id: string; nombre: string };

export function EventoSelector({
  eventos,
  activeId,
}: {
  eventos: EventoOpt[];
  activeId: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = eventos.find((e) => e.id === activeId);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded border-hairline bg-white text-sm hover:bg-cream-100 max-w-[200px] sm:max-w-xs"
      >
        <span className="truncate">{active?.nombre ?? "Selecciona evento"}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 text-ink-subtle" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 max-h-80 overflow-auto bg-white rounded-lg border-hairline shadow-lg py-1 z-40">
          {eventos.map((e) => (
            <Link
              key={e.id}
              href={`/eventos/${e.id}`}
              onClick={() => setOpen(false)}
              className={cn(
                "block px-3 py-2 text-sm hover:bg-cream-100",
                e.id === activeId && "bg-cream-100 font-medium"
              )}
            >
              {e.nombre}
            </Link>
          ))}
          <div className="border-t border-line mt-1 pt-1">
            <Link
              href="/eventos/nuevo"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-rose-600 hover:bg-cream-100"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo evento
            </Link>
            <Link
              href="/eventos"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-ink-muted hover:bg-cream-100"
            >
              Ver todos
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
