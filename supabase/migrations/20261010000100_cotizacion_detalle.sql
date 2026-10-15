create or replace function public.get_cotizacion_detalle(p_cotizacion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_detalle jsonb;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.cotizaciones c
    left join public.proveedores p on p.id = c.proveedor_id
    where c.id = p_cotizacion_id
      and (c.comprador_id = auth.uid() or p.user_id = auth.uid())
  ) then
    raise exception 'COTIZACION_NO_AUTORIZADA';
  end if;

  select jsonb_build_object(
    'id', c.id,
    'numero', c.numero,
    'comprador_id', c.comprador_id,
    'proveedor_id', c.proveedor_id,
    'estado', c.estado,
    'mensaje', c.mensaje,
    'total_estimado', c.total_estimado,
    'created_at', c.created_at,
    'despachada_at', c.despachada_at,
    'cancelada_por', c.cancelada_por,
    'proveedor', jsonb_build_object(
      'id', p.id,
      'nombre_empresa', p.nombre_empresa,
      'ciudad', p.ciudad,
      'verificado', p.verificado
    ),
    'comprador', jsonb_build_object(
      'id', comprador.id,
      'nombre', comprador.nombre,
      'email', comprador.email,
      'telefono', comprador.telefono
    ),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'cotizacion_id', i.cotizacion_id,
          'producto_id', i.producto_id,
          'cantidad', i.cantidad,
          'precio_unitario', i.precio_unitario,
          'sujeta_disponibilidad', i.sujeta_disponibilidad,
          'stock_al_cotizar', i.stock_al_cotizar,
          'producto', case
            when producto.id is null then null
            else jsonb_build_object('id', producto.id, 'nombre', producto.nombre)
          end
        ) order by i.id
      )
      from public.items_cotizacion i
      left join public.productos producto on producto.id = i.producto_id
      where i.cotizacion_id = c.id
    ), '[]'::jsonb)
  )
  into v_detalle
  from public.cotizaciones c
  join public.proveedores p on p.id = c.proveedor_id
  join public.profiles comprador on comprador.id = c.comprador_id
  where c.id = p_cotizacion_id;

  return v_detalle;
end;
$$;

revoke execute on function public.get_cotizacion_detalle(uuid) from public, anon;
grant execute on function public.get_cotizacion_detalle(uuid) to authenticated;
