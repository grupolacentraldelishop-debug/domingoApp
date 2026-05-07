import Link from "next/link";
import { Plus, MapPin, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/ui/Header";
import { formatDate } from "@/lib/utils";

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

export default async function EventosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: eventos }] = await Promise.all([
    supabase.from("profiles").select("nombre").eq("id", user.id).single(),
    supabase
      .from("eventos")
      .select("id, nombre, fecha_inicio, fecha_fin, lugar, estado")
      .order("fecha_inicio", { ascending: false }),
  ]);

  return (
    <>
      <Header userName={profile?.nombre ?? "Usuario"} />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl">Eventos</h1>
            <p className="text-sm text-ink-muted">
              Pop-ups y activaciones de Dominga
            </p>
          </div>
          <Link href="/eventos/nuevo" className="btn-primary">
            <Plus className="w-4 h-4" />
            Nuevo evento
          </Link>
        </div>

        {!eventos || eventos.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-ink-muted mb-4">Aún no tienes eventos creados.</p>
            <Link href="/eventos/nuevo" className="btn-primary inline-flex">
              <Plus className="w-4 h-4" />
              Crear el primero
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {eventos.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/eventos/${e.id}`}
                  className="card block hover:border-rose-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-display">{e.nombre}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        ESTADO_BADGE[e.estado] ?? ""
                      }`}
                    >
                      {ESTADO_LABEL[e.estado] ?? e.estado}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-ink-muted">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(e.fecha_inicio)} – {formatDate(e.fecha_fin)}
                    </div>
                    {e.lugar && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {e.lugar}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
