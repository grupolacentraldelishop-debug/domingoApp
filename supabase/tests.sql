-- =====================================================================
-- Tests SQL — verificación de la lógica financiera y RPC
-- Correr en una DB con 0001_init.sql aplicado y SIN datos reales.
-- Uso: psql $DATABASE_URL -f supabase/tests.sql
-- Cada test imprime PASS/FAIL.
-- =====================================================================

\set ON_ERROR_STOP on

begin;

-- Setup mínimo: simular auth.users (solo en local; en cloud no se permite)
-- y crear un owner + evento de prueba.
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_evento_id uuid;
  v_marca_iva uuid;
  v_marca_no_iva uuid;
  v_prod_iva uuid;
  v_prod_no_iva uuid;
  v_boleta_id uuid;
  v_margen_marca numeric;
  v_margen_dominga numeric;
  v_disponibles int;
begin
  -- Insertar perfil sin pasar por auth.users (test only)
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_user_id, 'test@dominga.local', jsonb_build_object('nombre', 'Test Owner'));

  -- Evento
  insert into eventos (owner_id, nombre, fecha_inicio, fecha_fin)
  values (v_user_id, 'Test Pop-Up', current_date, current_date + 1)
  returning id into v_evento_id;

  -- Marca CON IVA, comisión 30%
  insert into expositores (evento_id, nombre, tiene_iva, comision_dominga)
  values (v_evento_id, 'Marca IVA', true, 30)
  returning id into v_marca_iva;

  -- Marca SIN IVA, comisión 30%
  insert into expositores (evento_id, nombre, tiene_iva, comision_dominga)
  values (v_evento_id, 'Marca SinIVA', false, 30)
  returning id into v_marca_no_iva;

  -- ---- Test 1: PVP $115 con IVA → marca $80.50, Dominga $34.50 ----
  insert into productos (expositor_id, descripcion, pvp, cantidad)
  values (v_marca_iva, 'Producto IVA', 115.00, 10)
  returning id, margen_marca, margen_dominga into v_prod_iva, v_margen_marca, v_margen_dominga;

  if v_margen_marca = 80.50 and v_margen_dominga = 34.50 then
    raise notice 'PASS  Test 1 — PVP $115 con IVA: marca $80.50, Dominga $34.50';
  else
    raise exception 'FAIL  Test 1: marca=% (esp 80.50), dominga=% (esp 34.50)',
      v_margen_marca, v_margen_dominga;
  end if;

  -- ---- Test 2: PVP $100 sin IVA → marca $70, Dominga $30 ----
  insert into productos (expositor_id, descripcion, pvp, cantidad)
  values (v_marca_no_iva, 'Producto SinIVA', 100.00, 10)
  returning id, margen_marca, margen_dominga into v_prod_no_iva, v_margen_marca, v_margen_dominga;

  if v_margen_marca = 70.00 and v_margen_dominga = 30.00 then
    raise notice 'PASS  Test 2 — PVP $100 sin IVA: marca $70, Dominga $30';
  else
    raise exception 'FAIL  Test 2: marca=% (esp 70), dominga=% (esp 30)',
      v_margen_marca, v_margen_dominga;
  end if;

  -- ---- Test 3: cambiar IVA del expositor recalcula productos ----
  update expositores set tiene_iva = false where id = v_marca_iva;
  select margen_marca into v_margen_marca from productos where id = v_prod_iva;
  if v_margen_marca = 80.50 then
    raise exception 'FAIL  Test 3: trigger no recalculó al apagar IVA (margen sigue en %)', v_margen_marca;
  else
    raise notice 'PASS  Test 3 — cambio de tiene_iva propaga a productos (nuevo margen %)', v_margen_marca;
  end if;

  -- Volver a true para tests siguientes
  update expositores set tiene_iva = true where id = v_marca_iva;

  -- ---- Test 4: cambiar comisión a 40% recalcula ----
  update expositores set comision_dominga = 40 where id = v_marca_no_iva;
  select margen_marca, margen_dominga into v_margen_marca, v_margen_dominga
  from productos where id = v_prod_no_iva;
  if v_margen_marca = 60.00 and v_margen_dominga = 40.00 then
    raise notice 'PASS  Test 4 — cambio de comisión propaga (40%%): marca $60, Dominga $40';
  else
    raise exception 'FAIL  Test 4: marca=%, dominga=% (esp 60/40)', v_margen_marca, v_margen_dominga;
  end if;

  -- ---- Test 5: RPC registrar_boleta con stock suficiente ----
  -- Simular auth.uid() para el RPC
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_user_id::text)::text, true);

  v_boleta_id := registrar_boleta(
    v_evento_id, 'efectivo', null, false, null, null, null, null, null,
    jsonb_build_array(
      jsonb_build_object('producto_id', v_prod_iva, 'cantidad', 2),
      jsonb_build_object('producto_id', v_prod_no_iva, 'cantidad', 1)
    )
  );

  select cantidad - vendidos into v_disponibles from productos where id = v_prod_iva;
  if v_disponibles = 8 then
    raise notice 'PASS  Test 5 — RPC decrementa stock (8 disponibles tras vender 2 de 10)';
  else
    raise exception 'FAIL  Test 5: disponibles=% (esp 8)', v_disponibles;
  end if;

  -- ---- Test 6: RPC con stock insuficiente hace rollback ----
  begin
    perform registrar_boleta(
      v_evento_id, 'tarjeta', null, false, null, null, null, null, null,
      jsonb_build_array(
        jsonb_build_object('producto_id', v_prod_iva, 'cantidad', 999)
      )
    );
    raise exception 'FAIL  Test 6: el RPC debió rechazar stock insuficiente';
  exception when others then
    -- Verificar que el stock NO cambió
    select cantidad - vendidos into v_disponibles from productos where id = v_prod_iva;
    if v_disponibles = 8 then
      raise notice 'PASS  Test 6 — RPC con stock insuficiente hace rollback (sigue en 8)';
    else
      raise exception 'FAIL  Test 6: stock cambió tras rollback (disponibles=%)', v_disponibles;
    end if;
  end;

  raise notice '=========================================';
  raise notice 'Todos los tests pasaron.';
  raise notice '=========================================';
end;
$$;

rollback;
