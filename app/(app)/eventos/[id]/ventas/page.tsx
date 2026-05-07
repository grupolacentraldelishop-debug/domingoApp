import { createClient } from "@/lib/supabase/server";
import { BoletaBuilder } from "@/components/ventas/BoletaBuilder";
import { BoletasHistory } from "@/components/ventas/BoletasHistory";
import { Tables } from "@/lib/supabase/types";

export default async function VentasPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: expositores } = await supabase
    .from("expositores")
    .select("id, nombre")
    .eq("evento_id", params.id);

  const expositorMap = new Map((expositores ?? []).map((e) => [e.id, e.nombre]));
  const expositorIds = (expositores ?? []).map((e) => e.id);

  const [productosResult, boletasResult] = await Promise.all([
    expositorIds.length
      ? supabase.from("productos").select("*").in("expositor_id", expositorIds).order("descripcion")
      : Promise.resolve({ data: [] as Tables<"productos">[] }),
    supabase
      .from("boletas")
      .select("*, profiles(nombre)")
      .eq("evento_id", params.id)
      .order("fecha", { ascending: false })
      .limit(30),
  ]);

  const productosConExpositor = (productosResult.data ?? []).map((p) => ({
    ...p,
    expositor_nombre: expositorMap.get(p.expositor_id) ?? "Desconocida",
  }));

  const boletas = (boletasResult.data ?? []).map((b) => {
    const { profiles, ...rest } = b as typeof b & { profiles: { nombre: string } | null };
    return { ...rest, profile_nombre: profiles?.nombre ?? null };
  });

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl">Ventas</h1>
        <p className="text-sm text-ink-muted mt-0.5">Registra ventas y emite boletas.</p>
      </div>

      <BoletaBuilder eventoId={params.id} productos={productosConExpositor} />

      <div className="mt-8">
        <h2 className="text-lg mb-3">Boletas recientes</h2>
        <BoletasHistory boletas={boletas} />
      </div>
    </main>
  );
}
