-- Las boletas anuladas no deben exportarse a Contifico
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
  and b.estado = 'activa'
group by b.id;
