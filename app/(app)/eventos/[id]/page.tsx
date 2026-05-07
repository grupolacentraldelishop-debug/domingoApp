import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin, Tag, Package, ShoppingBag, BarChart3, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/utils";

const ESTADO_BADGE: Record<string, string> = {
  planeacion: "bg-cream-200 text-ink-muted",
  en_curso: "bg-rose-100 text-rose-700",
  cerrado: "bg-line text-ink-subtle",
};
const ESTADO_LABEL: Record<string, string> = {
  planeacion: "Planeación",
  en_curso: "En curso",
  cerrado: "Cerrado",
};

const MODULOS = [
  { href: "expositores", label: "Marcas", icon: Tag, desc: "Gestionar expositores" },
  { href: "inventario", label: "Inventario", icon: Package, desc: "Productos y stock" },
  { href: "ventas", label: "Ventas", icon: ShoppingBag, desc: "Registrar boletas" },
  { href: "reportes", label: "Reportes", icon: BarChart3, desc: "Liquidación y gastos" },
] as const;

export default async function EventoHome({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: evento }, { data: stats }] = await Promise.all([
    supabase
      .from("eventos")
      .select("nombre, fecha_inicio, fecha_fin, lugar, descripcion, estado")
      .eq("id", params.id)
      .single(),
    supabase
      .from("liquidacion_marca")
      .select("total_ventas, total_margen_dominga")
      .eq("evento_id", params.id),
  ]);

  if (!evento) notFound();

  const totalVentas = stats?.reduce((s, r) => s + Number(r.total_ventas ?? 0), 0) ?? 0;
  const totalDominga = stats?.reduce((s, r) => s + Number(r.total_margen_dominga ?? 0), 0) ?? 0;
  const totalMarcas = stats?.length ?? 0;

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-display">{evento.nombre}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(evento.fecha_inicio)} – {formatDate(evento.fecha_fin)}
            </span>
            {evento.lugar && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {evento.lugar}
              </span>
            )}
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_BADGE[evento.estado] ?? ""}`}>
          {ESTADO_LABEL[evento.estado] ?? evento.estado}
        </span>
      </div>

      {evento.descripcion && (
        <p className="text-sm text-ink-muted mb-5">{evento.descripcion}</p>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Marcas" value={totalMarcas} />
        <Stat label="Ventas" value={formatMoney(totalVentas)} />
        <Stat label="Para Dominga" value={formatMoney(totalDominga)} />
      </div>

      <h2 className="text-lg mb-3">Módulos</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {MODULOS.map(({ href, label, icon: Icon, desc }) => (
          <li key={href}>
            <Link
              href={`/eventos/${params.id}/${href}`}
              className="card flex items-center gap-3 hover:border-rose-300 transition-colors"
            >
              <div className="w-10 h-10 rounded bg-cream-100 flex items-center justify-center">
                <Icon className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{label}</div>
                <div className="text-xs text-ink-muted">{desc}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-ink-subtle" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card py-3">
      <div className="text-xs text-ink-subtle uppercase tracking-wide">{label}</div>
      <div className="text-xl font-display mt-0.5">{value}</div>
    </div>
  );
}
