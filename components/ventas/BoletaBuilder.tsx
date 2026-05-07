"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Plus, Minus, CreditCard, Banknote, ArrowLeftRight, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/types";
import { formatMoney, cn } from "@/lib/utils";
import { registrarBoleta } from "@/app/actions/ventas";

type ProductoConExpositor = Tables<"productos"> & { expositor_nombre: string };

interface CartItem {
  productoId: string;
  descripcion: string;
  expositorNombre: string;
  pvp: number;
  margenMarca: number;
  margenDominga: number;
  cantidad: number;
}

interface Props {
  eventoId: string;
  productos: ProductoConExpositor[];
}

const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo", icon: Banknote },
  { value: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { value: "transferencia", label: "Transferencia", icon: ArrowLeftRight },
] as const;

export function BoletaBuilder({ eventoId, productos: initialProductos }: Props) {
  const [vendidos, setVendidos] = useState<Map<string, number>>(
    () => new Map(initialProductos.map((p) => [p.id, p.vendidos]))
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [metodoPago, setMetodoPago] = useState<string>("efectivo");
  const [pideFactura, setPideFactura] = useState(false);
  const [facturaId, setFacturaId] = useState("");
  const [facturaRazon, setFacturaRazon] = useState("");
  const [facturaEmail, setFacturaEmail] = useState("");
  const [facturaDir, setFacturaDir] = useState("");
  const [facturaTel, setFacturaTel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBoletaId, setSuccessBoletaId] = useState<string | null>(null);

  // Realtime: sync vendidos when other devices sell
  useEffect(() => {
    const supabase = createClient();
    const productIds = new Set(initialProductos.map((p) => p.id));

    const channel = supabase
      .channel(`stock-${eventoId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "productos" },
        (payload) => {
          const updated = payload.new as Tables<"productos">;
          if (productIds.has(updated.id)) {
            setVendidos((prev) => new Map(prev).set(updated.id, updated.vendidos));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventoId, initialProductos]);

  const disponibleFor = useCallback(
    (producto: ProductoConExpositor) =>
      producto.cantidad - (vendidos.get(producto.id) ?? producto.vendidos),
    [vendidos]
  );

  const filteredProductos = query.trim()
    ? initialProductos.filter(
        (p) =>
          p.descripcion.toLowerCase().includes(query.toLowerCase()) ||
          (p.codigo ?? "").toLowerCase().includes(query.toLowerCase()) ||
          p.expositor_nombre.toLowerCase().includes(query.toLowerCase())
      )
    : initialProductos.filter((p) => disponibleFor(p) > 0);

  function addToCart(p: ProductoConExpositor) {
    const disp = disponibleFor(p);
    if (disp <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.productoId === p.id);
      if (existing) {
        if (existing.cantidad >= disp) return prev;
        return prev.map((i) =>
          i.productoId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productoId: p.id,
          descripcion: p.descripcion,
          expositorNombre: p.expositor_nombre,
          pvp: p.pvp,
          margenMarca: p.margen_marca ?? 0,
          margenDominga: p.margen_dominga ?? 0,
          cantidad: 1,
        },
      ];
    });
    setQuery("");
  }

  function updateCartQty(productoId: string, delta: number) {
    setCart((prev) => {
      const item = prev.find((i) => i.productoId === productoId);
      if (!item) return prev;
      const producto = initialProductos.find((p) => p.id === productoId);
      const disp = producto ? disponibleFor(producto) : item.cantidad;
      const newQty = item.cantidad + delta;
      if (newQty <= 0) return prev.filter((i) => i.productoId !== productoId);
      if (newQty > disp) return prev;
      return prev.map((i) =>
        i.productoId === productoId ? { ...i, cantidad: newQty } : i
      );
    });
  }

  function removeFromCart(productoId: string) {
    setCart((prev) => prev.filter((i) => i.productoId !== productoId));
  }

  const totalPvp = cart.reduce((acc, i) => acc + i.pvp * i.cantidad, 0);
  const totalDominga = cart.reduce((acc, i) => acc + i.margenDominga * i.cantidad, 0);

  async function handleSubmit() {
    if (cart.length === 0) return;
    setError(null);
    setSubmitting(true);

    const result = await registrarBoleta({
      eventoId,
      metodoPago,
      cliente: pideFactura ? (facturaRazon || null) : null,
      pideFactura,
      clienteIdentificacion: pideFactura ? (facturaId || null) : null,
      clienteRazonSocial: pideFactura ? (facturaRazon || null) : null,
      clienteEmail: pideFactura ? (facturaEmail || null) : null,
      clienteDireccion: pideFactura ? (facturaDir || null) : null,
      clienteTelefono: pideFactura ? (facturaTel || null) : null,
      items: cart.map((i) => ({ producto_id: i.productoId, cantidad: i.cantidad })),
    });

    setSubmitting(false);

    if ("error" in result) {
      setError(result.error ?? "Error al registrar la venta");
      // Update vendidos from DB in case of stock conflict
      if (result.error?.includes("Stock insuficiente")) {
        setVendidos((prev) => {
          const next = new Map(prev);
          cart.forEach((item) => {
            const p = initialProductos.find((x) => x.id === item.productoId);
            if (p) next.set(p.id, p.vendidos);
          });
          return next;
        });
      }
    } else {
      setSuccessBoletaId(result.boletaId ?? null);
      // Optimistically update vendidos
      setVendidos((prev) => {
        const next = new Map(prev);
        cart.forEach((item) => {
          const current = next.get(item.productoId) ?? 0;
          next.set(item.productoId, current + item.cantidad);
        });
        return next;
      });
      setCart([]);
      setPideFactura(false);
      setFacturaId("");
      setFacturaRazon("");
      setFacturaEmail("");
      setFacturaDir("");
      setFacturaTel("");
    }
  }

  if (successBoletaId) {
    return (
      <div className="card text-center py-10">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <h2 className="text-xl mb-1">¡Venta registrada!</h2>
        <p className="text-sm text-ink-muted mb-4">Boleta #{successBoletaId.slice(-8).toUpperCase()}</p>
        <button className="btn-primary" onClick={() => setSuccessBoletaId(null)}>
          Nueva venta
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Product search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle w-4 h-4" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-9"
            placeholder="Buscar producto por nombre o código…"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {(query || filteredProductos.length > 0) && (
          <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
            {filteredProductos.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-3">
                {query ? "Sin resultados" : "No hay productos disponibles"}
              </p>
            ) : (
              filteredProductos.map((p) => {
                const disp = disponibleFor(p);
                const inCart = cart.find((i) => i.productoId === p.id);
                const outOfStock = disp <= 0;
                return (
                  <button
                    key={p.id}
                    disabled={outOfStock}
                    onClick={() => addToCart(p)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded text-left text-sm transition-colors",
                      outOfStock
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-cream-100"
                    )}
                  >
                    <div>
                      <p className="font-medium">{p.descripcion}</p>
                      <p className="text-xs text-ink-subtle">{p.expositor_nombre}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-semibold">{formatMoney(p.pvp)}</p>
                      <p className={cn("text-xs", outOfStock ? "text-rose-500" : "text-ink-subtle")}>
                        {outOfStock ? "Sin stock" : `${disp} disp.`}
                        {inCart ? ` · ${inCart.cantidad} en boleta` : ""}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Cart */}
      {cart.length > 0 && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-sm text-ink-muted uppercase tracking-wide">
            Boleta — {cart.length} {cart.length === 1 ? "ítem" : "ítems"}
          </h3>

          {cart.map((item) => (
            <div key={item.productoId} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.descripcion}</p>
                <p className="text-xs text-ink-subtle">{item.expositorNombre}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => updateCartQty(item.productoId, -1)}
                  className="btn-secondary h-7 w-7 px-0"
                >
                  <Minus size={13} />
                </button>
                <span className="w-5 text-center text-sm font-semibold">{item.cantidad}</span>
                <button
                  onClick={() => updateCartQty(item.productoId, 1)}
                  className="btn-secondary h-7 w-7 px-0"
                >
                  <Plus size={13} />
                </button>
              </div>
              <p className="w-16 text-right text-sm font-semibold shrink-0">
                {formatMoney(item.pvp * item.cantidad)}
              </p>
              <button
                onClick={() => removeFromCart(item.productoId)}
                className="text-ink-subtle hover:text-rose-500"
              >
                <X size={16} />
              </button>
            </div>
          ))}

          <div className="pt-2 border-t border-line flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatMoney(totalPvp)}</span>
          </div>
          <div className="flex justify-between text-xs text-ink-subtle">
            <span>Comisión Dominga</span>
            <span>{formatMoney(totalDominga)}</span>
          </div>
        </div>
      )}

      {/* Payment method */}
      {cart.length > 0 && (
        <div className="card space-y-4">
          <div>
            <p className="label mb-2">Método de pago</p>
            <div className="flex gap-2">
              {METODOS_PAGO.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setMetodoPago(value)}
                  className={cn(
                    "flex-1 btn text-sm",
                    metodoPago === value ? "btn-primary" : "btn-secondary"
                  )}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pideFactura}
                onChange={(e) => setPideFactura(e.target.checked)}
                className="h-4 w-4 rounded border-line accent-rose-600"
              />
              <span className="text-sm">El cliente pide datos para factura</span>
            </label>
          </div>

          {pideFactura && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">RUC / Cédula</label>
                  <input
                    value={facturaId}
                    onChange={(e) => setFacturaId(e.target.value)}
                    className="input mt-1"
                    placeholder="0991234567001"
                  />
                </div>
                <div>
                  <label className="label">Razón social</label>
                  <input
                    value={facturaRazon}
                    onChange={(e) => setFacturaRazon(e.target.value)}
                    className="input mt-1"
                    placeholder="Nombre o empresa"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={facturaEmail}
                    onChange={(e) => setFacturaEmail(e.target.value)}
                    className="input mt-1"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="label">Teléfono</label>
                  <input
                    value={facturaTel}
                    onChange={(e) => setFacturaTel(e.target.value)}
                    className="input mt-1"
                    placeholder="09..."
                  />
                </div>
              </div>
              <div>
                <label className="label">Dirección</label>
                <input
                  value={facturaDir}
                  onChange={(e) => setFacturaDir(e.target.value)}
                  className="input mt-1"
                  placeholder="Av. Principal 123"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || cart.length === 0}
            className="btn-primary w-full h-12 text-base"
          >
            {submitting ? "Registrando…" : `Confirmar venta · ${formatMoney(totalPvp)}`}
          </button>
        </div>
      )}

      {cart.length === 0 && (
        <p className="text-center text-sm text-ink-muted py-8">
          Busca un producto para comenzar la boleta.
        </p>
      )}
    </div>
  );
}
