import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";
import { GastosPanel } from "@/components/reportes/GastosPanel";
import { LiquidacionCard } from "@/components/reportes/LiquidacionCard";
import { ExportCSV } from "@/components/reportes/ExportCSV";

export default async function ReportesPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [
    { data: liquidaciones },
    { data: gastos },
    { data: boletas },
    { data: facturacion },
  ] = await Promise.all([
    supabase
      .from("liquidacion_marca")
      .select("*")
      .eq("evento_id", params.id)
      .order("nombre"),
    supabase
      .from("gastos")
      .select("*")
      .eq("evento_id", params.id)
      .order("fecha", { ascending: false }),
    supabase
      .from("boletas")
      .select("id, total_pvp, total_dominga, metodo_pago, fecha")
      .eq("evento_id", params.id),
    supabase
      .from("ventas_con_datos_facturacion")
      .select("*")
      .eq("evento_id", params.id)
      .order("fecha", { ascending: false }),
  ]);

  const liqs = liquidaciones ?? [];
  const gs = gastos ?? [];
  const bs = boletas ?? [];

  const totalVentas = bs.reduce((acc, b) => acc + (b.total_pvp ?? 0), 0);
  const totalDominga = liqs.reduce((acc, l) => acc + (l.total_margen_dominga ?? 0), 0);
  const totalGastos = gs.reduce((acc, g) => acc + g.monto, 0);
  const utilidadNeta = totalDominga - totalGastos;

  const ventasPorMetodo: Record<string, number> = {};
  bs.forEach((b) => {
    ventasPorMetodo[b.metodo_pago] = (ventasPorMetodo[b.metodo_pago] ?? 0) + (b.total_pvp ?? 0);
  });

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="text-2xl">Reportes</h1>
        <p className="text-sm text-ink-muted mt-0.5">{bs.length} boletas emitidas</p>
      </div>

      {/* Métricas principales */}
      <section>
        <h2 className="text-lg mb-3">Resumen financiero</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total ventas" value={formatMoney(totalVentas)} />
          <StatCard label="Ingresos Dominga" value={formatMoney(totalDominga)} highlight />
          <StatCard label="Total gastos" value={formatMoney(totalGastos)} />
          <StatCard
            label="Utilidad neta"
            value={formatMoney(utilidadNeta)}
            highlight={utilidadNeta > 0}
            negative={utilidadNeta < 0}
          />
        </div>

        {Object.keys(ventasPorMetodo).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(ventasPorMetodo).map(([metodo, total]) => (
              <span key={metodo} className="text-sm bg-cream-100 px-3 py-1 rounded">
                {metodo}: <strong>{formatMoney(total)}</strong>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Gastos */}
      <section>
        <h2 className="text-lg mb-3">Gastos</h2>
        <div className="max-w-lg">
          <GastosPanel eventoId={params.id} gastos={gs} />
        </div>
      </section>

      {/* Liquidación por marca */}
      <section>
        <h2 className="text-lg mb-3">Liquidación por marca</h2>
        {liqs.length === 0 ? (
          <p className="text-sm text-ink-muted">Sin marcas en este evento.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {liqs.map((liq) => (
              <LiquidacionCard key={liq.expositor_id} liq={liq} />
            ))}
          </div>
        )}
      </section>

      {/* Ventas con datos de facturación */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg">Ventas con datos de facturación</h2>
          {(facturacion ?? []).length > 0 && (
            <ExportCSV rows={facturacion ?? []} />
          )}
        </div>

        {(facturacion ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">
            Ninguna venta con datos de facturación registrada.
          </p>
        ) : (
          <div className="space-y-2">
            {(facturacion ?? []).map((f) => (
              <div key={f.boleta_id} className="card text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {f.cliente_razon_social ?? "—"}{" "}
                      {f.cliente_identificacion && (
                        <span className="text-ink-muted">({f.cliente_identificacion})</span>
                      )}
                    </p>
                    <p className="text-xs text-ink-subtle">
                      {f.cliente_email} · {f.cliente_telefono} · {f.cliente_direccion}
                    </p>
                  </div>
                  <p className="font-semibold shrink-0">{formatMoney(f.total_pvp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  highlight,
  negative,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="card">
      <p className="label text-xs">{label}</p>
      <p
        className={
          negative
            ? "text-xl font-bold mt-1 text-rose-600"
            : highlight
            ? "text-xl font-bold mt-1 text-emerald-700"
            : "text-xl font-semibold mt-1"
        }
      >
        {value}
      </p>
    </div>
  );
}
