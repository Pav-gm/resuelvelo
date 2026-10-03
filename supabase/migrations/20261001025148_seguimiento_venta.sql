-- =============================================================
-- SEGUIMIENTO DE VENTA — reserva y descuento de stock
-- (idempotente: se puede re-ejecutar en un proyecto existente)
-- =============================================================

alter table public.productos
  add column if not exists stock_reservado integer not null default 0;

alter table public.cotizaciones
  add column if not exists cancelada_por text,
  add column if not exists despachada_at timestamptz,
  add column if not exists recibida_por  text;

alter table public.productos drop constraint if exists productos_reserva_no_supera_stock;
alter table public.productos add constraint productos_reserva_no_supera_stock
  check (stock_reservado >= 0 and stock_reservado <= stock);

alter table public.cotizaciones drop constraint if exists cotizaciones_estado_check;
alter table public.cotizaciones add constraint cotizaciones_estado_check
  check (estado in ('pendiente','respondida','aceptada','rechazada','despachada','recibida','cancelada'));

alter table public.cotizaciones drop constraint if exists cotizaciones_cancelada_por_check;
alter table public.cotizaciones add constraint cotizaciones_cancelada_por_check
  check (cancelada_por is null or cancelada_por in ('comprador','proveedor'));

alter table public.cotizaciones drop constraint if exists cotizaciones_recibida_por_check;
alter table public.cotizaciones add constraint cotizaciones_recibida_por_check
  check (recibida_por is null or recibida_por in ('comprador','proveedor'));

-- Solo las funciones de abajo pueden tocar stock_reservado.
create or replace function public.proteger_stock_reservado()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.reserva_interna', true) = '1' then
    return new;
  end if;

  if new.stock_reservado is distinct from old.stock_reservado then
    raise exception 'El stock reservado solo cambia al aceptar, cancelar o confirmar una venta.';
  end if;

  if new.stock < new.stock_reservado then
    raise exception 'No puedes dejar el stock por debajo de las unidades reservadas.';
  end if;

  return new;
end;
$$;

drop trigger if exists productos_proteger_reserva on public.productos;
create trigger productos_proteger_reserva
  before update on public.productos
  for each row execute function public.proteger_stock_reservado();

create or replace function public.rechazar_cotizacion(p_cotizacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  update public.cotizaciones c
    set estado = 'rechazada'
  from public.proveedores p
  where c.id = p_cotizacion_id
    and c.proveedor_id = p.id
    and p.user_id = auth.uid()
    and c.estado = 'pendiente';

  if not found then
    raise exception 'Solo puedes rechazar una cotización pendiente.';
  end if;
end;
$$;

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

create or replace function public.despachar_cotizacion(p_cotizacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  update public.cotizaciones c
    set estado = 'despachada',
        despachada_at = now()
  from public.proveedores p
  where c.id = p_cotizacion_id
    and c.proveedor_id = p.id
    and p.user_id = auth.uid()
    and c.estado = 'aceptada';

  if not found then
    raise exception 'Solo puedes despachar una venta aceptada.';
  end if;
end;
$$;

create or replace function public.cancelar_venta(p_cotizacion_id uuid)
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
    select i.producto_id, sum(i.cantidad) as cantidad
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
        cancelada_por = v_actor
    where id = p_cotizacion_id;
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
