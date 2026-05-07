import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";
import { InventarioClient } from "@/components/inventario/InventarioClient";

export default async function InventarioPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: expositores } = await supabase
    .from("expositores")
    .select("id, nombre, comision_dominga, tiene_iva")
    .eq("evento_id", params.id)
    .order("nombre");

  const expositorIds = (expositores ?? []).map((e) => e.id);

  const { data: productos } = expositorIds.length
    ? await supabase
        .from("productos")
        .select("*")
        .in("expositor_id", expositorIds)
        .order("descripcion")
    : { data: [] };

  const list = productos ?? [];
  const totalSkus = list.length;
  const totalUnidades = list.reduce((acc, p) => acc + p.cantidad, 0);
  const totalVendidos = list.reduce((acc, p) => acc + p.vendidos, 0);
  const valorStock = list.reduce((acc, p) => acc + p.pvp * (p.cantidad - p.vendidos), 0);

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl">Inventario</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          {totalSkus} SKU{totalSkus !== 1 ? "s" : ""} en este evento
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total SKUs" value={String(totalSkus)} />
        <StatCard label="Unidades totales" value={String(totalUnidades)} />
        <StatCard label="Vendidas" value={String(totalVendidos)} />
        <StatCard label="Valor disponible" value={formatMoney(valorStock)} />
      </div>

      <InventarioClient
        eventoId={params.id}
        expositores={expositores ?? []}
        productos={list}
      />
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
