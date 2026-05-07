-- Agrega estado a boletas ('activa' | 'anulada') y RPC para anular atómicamente
alter table boletas
  add column estado text not null default 'activa'
  check (estado in ('activa', 'anulada'));

-- RPC: anula una boleta y restaura el stock de cada ítem
create or replace function anular_boleta(p_boleta_id uuid)
returns void language plpgsql security definer as $$
declare
  v_evento_id uuid;
  v_venta record;
begin
  select evento_id into v_evento_id
    from boletas
    where id = p_boleta_id and estado = 'activa'
    for update;

  if not found then
    raise exception 'Boleta no encontrada o ya anulada';
  end if;

  if not (select is_collaborator_of(v_evento_id)) then
    raise exception 'Sin permisos para anular esta boleta';
  end if;

  for v_venta in
    select producto_id, cantidad from ventas where boleta_id = p_boleta_id
  loop
    update productos
      set vendidos = vendidos - v_venta.cantidad
      where id = v_venta.producto_id;
  end loop;

  update boletas set estado = 'anulada' where id = p_boleta_id;
end;
$$;

-- Actualizar liquidacion_marca para excluir ventas de boletas anuladas
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
  coalesce(sum(v.margen_marca), 0)
    - case when e.estado != 'pagado' then e.fee_participacion else 0 end
    - e.pago_envio
    as balance_real
from expositores e
left join (
  select v.* from ventas v
  join boletas b on b.id = v.boleta_id and b.estado = 'activa'
) v on v.expositor_id = e.id
group by e.id;
