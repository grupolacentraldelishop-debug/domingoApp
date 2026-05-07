-- =====================================================================
-- Seed: Pop-Up #4 "Herencias y Reliquias de Mamá"
-- Crea el evento + 11 marcas iniciales bajo el primer profile owner.
-- Idempotente: no duplica si ya existe.
-- Correr DESPUÉS del primer signup en la app (o de crear un auth.users dev).
-- =====================================================================

do $$
declare
  v_owner_id uuid;
  v_evento_id uuid;
begin
  -- Tomar el primer owner registrado (o salir sin error)
  select id into v_owner_id from profiles where rol = 'owner' order by created_at limit 1;

  if v_owner_id is null then
    raise notice 'No hay profiles owner. Crea una cuenta primero, luego corre el seed.';
    return;
  end if;

  -- Crear el evento si no existe
  select id into v_evento_id
  from eventos
  where owner_id = v_owner_id and nombre = 'Pop-Up #4 — Herencias y Reliquias de Mamá';

  if v_evento_id is null then
    insert into eventos (owner_id, nombre, fecha_inicio, fecha_fin, lugar, descripcion, estado)
    values (
      v_owner_id,
      'Pop-Up #4 — Herencias y Reliquias de Mamá',
      '2026-05-08',
      '2026-05-09',
      'La Central, Plaza Navona',
      'Pop-up de Día de la Madre. Horario 12:00–20:00.',
      'planeacion'
    )
    returning id into v_evento_id;
  end if;

  -- Insertar las 11 marcas si aún no existen para este evento
  insert into expositores (evento_id, nombre, estado, tiene_iva, comision_dominga, fee_participacion, pago_envio)
  select v_evento_id, m.nombre, m.estado, m.tiene_iva, 30, 50, 0
  from (values
    ('Stadust',              'pagado',     true),
    ('Alessandra Salvatore', 'pagado',     true),
    ('Poli Lunar',           'confirmado', true),
    ('Theodora',             'confirmado', true),
    ('Florencia Davalos',    'confirmado', true),
    ('Botaniste',            'confirmado', true),
    ('Sacada de Fa',         'pagado',     false),
    ('Butter Barn',          'pendiente',  true),
    ('Titipots',             'pagado',     true),
    ('Lamur Care',           'pagado',     true),
    ('Mamu',                 'pendiente',  false)
  ) as m(nombre, estado, tiene_iva)
  where not exists (
    select 1 from expositores e
    where e.evento_id = v_evento_id and e.nombre = m.nombre
  );

  raise notice 'Seed aplicado. Evento %, % marcas en total.',
    v_evento_id,
    (select count(*) from expositores where evento_id = v_evento_id);
end;
$$;
