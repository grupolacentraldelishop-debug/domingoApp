-- Fix: solo descontar fee_participacion cuando la marca NO lo ha pagado (estado != 'pagado')
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
