import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/ui/Header";
import { EventoForm } from "@/components/eventos/EventoForm";

export default async function NuevoEventoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("nombre").eq("id", user.id).single();

  return (
    <>
      <Header userName={profile?.nombre ?? "Usuario"} />
      <main className="max-w-xl mx-auto px-4 py-6">
        <Link
          href="/eventos"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
        <h1 className="text-2xl mb-1">Nuevo evento</h1>
        <p className="text-sm text-ink-muted mb-5">
          Cada evento tiene sus propias marcas, productos y reportes.
        </p>
        <EventoForm />
      </main>
    </>
  );
}
