import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";
import { ExpositoresClient } from "@/components/expositores/ExpositoresClient";

export default async function ExpositoresPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: expositores } = await supabase
    .from("expositores")
    .select("*, productos(id)")
    .eq("evento_id", params.id)
    .order("nombre");

  const list = expositores ?? [];
  const confirmados = list.filter((e) => e.estado === "confirmado" || e.estado === "pagado").length;
  const feeTotal = list.reduce((acc, e) => acc + (e.fee_participacion ?? 0), 0);
  const feePagado = list
    .filter((e) => e.estado === "pagado")
    .reduce((acc, e) => acc + (e.fee_participacion ?? 0), 0);

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl">Marcas</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          {list.length} {list.length === 1 ? "marca registrada" : "marcas registradas"} en este evento
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total marcas" value={String(list.length)} />
        <StatCard label="Confirmadas" value={String(confirmados)} />
        <StatCard label="Fee total" value={formatMoney(feeTotal)} />
        <StatCard label="Fee cobrado" value={formatMoney(feePagado)} />
      </div>

      <ExpositoresClient eventoId={params.id} expositores={list} />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="label text-xs">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}
