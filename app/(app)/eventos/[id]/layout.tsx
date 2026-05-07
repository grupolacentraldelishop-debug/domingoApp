import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/ui/Header";
import { EventoSelector } from "@/components/ui/EventoSelector";
import { EventoNav } from "@/components/ui/EventoNav";

export default async function EventoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: evento }, { data: eventos }] = await Promise.all([
    supabase.from("profiles").select("nombre").eq("id", user.id).single(),
    supabase
      .from("eventos")
      .select("id, nombre")
      .eq("id", params.id)
      .single(),
    supabase
      .from("eventos")
      .select("id, nombre")
      .order("fecha_inicio", { ascending: false }),
  ]);

  if (!evento) notFound();

  return (
    <>
      <Header
        userName={profile?.nombre ?? "Usuario"}
        rightSlot={
          <EventoSelector eventos={eventos ?? []} activeId={evento.id} />
        }
      />
      <EventoNav eventoId={evento.id} />
      {children}
    </>
  );
}
