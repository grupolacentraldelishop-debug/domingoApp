# Dominga App

Aplicación web (con instalación tipo app de celular) para gestionar de principio a fin los **pop-ups de Dominga**, el marketplace de marcas locales de Guayaquil que trabaja en consignación.

La app reemplaza el flujo manual de hojas de cálculo y mensajes de WhatsApp: centraliza las marcas, el inventario, las ventas en tiempo real y la liquidación final de cada evento, evitando vender stock que ya no existe y calculando automáticamente cuánto le toca a cada marca y cuánto a Dominga.

---

## Índice

1. [¿Para qué sirve? (en palabras simples)](#para-qué-sirve)
2. [Conceptos del negocio que la app entiende](#conceptos-del-negocio)
3. [Funcionalidades, una por una](#funcionalidades)
4. [Cómo está construida (tecnología)](#cómo-está-construida)
5. [Cómo correr la aplicación en tu computadora](#cómo-correr-la-aplicación)
6. [Preguntas frecuentes y problemas comunes](#preguntas-frecuentes)

---

## ¿Para qué sirve?

Dominga organiza **eventos pop-up** donde varias marcas locales venden sus productos en un mismo espacio. Dominga no compra los productos: los recibe **en consignación** (la marca sigue siendo dueña hasta que se vende) y cobra una **comisión** por cada venta más un **fee fijo** por participar.

Durante el evento hay **varias vendedoras atendiendo al mismo tiempo**. El riesgo del método manual era vender el mismo producto dos veces o equivocarse en las cuentas. Esta app resuelve eso:

- Cada vendedora registra las ventas desde su celular.
- El stock se descuenta al instante y de forma segura (no se puede sobrevender).
- Al cerrar el evento, la app calcula **cuánto se le transfiere a cada marca** y cuánto gana Dominga, todo automático.
- Cuando un cliente pide factura, la app **captura sus datos** y genera un reporte aparte para pasarlos a Contifico (la app **no emite facturas**, solo recopila la información).

---

## Conceptos del negocio

Estos son los términos que vas a ver en toda la app. Entenderlos hace que el resto sea fácil:

| Término | Qué significa |
|---|---|
| **Evento (Pop-Up #N)** | Cada feria. Tiene fecha, lugar y un estado: *Planeación → En curso → Cerrado*. |
| **Expositor / Marca** | Una marca local que participa en el evento, en consignación. |
| **Comisión Dominga** | El porcentaje que Dominga se queda de cada venta. Por defecto **30%** (configurable por marca). |
| **Fee de participación** | Cargo fijo por participar en el evento. Por defecto **$50** por marca (configurable). |
| **Pago de envío** | Costo de envío que se le descuenta a la marca en la liquidación, si aplica. |
| **IVA 15%** | Impuesto de Ecuador. Si la marca maneja IVA, el precio de venta (PVP) **ya lo incluye**. |
| **PVP** | Precio de Venta al Público: lo que paga el cliente. |
| **Producto (SKU)** | Se maneja **agrupado por código/tipo**, no unidad por unidad. Cada producto tiene una cantidad total y un contador de vendidos. |
| **Boleta** | Una venta completa. Es la "cabecera" y puede tener varios productos adentro. |
| **Venta (línea)** | Cada producto dentro de una boleta. Es la base de todos los reportes por marca. |
| **Liquidación** | El cálculo final por marca al cerrar el evento: *margen de la marca − fee − envío*. |

### Cómo se reparte el dinero

Por cada producto vendido:

- **Margen de la marca** = PVP × (100% − comisión Dominga). Ej.: con comisión 30%, la marca recibe el 70%.
- **Margen de Dominga** = PVP × comisión. Ej.: el 30%.
- Si la marca **tiene IVA**, el PVP se desglosa primero (precio base + IVA 15%) y el reparto 70/30 se aplica sobre el total.

### La liquidación final por marca

```
Valor a transferir a la marca = (suma de sus márgenes) − fee de participación − pago de envío
```

- Si el resultado es **negativo**, la app muestra **$0** a transferir, pero deja registrado el **saldo deudor** (la marca quedó debiendo).
- Si la marca ya pagó su fee por adelantado (estado *pagado*), el fee **no se vuelve a descontar**.
- Las boletas **anuladas no cuentan** en la liquidación.

> Importante: todas estas cuentas se hacen en la base de datos automáticamente, así que los números siempre cuadran sin importar quién registró la venta.

---

## Funcionalidades

### 1. Acceso y cuentas de usuario
- **Inicio de sesión por enlace mágico**: escribes tu correo y recibes un enlace para entrar sin contraseña. Ideal para las vendedoras durante el evento.
- **Inicio de sesión con contraseña**: alternativa clásica con correo y clave.
- **Roles**: *owner* (Doménica, ve y controla todo, incluida la información financiera sensible) y *colaborador* (vendedoras invitadas a un evento puntual, pueden registrar ventas y ver inventario, pero **no** ven gastos ni liquidaciones).
- La seguridad está aplicada a nivel de base de datos: cada persona solo ve los datos de los eventos a los que pertenece.

### 2. Gestión de eventos
- Crear un evento con nombre, fechas, lugar y descripción.
- Ver el listado de todos los eventos y su estado.
- Pantalla de resumen por evento con **3 indicadores clave**: número de marcas, ventas totales y total que le corresponde a Dominga.
- Desde el evento se accede a sus 4 módulos: Marcas, Inventario, Ventas y Reportes.

### 3. Marcas / Expositores
- Agregar marcas al evento con su configuración propia: si maneja **IVA**, su **comisión**, su **fee** y su **pago de envío**.
- Estado de cada marca: *pendiente*, *confirmado* o *pagado*.
- Si cambias el IVA o la comisión de una marca, **todos sus productos se recalculan solos**.

### 4. Inventario
- Registrar productos por marca: código (opcional), descripción, PVP y cantidad.
- La app calcula y guarda automáticamente el precio base, IVA, margen de la marca y margen de Dominga de cada producto.
- Control de stock: muestra disponibles (cantidad − vendidos) y **no permite registrar más vendidos que el stock**.
- **Carga masiva con Inteligencia Artificial**: subes el archivo de inventario de la marca (**PDF, Excel o CSV**) y la app usa IA (Claude) para leerlo, extraer los productos, ajustar precios con IVA si corresponde y avisarte de discrepancias. Tú revisas el resultado antes de confirmar la importación. Esto ahorra horas de digitación.

### 5. Ventas (el corazón durante el evento)
- **Armador de boletas**: la vendedora elige productos, indica cantidades y arma la venta.
- Elige el **método de pago** (efectivo, tarjeta o transferencia).
- Si el cliente **pide factura**, captura sus datos (identificación, razón social, correo, dirección, teléfono) para el reporte de Contifico.
- **Registro a prueba de errores**: al confirmar, la app bloquea cada producto, verifica el stock y descuenta todo en una sola operación. Si un producto se quedó sin stock, **cancela la boleta completa** y avisa. Esto evita vender de más cuando hay varias vendedoras a la vez.
- **Historial de boletas** del evento, con detalle de cada una.
- **Anulación de boletas**: si una venta fue un error, se anula y el **stock se devuelve automáticamente**; la venta deja de contar en los reportes.

### 6. Reportes y liquidación
- **Liquidación por marca**: cuánto vendió cada marca, su margen, y el valor exacto a transferir (con saldos deudores cuando aplica).
- **Gastos del evento**: registrar costos del pop-up (solo visible para el owner).
- **Exportar a CSV**:
  - Reporte de **ventas totales**.
  - Reporte de **ventas con datos de facturación**, para pasar manualmente a Contifico.

---

## Cómo está construida

No necesitas entender esto para usar la app, pero ayuda si alguien técnico te asiste:

- **Next.js 14** (framework de páginas web) con **TypeScript**.
- **TailwindCSS** para el diseño, pensado **mobile-first** (se ve bien en un iPhone pequeño).
- **PWA**: se puede "instalar" en el celular como si fuera una app nativa.
- **Supabase** para la base de datos, el inicio de sesión, los permisos y el tiempo real. Toda la lógica financiera vive aquí (en la base de datos), para que los números nunca dependan del dispositivo.
- **Claude (Anthropic)** para la lectura inteligente de archivos de inventario.
- **Vercel** para publicar la app en internet.

---

## Cómo correr la aplicación

Esta sección es paso a paso para alguien que **no programa**. La idea es levantar la app en tu propia computadora para probarla.

### Paso 0 — Lo que necesitas tener instalado
1. **Una computadora** (Mac o Windows).
2. **Bun** (la herramienta que ejecuta el proyecto). Para instalarlo, abre la app **Terminal** y pega esto:
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```
   *(En Windows usa la Terminal de PowerShell y sigue las instrucciones en https://bun.sh).*
3. Las **claves de acceso** (Supabase y Anthropic). Estas son secretas y te las pasa quien administra el proyecto. **Nunca las compartas públicamente.**

### Paso 1 — Abrir la carpeta del proyecto
En la Terminal, entra a la carpeta del proyecto:
```bash
cd "/Users/domenicacepeda/Desktop/Dominga/Claude Dominga"
```

### Paso 2 — Instalar las piezas del proyecto
Esto descarga todo lo que la app necesita para funcionar (se hace una sola vez, o cuando hay cambios):
```bash
bun install
```

### Paso 3 — Configurar las claves secretas
La app necesita un archivo llamado **`.env.local`** en la carpeta del proyecto, con estas 4 líneas (los valores reales te los entrega el administrador):

```bash
NEXT_PUBLIC_SUPABASE_URL=...          # dirección de la base de datos
NEXT_PUBLIC_SUPABASE_ANON_KEY=...     # clave pública de Supabase
SUPABASE_SERVICE_ROLE_KEY=...         # clave privada de Supabase (secreta)
ANTHROPIC_API_KEY=...                 # clave para la lectura de archivos con IA
```

> Si este archivo ya existe en la carpeta, probablemente ya está configurado y puedes saltar este paso. **No subas este archivo a internet ni lo compartas**: contiene secretos.

### Paso 4 — Encender la app
```bash
bun run dev
```
Cuando termine, verás un mensaje con una dirección, normalmente:
```
http://localhost:3000
```
Abre esa dirección en tu navegador (Chrome, Safari, etc.) y la app estará funcionando. Para **apagarla**, vuelve a la Terminal y presiona `Ctrl + C`.

### Otros comandos útiles
| Comando | Para qué sirve |
|---|---|
| `bun run dev` | Encender la app en modo desarrollo (lo del día a día). |
| `bun run build` | Preparar la versión optimizada para publicar. |
| `bun run start` | Correr la versión ya construida. |
| `bun run lint` | Revisar que el código esté ordenado. |
| `bun run typecheck` | Verificar que no haya errores de tipos. |
| `bun test` | Correr las pruebas automáticas (incluye las del cálculo financiero). |

---

## Preguntas frecuentes

**¿La app emite facturas?**
No. Solo **captura los datos** del cliente cuando pide factura y genera un reporte (CSV) para que se ingresen manualmente en Contifico.

**¿Qué pasa si dos vendedoras venden el último producto al mismo tiempo?**
Solo una lo logra. La app bloquea el producto durante el registro; la segunda venta se cancela y avisa que no hay stock. No se puede sobrevender.

**Anulé una boleta por error de un cliente, ¿se recupera el stock?**
Sí. Al anular, las unidades vuelven al inventario y la venta deja de contar en los reportes y la liquidación.

**¿Por qué una marca aparece con $0 a transferir?**
Porque su margen no alcanzó a cubrir el fee y el envío. En ese caso queda un **saldo deudor** registrado: la marca quedó debiendo, no recibe transferencia.

**Cambié la comisión de una marca a mitad de evento, ¿se actualizan sus productos?**
Sí, automáticamente. Pero las **ventas ya registradas mantienen los valores del momento de la venta** (no se alteran los históricos).

**No me carga la app / da error al iniciar.**
Verifica: (1) que corriste `bun install`, (2) que el archivo `.env.local` existe y tiene las 4 claves, (3) que no haya otra app usando el puerto 3000. Si el problema persiste, comparte el mensaje de error con quien te apoya técnicamente.
