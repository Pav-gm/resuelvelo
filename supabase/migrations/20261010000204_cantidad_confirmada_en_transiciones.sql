-- Actualiza las transiciones para consumir y liberar las unidades confirmadas.
create or replace function public.cancelar_venta(p_cotizacion_id uuid, p_cancelada_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_actor text;
  v_item record;
begin
  if p_cancelada_motivo is null or btrim(p_cancelada_motivo) = '' then
    raise exception 'Indica un motivo válido para cancelar.';
  end if;

  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  select c.estado,
    case
      when p.user_id = auth.uid() then 'proveedor'
      when c.comprador_id = auth.uid() then 'comprador'
    end
    into v_estado, v_actor
  from public.cotizaciones c
  join public.proveedores p on p.id = c.proveedor_id
  where c.id = p_cotizacion_id
    and (p.user_id = auth.uid() or c.comprador_id = auth.uid())
  for update of c;

  if not found or v_actor is null then
    raise exception 'No autorizado.';
  end if;

  if v_actor = 'comprador' and v_estado is distinct from 'aceptada' then
    raise exception 'Solo puedes cancelar antes de que el proveedor despache.';
  end if;

  if v_actor = 'proveedor' and v_estado not in ('aceptada', 'despachada') then
    raise exception 'Esta venta ya no se puede cancelar.';
  end if;

  perform set_config('app.reserva_interna', '1', true);

  for v_item in
    select i.producto_id, sum(coalesce(i.cantidad_confirmada, i.cantidad)) as cantidad
    from public.items_cotizacion i
    where i.cotizacion_id = p_cotizacion_id
    group by i.producto_id
    order by i.producto_id
  loop
    update public.productos
      set stock_reservado = greatest(0, stock_reservado - v_item.cantidad)
      where id = v_item.producto_id;
  end loop;

  update public.cotizaciones
    set estado = 'cancelada',
        cancelada_por = v_actor,
        cancelada_motivo = btrim(p_cancelada_motivo),
        cancelada_at = now()
    where id = p_cotizacion_id;
end;
$$;

create or replace function public.cancelar_venta(p_cotizacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Indica un motivo válido para cancelar.';
end;
$$;

create or replace function public.confirmar_recepcion(p_cotizacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_stock integer;
  v_reservado integer;
  v_nombre text;
  v_estado text;
  v_actor text;
  v_despachada_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  select c.estado, c.despachada_at,
    case
      when c.comprador_id = auth.uid() then 'comprador'
      when p.user_id = auth.uid() then 'proveedor'
    end
    into v_estado, v_despachada_at, v_actor
  from public.cotizaciones c
  join public.proveedores p on p.id = c.proveedor_id
  where c.id = p_cotizacion_id
    and (c.comprador_id = auth.uid() or p.user_id = auth.uid())
  for update of c;

  if not found or v_actor is null then
    raise exception 'No autorizado.';
  end if;

  if v_estado is distinct from 'despachada' then
    raise exception 'Solo puedes marcar como recibido un pedido despachado.';
  end if;

  if v_actor = 'proveedor' and (
    v_despachada_at is null
    or v_despachada_at + interval '7 days' > now()
  ) then
    raise exception 'Puedes marcarla como recibida 7 días después del despacho, si el cliente no lo hizo.';
  end if;

  perform set_config('app.reserva_interna', '1', true);

  for v_item in
    select i.producto_id, sum(coalesce(i.cantidad_confirmada, i.cantidad)) as cantidad
    from public.items_cotizacion i
    where i.cotizacion_id = p_cotizacion_id
    group by i.producto_id
    order by i.producto_id
  loop
    select stock, stock_reservado, nombre
      into v_stock, v_reservado, v_nombre
    from public.productos
    where id = v_item.producto_id
    for update;

    if v_stock is null then
      raise exception 'Un producto de la cotización ya no existe.';
    end if;

    if v_stock < v_item.cantidad then
      raise exception 'No se puede confirmar %: el stock físico no alcanza.', v_nombre;
    end if;

    update public.productos
      set stock = stock - v_item.cantidad,
          stock_reservado = greatest(0, stock_reservado - v_item.cantidad)
      where id = v_item.producto_id;
  end loop;

  update public.cotizaciones
    set estado = 'recibida',
        recibida_por = v_actor
    where id = p_cotizacion_id;
end;
$$;

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
    'cancelada_at', c.cancelada_at,
    'cancelada_motivo', c.cancelada_motivo,
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
          'cantidad_confirmada', i.cantidad_confirmada,
          'precio_unitario', i.precio_unitario,
          'sujeta_disponibilidad', i.sujeta_disponibilidad,
          'stock_al_cotizar', i.stock_al_cotizar,
          'producto', case
            when producto.id is null then null
            else jsonb_build_object('id', producto.id, 'nombre', producto.nombre, 'activo', producto.activo)
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
revoke execute on function public.cancelar_venta(uuid) from public, anon;
revoke execute on function public.cancelar_venta(uuid, text) from public, anon;
revoke execute on function public.confirmar_recepcion(uuid) from public, anon;
grant execute on function public.cancelar_venta(uuid) to authenticated;
grant execute on function public.cancelar_venta(uuid, text) to authenticated;
grant execute on function public.confirmar_recepcion(uuid) to authenticated;
