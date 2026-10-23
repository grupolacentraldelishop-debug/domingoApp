# CLAUDE.md — Guía completa para Claude Code

Este archivo documenta la aplicación Dominga para que cualquier sesión de Claude Code pueda entender el proyecto completo sin necesidad de preguntar.

---

## Qué hace esta aplicación y por qué existe

Dominga organiza **eventos pop-up de retail** en Guayaquil (Ecuador) donde varias marcas locales venden en consignación. Hasta ahora el flujo era manual: hojas de cálculo + WhatsApp. Con 11+ marcas y varias vendedoras atendiendo al mismo tiempo, el método manual generaba errores de stock y cálculos incorrectos de liquidación.

Esta app reemplaza ese flujo:
- Durante el evento, cada vendedora registra ventas desde su celular
- El stock se descuenta atómicamente (no se puede sobrevender aunque dos personas vendan el mismo ítem a la vez)
- Al cierre, la app calcula automáticamente cuánto le corresponde a cada marca y cuánto a Dominga

La dueña es **Doménica Cepeda** (`domenicacepedanogales@gmail.com`). La app está en producción en `https://dominga-app.vercel.app`.

---

## Modelo de negocio (fuente de verdad financiera)

Estas reglas determinan toda la lógica de cálculo. No inventar variantes.

### Reparto por venta

```
margen_dominga = pvp × (comision_dominga / 100)
margen_marca   = pvp × (1 - comision_dominga / 100)
```

- Si la marca **tiene IVA 15%**: el PVP ya lo incluye. Se desglosa `precio_base = pvp / 1.15`, `iva_unitario = pvp - precio_base`. El reparto sigue aplicándose sobre el PVP completo.
- Todos los valores monetarios se redondean a 2 decimales (`Math.round(n * 100) / 100`).
- Defaults por evento: comisión 30%, fee $50, envío $0.

### Liquidación final por marca

```
balance_real      = total_margen_marca - fee_participacion (si no está pagado) - pago_envio
valor_a_transferir = max(0, balance_real)
```

- Si `estado = 'pagado'` → el fee ya fue cobrado de antemano, **no** se descuenta del balance.
- Si el balance es negativo, se muestra `$0.00` a transferir pero se registra el saldo deudor.
- Las boletas anuladas no cuentan en ningún cálculo.

### Réplica TypeScript

`lib/calculos.ts` replica esta lógica para previews en formularios. La fuente de verdad es la base de datos (triggers). Si hay divergencia, gana la DB.

---

## Stack y versiones

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 14.2.30 |
| Lenguaje | TypeScript | 5.6.x, estricto |
| Estilos | TailwindCSS | 3.4.x |
| DB / Auth / Realtime | Supabase (PostgreSQL + RLS) | `@supabase/ssr` 0.10.x |
| IA (bulk import) | Anthropic Claude API | `anthropic` SDK, `@anthropic-ai/sdk` |
| Parseo archivos | xlsx + papaparse | — |
| PDF | jspdf + jspdf-autotable | 4.x / 5.x |
| Forms | react-hook-form + zod | — |
| Iconos | lucide-react | 0.460.x |
| Runtime | Bun | 1.x |
| PWA | next-pwa | 5.6.x |
| Deploy | Vercel | — |
| Test | Bun test | — |

---

## Estructura de carpetas

```
/
├── app/
│   ├── (auth)/              # Rutas públicas: login y signup
│   │   ├── login/
│   │   │   ├── page.tsx         # Server Component wrapper con <Suspense>
│   │   │   └── LoginClient.tsx  # Client Component con la UI real
│   │   └── signup/
│   │       └── page.tsx
│   ├── (app)/               # Rutas protegidas (requieren sesión)
│   │   ├── layout.tsx           # Header + EventoSelector
│   │   └── eventos/
│   │       ├── page.tsx         # Lista de eventos del owner
│   │       ├── nuevo/page.tsx   # Crear evento
│   │       └── [id]/
│   │           ├── layout.tsx       # Nav por tabs del evento
│   │           ├── page.tsx         # Dashboard/resumen del evento
│   │           ├── expositores/     # Módulo Marcas
│   │           ├── inventario/      # Módulo Inventario
│   │           ├── ventas/          # Módulo Ventas
│   │           └── reportes/        # Módulo Reportes + Liquidación
│   ├── actions/             # Server Actions (lógica de escritura)
│   │   ├── auth.ts          ├── eventos.ts  ├── expositores.ts
│   │   ├── productos.ts     ├── ventas.ts   ├── gastos.ts
│   │   └── importar.ts          # Bulk import con IA (Claude API)
│   ├── auth/callback/       # Route handler para magic links
│   └── globals.css
├── components/
│   ├── ui/                  # Header, EventoNav, EventoSelector
│   ├── eventos/             # EventoForm
│   ├── expositores/         # ExpositorCard, ExpositorFormModal, ExpositoresClient
│   ├── inventario/          # InventarioClient, ProductoCard, ProductoFormModal, BulkImportModal
│   ├── ventas/              # BoletaBuilder, BoletasHistory, BoletaDetalleModal
│   └── reportes/            # LiquidacionCard, GastosPanel, ExportCSV, ReporteMarcaDescargas
├── lib/
│   ├── calculos.ts          # Réplica TS de triggers financieros (solo para UI)
│   ├── reporte-marca.ts     # Arma el reporte por marca: ventas agrupadas + inventario sobrante
│   ├── reporte-marca-archivos.ts # Genera PDF (jspdf) y Excel (xlsx) del reporte; se importa dinámicamente
│   ├── utils.ts             # Helpers genéricos (cn, formatCurrency, etc.)
│   └── supabase/
│       ├── client.ts        # createBrowserClient (Client Components)
│       ├── server.ts        # createServerClient (Server Components / Actions)
│       ├── middleware.ts    # updateSession para refrescar cookies
│       └── types.ts         # Tipos auto-generados de Supabase (no editar a mano)
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql              # Schema completo, triggers, RPC, vistas, RLS
│   │   ├── 0002_fix_liquidacion_fee_pagado.sql
│   │   ├── 0003_boleta_estado_anulacion.sql
│   │   └── 0004_facturacion_excluir_anuladas.sql
│   └── seed.sql             # Pop-Up #4 + 11 marcas iniciales (idempotente)
├── __tests__/
│   ├── calculos.test.ts     # 100% cobertura de lib/calculos.ts con bun test
│   └── reporte-marca.test.ts
├── public/
│   ├── manifest.json        # PWA manifest
│   ├── icon-192.png
│   └── icon-512.png
├── assets/
│   └── Dominga Manual de Marca.pdf
├── middleware.ts            # Protección de rutas vía Supabase session
└── next.config.mjs          # Config Next.js + next-pwa
```

---

## Variables de entorno requeridas

Nunca commitear valores. Crear `.env.local` con estas claves:

```bash
NEXT_PUBLIC_SUPABASE_URL=         # URL del proyecto Supabase (pública)
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Anon key de Supabase (pública, se expone al cliente)
SUPABASE_SERVICE_ROLE_KEY=        # Service role key (PRIVADA, solo server-side)
ANTHROPIC_API_KEY=                # API key de Anthropic para bulk import
```

El proyecto Supabase en producción es `snmhninlktyooswnuihi`.

---

## Comandos para correr en local

```bash
bun install          # instalar dependencias
bun run dev          # servidor de desarrollo en localhost:3000
bun run build        # build de producción
bun run typecheck    # verificar TypeScript sin emitir
bun run lint         # ESLint
bun test             # tests unitarios (calculos.test.ts)
```

---

## Base de datos — schema resumido

Tablas principales (todas con RLS activado):

| Tabla | Propósito |
|---|---|
| `profiles` | Extiende `auth.users`. Tiene `rol: 'owner' | 'colaborador'`. |
| `eventos` | Cada pop-up. `owner_id` FK a profiles. Estados: `planeacion / en_curso / cerrado`. |
| `evento_colaboradores` | Vendedoras invitadas a un evento (relación M:M). |
| `expositores` | Marcas en un evento. Tiene `tiene_iva`, `comision_dominga`, `fee_participacion`, `pago_envio`, `estado`. |
| `productos` | SKUs de una marca. Columnas calculadas por trigger: `precio_base`, `iva_unitario`, `margen_marca`, `margen_dominga`. Constraint: `vendidos <= cantidad`. |
| `boletas` | Cabecera de una venta. Tiene `metodo_pago`, `pide_factura`, datos del cliente para factura, `estado: 'registrada' | 'anulada'`. |
| `ventas` | Líneas de una boleta. Cachea `margen_marca` y `margen_dominga` al momento de la venta. |
| `gastos` | Gastos del evento (solo visibles para owner). |

Vistas: `liquidacion_marca`, `ventas_con_datos_facturacion`.

RPC transaccional: `registrar_boleta(p_evento_id, p_metodo_pago, ...)` — registra la boleta y todas sus líneas en una sola transacción, verificando y decrementando stock atómicamente. Si falta stock en cualquier ítem, hace rollback completo.

---

## Decisiones de arquitectura

### 1. Lógica financiera en DB (triggers), no en el cliente
Los triggers en PostgreSQL calculan `margen_marca`, `margen_dominga`, `precio_base`, `iva_unitario` al insertar/actualizar productos. Esto garantiza que los números son correctos sin importar quién usa la app o desde qué dispositivo. La réplica en `lib/calculos.ts` solo sirve para mostrar previews en formularios.

### 2. RPC transaccional para ventas (`registrar_boleta`)
Las mutaciones de ventas nunca se hacen como múltiples llamadas desde el cliente. Un solo RPC en PostgreSQL bloquea los productos, verifica stock y registra todo. Esto evita overselling cuando hay dos vendedoras actuando sobre el mismo SKU simultáneamente.

### 3. Server Components por defecto
Solo se usan Client Components donde hay estado de React, hooks o suscripciones Realtime. Todo lo demás es Server Component para reducir JS al cliente y mantener el bundle pequeño en móvil.

### 4. `<Suspense>` en la página de login
`LoginClient.tsx` usa `useSearchParams()`. Next.js 14 requiere que cualquier Client Component que use `useSearchParams` esté envuelto en `<Suspense>` dentro de un Server Component padre, o fallará el prerendering en build. `page.tsx` es el Server Component wrapper; `LoginClient.tsx` tiene toda la lógica.

### 5. Roles y RLS
- **owner**: ve todos sus eventos y puede hacer cualquier operación.
- **colaborador**: solo puede registrar boletas en los eventos a los que fue invitado. No ve reportes, gastos ni liquidaciones.
- Las políticas RLS están en `0001_init.sql`. Si cambias permisos, modifícalos ahí.

### 6. Tipos Supabase (`lib/supabase/types.ts`)
Generados con `supabase gen types typescript`. **No editar a mano.** Al hacer cambios al schema, regenerar con:
```bash
bunx supabase gen types typescript --project-id snmhninlktyooswnuihi > lib/supabase/types.ts
```

### 7. `typedRoutes` desactivado
`experimental.typedRoutes` fue desactivado en `next.config.mjs` porque genera errores `RouteImpl<string>` con rutas dinámicas construidas programáticamente (e.g., `` `/eventos/${id}/expositores` ``).

---

## Convenciones del código

- **TypeScript estricto**: `strict: true` + `noUncheckedIndexedAccess: true`. Sin `any`.
- **Sin comentarios obvios**: solo comentar el "por qué" cuando no es evidente (workarounds, invariantes ocultas). No explicar qué hace el código si los nombres ya lo dicen.
- **Código en inglés, comentarios en español**.
- **Sin emojis** en producción. Lucide React para iconografía.
- **Sin gradientes**. Paleta rosa/crema (`--color-rose-*`, `--color-cream-*`), tipografías Playfair Display + DM Sans.
- **Validación Zod** para cualquier input externo. Los schemas viven en `lib/validations.ts`.
- **`cn()`** de `lib/utils.ts` para concatenar clases de Tailwind condicionalmente.
- **Server Actions** en `app/actions/`. Siempre `"use server"`. Devuelven `{ error: string }` en caso de fallo, nunca lanzan excepciones al cliente.
- **Sin librerías de componentes pesadas** (no shadcn, no MUI). Solo componentes propios en `components/ui/`.

---

## Estado del proyecto

### Terminado y en producción
- Auth completo (magic link + contraseña)
- Gestión de eventos, marcas, inventario
- Módulo de ventas con protección de stock concurrente
- Reportes y liquidación por marca
- Reporte por marca descargable en PDF y Excel: ventas agrupadas por producto (con desglose de IVA informativo si la marca tiene IVA) e inventario sobrante para devolver
- Bulk import de inventario con IA (Claude)
- Anulación de boletas con devolución de stock
- Historial y detalle de boletas
- PWA instalable
- Deploy en Vercel + Supabase cloud

### Pendiente / no implementado
- **Retry offline**: si la conexión cae durante el evento, no hay cola de ventas pendientes. Se muestra error pero hay que reintentar manualmente.
- **Import CSV de inventario en bulk**: actualmente el bulk import lee el archivo con IA; no hay import directo por CSV estructurado.
- **Variables de entorno en Preview de Vercel**: solo están configuradas Production y Development. Preview requiere especificar un branch de git.

### Problemas conocidos / cosas frágiles
- **Duplicados en `expositores`**: el seed puede crear duplicados si se corre más de una vez sin chequear primero (aunque tiene protección `WHERE NOT EXISTS`). La app no previene agregar dos marcas con el mismo nombre en el mismo evento.
- **`lib/supabase/types.ts` puede quedar desactualizado**: si se aplican migraciones nuevas sin regenerar los tipos, TypeScript empieza a dar errores crípticos. Siempre regenerar después de una migración.
- **Realtime solo en ventas**: el stock se actualiza en tiempo real únicamente en la vista de Ventas. En Inventario y Reportes hay que refrescar manualmente para ver cambios de otras sesiones.
- **Rate limit de correos en Supabase plan free**: 3–4 correos por hora. Si se prueba con muchos correos en desarrollo, se alcanza rápido. Recomendado: desactivar confirmación de correo en Supabase → Auth → Providers → Email → "Confirm email: OFF".
