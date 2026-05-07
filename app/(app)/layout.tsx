import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Asegurar que existe perfil (defensa: el trigger debe haberlo creado)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nombre, rol")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Trigger falló: crear manualmente para no dejar al usuario en limbo
    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email ?? "",
      nombre: (user.user_metadata?.nombre as string) ?? user.email?.split("@")[0] ?? "Usuario",
    });
  }

  return <>{children}</>;
}
