-- =====================================================================
-- Dominga App - Migración inicial
-- Crea schema completo: tablas, triggers de cálculo financiero,
-- RPC transaccional para registrar boletas, vistas de reporte y RLS.
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- TABLAS
-- =====================================================================

-- Perfiles (extiende auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null,
  rol text not null default 'owner' check (rol in ('owner', 'colaborador')),
  created_at timestamptz not null default now()
);

-- Eventos (Pop-Up #N)
create table eventos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  nombre text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  lugar text,
  descripcion text,
  estado text not null default 'planeacion'
    check (estado in ('planeacion','en_curso','cerrado')),
  created_at timestamptz not null default now()
);

-- Colaboradores invitados a un evento (vendedoras durante el pop-up)
create table evento_colaboradores (
  evento_id uuid not null references eventos(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (evento_id, profile_id)
);

-- Expositores (marcas en consignación)
create table expositores (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  nombre text not null,
  estado text not null default 'pendiente'
    check (estado in ('pagado','confirmado','pendiente')),
  tiene_iva boolean not null default false,
  comision_dominga numeric(5,2) not null default 30
    check (comision_dominga >= 0 and comision_dominga <= 100),
  fee_participacion numeric(10,2) not null default 50
    check (fee_participacion >= 0),
  pago_envio numeric(10,2) not null default 0
    check (pago_envio >= 0),
  notas text,
  created_at timestamptz not null default now()
);

-- Productos (SKU agrupado, no por unidad)
create table productos (
  id uuid primary key default gen_random_uuid(),
  expositor_id uuid not null references expositores(id) on delete cascade,
  codigo text,
  descripcion text not null,
  pvp numeric(10,2) not null check (pvp > 0),
  cantidad int not null default 1 check (cantidad >= 0),
  vendidos int not null default 0 check (vendidos >= 0),
  -- Calculados por trigger; cacheados para reportes rápidos
  precio_base numeric(10,2),
  iva_unitario numeric(10,2),
  margen_marca numeric(10,2),
  margen_dominga numeric(10,2),
  created_at timestamptz not null default now(),
  constraint vendidos_lte_cantidad check (vendidos <= cantidad)
);

-- Boletas (cabecera de venta — 1 a N items)
create table boletas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  registrado_por uuid references profiles(id) on delete set null, -- preserva histórico si se borra el profile
  metodo_pago text not null check (metodo_pago in ('efectivo','tarjeta','transferencia')),
  cliente text not null default 'Consumidor final',
  -- Datos para Contifico cuando el cliente pide factura
  pide_factura boolean not null default false,
  cliente_identificacion text,
  cliente_razon_social text,
  cliente_email text,
  cliente_direccion text,
  cliente_telefono text,
  total_pvp numeric(10,2) not null default 0,
  total_marca numeric(10,2) not null default 0,
  total_dominga numeric(10,2) not null default 0,
  fecha timestamptz not null default now()
);

-- Ventas (línea por producto en una boleta).
-- pvp/margen_marca/margen_dominga son TOTALES de la línea (= unitario × cantidad).
-- Se preservan al momento de la venta para inmunizar históricos contra cambios futuros.
create table ventas (
  id uuid primary key default gen_random_uuid(),
  boleta_id uuid not null references boletas(id) on delete cascade,
  evento_id uuid not null references eventos(id) on delete cascade,
  expositor_id uuid not null references expositores(id),
  producto_id uuid not null references productos(id),
  descripcion text not null,
  cantidad int not null default 1 check (cantidad > 0),
  pvp_unitario numeric(10,2) not null,
  pvp numeric(10,2) not null,
  margen_marca_unitario numeric(10,2) not null,
  margen_marca numeric(10,2) not null,
  margen_dominga_unitario numeric(10,2) not null,
  margen_dominga numeric(10,2) not null,
  created_at timestamptz not null default now()
);

-- Gastos del evento
create table gastos (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos(id) on delete cascade,
  concepto text not null,
  monto numeric(10,2) not null check (monto > 0),
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- ÍNDICES
-- =====================================================================

create index productos_expositor_idx on productos(expositor_id);
create index productos_codigo_idx on productos(codigo) where codigo is not null;
create index productos_disponibles_idx on productos(expositor_id)
  where (cantidad - vendidos) > 0;
create index ventas_evento_expositor_idx on ventas(evento_id, expositor_id);
create index ventas_boleta_idx on ventas(boleta_id);
create index boletas_evento_fecha_idx on boletas(evento_id, fecha desc);
create index boletas_pide_factura_idx on boletas(evento_id) where pide_factura = true;
create index gastos_evento_idx on gastos(evento_id);
create index expositores_evento_idx on expositores(evento_id);
create index evento_colab_profile_idx on evento_colaboradores(profile_id);

-- =====================================================================
-- TRIGGERS DE CÁLCULO FINANCIERO
-- =====================================================================

-- IVA Ecuador 15%. Si el expositor tiene IVA, el PVP ya lo incluye.
-- El IVA se reparte en la misma proporción comisión Dominga / margen marca.
create or replace function calc_margenes_producto() returns trigger
language plpgsql
as $$
declare
  v_tiene_iva boolean;
  v_comision numeric;
  v_factor_dominga numeric;
  v_factor_marca numeric;
begin
  select tiene_iva, comision_dominga
    into v_tiene_iva, v_comision
  from expositores
  where id = new.expositor_id;

  v_factor_dominga := v_comision / 100;
  v_factor_marca := 1 - v_factor_dominga;

  if v_tiene_iva then
    new.precio_base := round(new.pvp / 1.15, 2);
    new.iva_unitario := round(new.pvp - new.precio_base, 2);
    new.margen_marca := round(
      (new.precio_base + new.iva_unitario) * v_factor_marca, 2
    );
    new.margen_dominga := round(
      (new.precio_base + new.iva_unitario) * v_factor_dominga, 2
    );
  else
    new.precio_base := new.pvp;
    new.iva_unitario := 0;
    new.margen_marca := round(new.pvp * v_factor_marca, 2);
    new.margen_dominga := round(new.pvp * v_factor_dominga, 2);
  end if;

  return new;
end;
$$;

create trigger productos_calc_margenes
before insert or update of pvp, expositor_id on productos
for each row execute function calc_margenes_producto();

-- Cuando un expositor cambia su IVA o comisión, recalcular productos.
-- Se hace por UPDATE no-op del PVP que dispara el trigger anterior.
create or replace function recalc_productos_expositor() returns trigger
language plpgsql
as $$
begin
  if new.tiene_iva is distinct from old.tiene_iva
     or new.comision_dominga is distinct from old.comision_dominga then
    update productos set pvp = pvp where expositor_id = new.id;
  end if;
  return new;
end;
$$;

create trigger expositor_recalc_productos
after update on expositores
for each row execute function recalc_productos_expositor();

-- Auto-crear profile al crear auth.users
create or replace function handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    'owner'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- =====================================================================
-- RPC: registrar_boleta
-- Transacción atómica: bloquea cada producto (FOR UPDATE), valida stock,
-- crea N ventas, decrementa vendidos, calcula totales y guarda la boleta.
-- Si algún ítem no tiene stock, hace rollback completo.
-- =====================================================================

create or replace function registrar_boleta(
  p_evento_id uuid,
  p_metodo_pago text,
  p_cliente text,
  p_pide_factura boolean,
  p_cliente_identificacion text,
  p_cliente_razon_social text,
  p_cliente_email text,
  p_cliente_direccion text,
  p_cliente_telefono text,
  p_items jsonb -- [{producto_id, cantidad}, ...]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boleta_id uuid;
  v_user uuid := auth.uid();
  v_total_pvp numeric := 0;
  v_total_marca numeric := 0;
  v_total_dominga numeric := 0;
  v_item jsonb;
  v_qty int;
  v_pid uuid;
  v_producto productos%rowtype;
  v_disponibles int;
begin
  -- Autorización: el usuario debe ser owner del evento o colaborador aceptado
  if not exists (
    select 1 from eventos where id = p_evento_id and owner_id = v_user
  ) and not exists (
    select 1 from evento_colaboradores
    where evento_id = p_evento_id
      and profile_id = v_user
      and accepted_at is not null
  ) then
    raise exception 'No autorizado para registrar ventas en este evento';
  end if;

  -- Crear cabecera con totales en cero (se actualizan al final)
  insert into boletas (
    evento_id, registrado_por, metodo_pago, cliente,
    pide_factura, cliente_identificacion, cliente_razon_social,
    cliente_email, cliente_direccion, cliente_telefono
  )
  values (
    p_evento_id, v_user, p_metodo_pago, coalesce(p_cliente, 'Consumidor final'),
    coalesce(p_pide_factura, false),
    p_cliente_identificacion, p_cliente_razon_social,
    p_cliente_email, p_cliente_direccion, p_cliente_telefono
  )
  returning id into v_boleta_id;

  -- Procesar cada ítem
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_pid := (v_item->>'producto_id')::uuid;
    v_qty := (v_item->>'cantidad')::int;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Cantidad inválida para producto %', v_pid;
    end if;

    -- Lock pesimista para evitar overselling concurrente
    select * into v_producto from productos where id = v_pid for update;

    if not found then
      raise exception 'Producto no encontrado: %', v_pid;
    end if;

    -- Verificar que el producto pertenezca a un expositor del evento correcto
    if not exists (
      select 1 from expositores
      where id = v_producto.expositor_id and evento_id = p_evento_id
    ) then
      raise exception 'Producto % no pertenece al evento %', v_pid, p_evento_id;
    end if;

    v_disponibles := v_producto.cantidad - v_producto.vendidos;
    if v_disponibles < v_qty then
      raise exception 'Stock insuficiente para "%": disponibles %, solicitados %',
        v_producto.descripcion, v_disponibles, v_qty;
    end if;

    -- Insertar línea de venta con totales preservados
    insert into ventas (
      boleta_id, evento_id, expositor_id, producto_id, descripcion,
      cantidad,
      pvp_unitario, pvp,
      margen_marca_unitario, margen_marca,
      margen_dominga_unitario, margen_dominga
    )
    values (
      v_boleta_id, p_evento_id, v_producto.expositor_id, v_producto.id, v_producto.descripcion,
      v_qty,
      v_producto.pvp, round(v_producto.pvp * v_qty, 2),
      v_producto.margen_marca, round(v_producto.margen_marca * v_qty, 2),
      v_producto.margen_dominga, round(v_producto.margen_dominga * v_qty, 2)
    );

    -- Decrementar stock
    update productos
      set vendidos = vendidos + v_qty
      where id = v_producto.id;

    v_total_pvp := v_total_pvp + round(v_producto.pvp * v_qty, 2);
    v_total_marca := v_total_marca + round(v_producto.margen_marca * v_qty, 2);
    v_total_dominga := v_total_dominga + round(v_producto.margen_dominga * v_qty, 2);
  end loop;

  -- Actualizar totales de la boleta
  update boletas
    set total_pvp = v_total_pvp,
        total_marca = v_total_marca,
        total_dominga = v_total_dominga
    where id = v_boleta_id;

  return v_boleta_id;
end;
$$;

-- =====================================================================
-- VISTAS DE REPORTE
-- =====================================================================

-- Liquidación por marca al cierre del evento
create or replace view liquidacion_marca as
select
  e.id as expositor_id,
  e.evento_id,
  e.nombre,
  e.tiene_iva,
  e.comision_dominga,
  e.fee_participacion,
  e.pago_envio,
  e.estado,
  coalesce(sum(v.pvp), 0)            as total_ventas,
  coalesce(sum(v.margen_marca), 0)   as total_margen_marca,
  coalesce(sum(v.margen_dominga), 0) as total_margen_dominga,
  greatest(
    coalesce(sum(v.margen_marca), 0)
      - case when e.estado != 'pagado' then e.fee_participacion else 0 end
      - e.pago_envio,
    0
  ) as valor_a_transferir,
  -- Si el cálculo da negativo, queda saldo deudor visible
  coalesce(sum(v.margen_marca), 0)
    - case when e.estado != 'pagado' then e.fee_participacion else 0 end
    - e.pago_envio
    as balance_real
from expositores e
left join ventas v on v.expositor_id = e.id
group by e.id;

-- Ventas con datos de facturación para exportar a Contifico
create or replace view ventas_con_datos_facturacion as
select
  b.id as boleta_id,
  b.evento_id,
  b.fecha,
  b.metodo_pago,
  b.cliente_identificacion,
  b.cliente_razon_social,
  b.cliente_email,
  b.cliente_direccion,
  b.cliente_telefono,
  b.total_pvp,
  jsonb_agg(
    jsonb_build_object(
      'descripcion', v.descripcion,
      'cantidad', v.cantidad,
      'pvp_unitario', v.pvp_unitario,
      'subtotal', v.pvp,
      'expositor_id', v.expositor_id
    ) order by v.created_at
  ) as items
from boletas b
join ventas v on v.boleta_id = b.id
where b.pide_factura = true
group by b.id;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

alter table profiles enable row level security;
alter table eventos enable row level security;
alter table evento_colaboradores enable row level security;
alter table expositores enable row level security;
alter table productos enable row level security;
alter table boletas enable row level security;
alter table ventas enable row level security;
alter table gastos enable row level security;

-- Helper: ¿el usuario actual es colaborador aceptado del evento?
create or replace function is_collaborator_of(p_evento_id uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from evento_colaboradores
    where evento_id = p_evento_id
      and profile_id = auth.uid()
      and accepted_at is not null
  );
$$;

-- Helper: ¿el usuario actual es owner del evento?
create or replace function is_owner_of(p_evento_id uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from eventos
    where id = p_evento_id and owner_id = auth.uid()
  );
$$;

-- profiles: cada usuario lee/edita su propio perfil
create policy profiles_self_select on profiles
  for select using (id = auth.uid());
create policy profiles_self_update on profiles
  for update using (id = auth.uid());

-- eventos: owner CRUD; colaborador SELECT
create policy eventos_owner_all on eventos
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy eventos_collab_select on eventos
  for select using (is_collaborator_of(id));

-- evento_colaboradores: owner del evento maneja todo; colaborador ve su propia fila
create policy ec_owner_all on evento_colaboradores
  for all using (is_owner_of(evento_id))
  with check (is_owner_of(evento_id));
create policy ec_self_select on evento_colaboradores
  for select using (profile_id = auth.uid());
create policy ec_self_accept on evento_colaboradores
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- expositores: owner CRUD; colaborador SELECT
create policy expositores_owner_all on expositores
  for all using (is_owner_of(evento_id))
  with check (is_owner_of(evento_id));
create policy expositores_collab_select on expositores
  for select using (is_collaborator_of(evento_id));

-- productos: owner CRUD; colaborador SELECT (necesita ver inventario para vender)
create policy productos_owner_all on productos
  for all using (
    exists (select 1 from expositores e
            where e.id = productos.expositor_id and is_owner_of(e.evento_id))
  )
  with check (
    exists (select 1 from expositores e
            where e.id = productos.expositor_id and is_owner_of(e.evento_id))
  );
create policy productos_collab_select on productos
  for select using (
    exists (select 1 from expositores e
            where e.id = productos.expositor_id and is_collaborator_of(e.evento_id))
  );

-- boletas: owner CRUD; colaborador puede crear y ver las del evento
create policy boletas_owner_all on boletas
  for all using (is_owner_of(evento_id))
  with check (is_owner_of(evento_id));
create policy boletas_collab_select on boletas
  for select using (is_collaborator_of(evento_id));
-- INSERT real se hace vía RPC registrar_boleta (security definer), no por INSERT directo

-- ventas: owner CRUD; colaborador SELECT
create policy ventas_owner_all on ventas
  for all using (is_owner_of(evento_id))
  with check (is_owner_of(evento_id));
create policy ventas_collab_select on ventas
  for select using (is_collaborator_of(evento_id));

-- gastos: SOLO owner (información financiera sensible)
create policy gastos_owner_all on gastos
  for all using (is_owner_of(evento_id))
  with check (is_owner_of(evento_id));
