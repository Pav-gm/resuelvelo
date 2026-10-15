create or replace function public.aceptar_cotizacion(p_cotizacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_item record;
  v_stock integer;
  v_reservado integer;
  v_nombre text;
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  select c.estado
    into v_estado
  from public.cotizaciones c
  join public.proveedores p on p.id = c.proveedor_id
  where c.id = p_cotizacion_id
    and p.user_id = auth.uid()
  for update of c;

  if not found then
    raise exception 'No autorizado.';
  end if;

  if v_estado is distinct from 'pendiente' then
    raise exception 'Solo puedes aceptar una cotización pendiente.';
  end if;

  if not exists (
    select 1 from public.items_cotizacion where cotizacion_id = p_cotizacion_id
  ) then
    raise exception 'La cotización no tiene productos.';
  end if;

  perform set_config('app.reserva_interna', '1', true);

  for v_item in
    select i.producto_id, sum(i.cantidad) as cantidad
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

    if v_stock - v_reservado < v_item.cantidad then
      raise exception 'No hay stock disponible de % (disponible: %, pedido: %).',
        v_nombre, (v_stock - v_reservado), v_item.cantidad;
    end if;

    update public.productos
      set stock_reservado = stock_reservado + v_item.cantidad
      where id = v_item.producto_id;
  end loop;

  update public.cotizaciones
    set estado = 'aceptada'
    where id = p_cotizacion_id;
end;
$$;

revoke execute on function public.aceptar_cotizacion_con_cantidades(uuid, jsonb) from public, anon, authenticated;
drop function public.aceptar_cotizacion_con_cantidades(uuid, jsonb);

alter table public.items_cotizacion
  drop constraint items_cotizacion_cantidad_confirmada_check,
  drop column cantidad_confirmada;
