drop function if exists public.aceptar_oferta_cotizacion(uuid);
drop function if exists public.rechazar_oferta_cotizacion(uuid, text);
drop function if exists public.solicitar_nueva_oferta(uuid, text);

alter table public.cotizaciones
  drop column if exists aceptada_at,
  drop column if exists rechazada_motivo;

create or replace function public.aceptar_cotizacion_con_cantidades(
  p_cotizacion_id uuid,
  p_cantidades jsonb
)
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

  if jsonb_typeof(p_cantidades) is distinct from 'array' then
    raise exception 'Debes enviar una cantidad para cada producto.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_cantidades) as entrada(valor)
    where jsonb_typeof(entrada.valor) is distinct from 'object'
       or jsonb_typeof(entrada.valor->'item_id') is distinct from 'string'
       or jsonb_typeof(entrada.valor->'cantidad') is distinct from 'number'
       or coalesce(entrada.valor->>'cantidad', '') !~ '^(0|[1-9][0-9]*)$'
  ) then
    raise exception 'Las cantidades deben ser enteros no negativos por producto.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_cantidades) as entrada(valor)
    left join public.items_cotizacion i
      on i.id::text = entrada.valor->>'item_id'
     and i.cotizacion_id = p_cotizacion_id
    where i.id is null
  ) then
    raise exception 'La cotización contiene una línea desconocida.';
  end if;

  if exists (
    select entrada.valor->>'item_id'
    from jsonb_array_elements(p_cantidades) as entrada(valor)
    group by entrada.valor->>'item_id'
    having count(*) > 1
  ) then
    raise exception 'No puedes repetir líneas de la cotización.';
  end if;

  if jsonb_array_length(p_cantidades) <> (
    select count(*) from public.items_cotizacion where cotizacion_id = p_cotizacion_id
  ) then
    raise exception 'Debes enviar una cantidad para cada producto.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_cantidades) as entrada(valor)
    join public.items_cotizacion i
      on i.id::text = entrada.valor->>'item_id'
     and i.cotizacion_id = p_cotizacion_id
    where (entrada.valor->>'cantidad')::bigint > i.cantidad
  ) then
    raise exception 'La cantidad confirmada no puede superar la solicitada.';
  end if;

  if (
    select coalesce(sum((entrada.valor->>'cantidad')::bigint), 0)
    from jsonb_array_elements(p_cantidades) as entrada(valor)
  ) = 0 then
    raise exception 'Debes confirmar al menos una unidad.';
  end if;

  -- Toma todos los bloqueos en el mismo orden para evitar interbloqueos.
  for v_item in
    select distinct i.producto_id
    from public.items_cotizacion i
    where i.cotizacion_id = p_cotizacion_id
    order by i.producto_id
  loop
    perform 1
    from public.productos producto
    where producto.id = v_item.producto_id
    for update;
  end loop;

  for v_item in
    select i.producto_id, sum((entrada.valor->>'cantidad')::bigint) as cantidad
    from public.items_cotizacion i
    join jsonb_array_elements(p_cantidades) as entrada(valor)
      on i.id::text = entrada.valor->>'item_id'
    where i.cotizacion_id = p_cotizacion_id
    group by i.producto_id
    order by i.producto_id
  loop
    select producto.stock, producto.stock_reservado, producto.nombre
      into v_stock, v_reservado, v_nombre
    from public.productos producto
    where producto.id = v_item.producto_id;

    if v_stock is null then
      raise exception 'Un producto de la cotización ya no existe.';
    end if;

    if v_stock - v_reservado < v_item.cantidad then
      raise exception 'No hay stock disponible de % (disponible: %, confirmado: %).',
        v_nombre, (v_stock - v_reservado), v_item.cantidad;
    end if;
  end loop;

  perform set_config('app.reserva_interna', '1', true);

  update public.items_cotizacion i
    set cantidad_confirmada = (entrada.valor->>'cantidad')::integer
  from jsonb_array_elements(p_cantidades) as entrada(valor)
  where i.id::text = entrada.valor->>'item_id'
    and i.cotizacion_id = p_cotizacion_id;

  for v_item in
    select i.producto_id, sum(i.cantidad_confirmada) as cantidad
    from public.items_cotizacion i
    where i.cotizacion_id = p_cotizacion_id
    group by i.producto_id
    order by i.producto_id
  loop
    update public.productos
      set stock_reservado = stock_reservado + v_item.cantidad
      where id = v_item.producto_id;
  end loop;

  update public.cotizaciones
    set estado = 'aceptada'
    where id = p_cotizacion_id;
end;
$$;

create or replace function public.aceptar_cotizacion(p_cotizacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cantidades jsonb;
begin
  select coalesce(
    jsonb_agg(jsonb_build_object('item_id', i.id, 'cantidad', i.cantidad) order by i.id),
    '[]'::jsonb
  )
    into v_cantidades
  from public.items_cotizacion i
  where i.cotizacion_id = p_cotizacion_id;

  perform public.aceptar_cotizacion_con_cantidades(p_cotizacion_id, v_cantidades);
end;
$$;

revoke execute on function public.aceptar_cotizacion_con_cantidades(uuid, jsonb) from public, anon;
grant execute on function public.aceptar_cotizacion_con_cantidades(uuid, jsonb) to authenticated;
revoke execute on function public.aceptar_cotizacion(uuid) from public, anon;
grant execute on function public.aceptar_cotizacion(uuid) to authenticated;
