"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Tag, Package, ShoppingBag, BarChart3 } from "lucide-react";

const ITEMS = [
  { href: "expositores", label: "Marcas", icon: Tag },
  { href: "inventario", label: "Inventario", icon: Package },
  { href: "ventas", label: "Ventas", icon: ShoppingBag },
  { href: "reportes", label: "Reportes", icon: BarChart3 },
] as const;

export function EventoNav({ eventoId }: { eventoId: string }) {
  const pathname = usePathname();
  return (
    <nav className="border-b border-line bg-cream-50 sticky top-14 z-20">
      <div className="max-w-5xl mx-auto px-2 flex overflow-x-auto">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const path = `/eventos/${eventoId}/${href}`;
          const active = pathname.startsWith(path);
          return (
            <Link
              key={href}
              href={path}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors",
                active
                  ? "border-rose-500 text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
