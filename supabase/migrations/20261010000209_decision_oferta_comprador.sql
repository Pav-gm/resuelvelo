alter table public.cotizaciones
  add column aceptada_at timestamptz null,
  add column rechazada_motivo text null;

create or replace function public.aceptar_oferta_cotizacion(p_cotizacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_valida_hasta date;
  v_item record;
  v_stock integer;
  v_reservado integer;
  v_nombre text;
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  select c.estado, c.valida_hasta
    into v_estado, v_valida_hasta
  from public.cotizaciones c
  where c.id = p_cotizacion_id
    and c.comprador_id = auth.uid()
  for update;

  if not found then
    raise exception 'No tienes permiso para decidir esta cotización.';
  end if;
  if v_estado is distinct from 'respondida' then
    raise exception 'La cotización ya no está respondida.';
  end if;
  if v_valida_hasta is null or v_valida_hasta < current_date then
    raise exception 'La oferta está vencida.';
  end if;
  if not exists (select 1 from public.items_cotizacion where cotizacion_id = p_cotizacion_id) then
    raise exception 'La oferta no tiene líneas.';
  end if;
  if (select coalesce(sum(coalesce(i.cantidad_ofertada, i.cantidad)), 0)
      from public.items_cotizacion i where i.cotizacion_id = p_cotizacion_id) < 1 then
    raise exception 'La oferta debe incluir al menos una unidad.';
  end if;
  if exists (
    select 1 from public.items_cotizacion i
    where i.cotizacion_id = p_cotizacion_id
      and (i.precio_ofertado is null or i.precio_ofertado <= 0)
  ) then
    raise exception 'La oferta contiene una línea sin precio ofertado.';
  end if;

  for v_item in
    select distinct i.producto_id
    from public.items_cotizacion i
    where i.cotizacion_id = p_cotizacion_id
    order by i.producto_id
  loop
    perform 1 from public.productos p where p.id = v_item.producto_id for update;
  end loop;

  for v_item in
    select i.producto_id, sum(coalesce(i.cantidad_ofertada, i.cantidad)) as cantidad
    from public.items_cotizacion i
    where i.cotizacion_id = p_cotizacion_id
    group by i.producto_id
    order by i.producto_id
  loop
    select p.stock, p.stock_reservado, p.nombre
      into v_stock, v_reservado, v_nombre
    from public.productos p
    where p.id = v_item.producto_id;
    if v_stock is null then
      raise exception 'Un producto de la cotización ya no existe.';
    end if;
    if v_stock - coalesce(v_reservado, 0) < v_item.cantidad then
      raise exception 'No hay stock disponible de % (disponible: %, confirmado: %).',
        v_nombre, v_stock - coalesce(v_reservado, 0), v_item.cantidad;
    end if;
  end loop;

  perform set_config('app.reserva_interna', '1', true);
  update public.items_cotizacion i
    set cantidad_confirmada = coalesce(i.cantidad_ofertada, i.cantidad),
        precio_unitario = i.precio_ofertado
  where i.cotizacion_id = p_cotizacion_id;

  for v_item in
    select i.producto_id, sum(i.cantidad_confirmada) as cantidad
    from public.items_cotizacion i
    where i.cotizacion_id = p_cotizacion_id
    group by i.producto_id
    order by i.producto_id
  loop
    update public.productos
      set stock_reservado = coalesce(stock_reservado, 0) + v_item.cantidad
    where id = v_item.producto_id;
  end loop;

  update public.cotizaciones
    set estado = 'aceptada', aceptada_at = now()
  where id = p_cotizacion_id;
end;
$$;

create or replace function public.rechazar_oferta_cotizacion(
  p_cotizacion_id uuid,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;
  if p_motivo is null or btrim(p_motivo) = '' or char_length(btrim(p_motivo)) > 500 then
    raise exception 'El motivo debe tener entre 1 y 500 caracteres.';
  end if;

  update public.cotizaciones c
    set estado = 'rechazada', rechazada_motivo = btrim(p_motivo),
        rechazada_at = now()
  where c.id = p_cotizacion_id
    and c.comprador_id = auth.uid()
    and c.estado = 'respondida';

  if not found then
    raise exception 'La cotización ya no está respondida o no tienes permiso para rechazarla.';
  end if;
end;
$$;

create or replace function public.solicitar_nueva_oferta(
  p_cotizacion_id uuid,
  p_nota text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valida_hasta date;
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;
  if p_nota is null or btrim(p_nota) = '' or char_length(btrim(p_nota)) > 500 then
    raise exception 'La nota debe tener entre 1 y 500 caracteres.';
  end if;

  select c.valida_hasta into v_valida_hasta
  from public.cotizaciones c
  where c.id = p_cotizacion_id
    and c.comprador_id = auth.uid()
    and c.estado = 'respondida'
  for update;

  if not found then
    raise exception 'La cotización ya no está respondida o no tienes permiso para solicitar otra oferta.';
  end if;
  if v_valida_hasta is null or v_valida_hasta >= current_date then
    raise exception 'Solo puedes solicitar otra oferta cuando la oferta está vencida.';
  end if;

  update public.cotizaciones
    set estado = 'pendiente', mensaje = btrim(p_nota), plazo_dias = null,
        valida_hasta = null, condiciones = null, respondida_at = null,
        total_ofertado = null
  where id = p_cotizacion_id;
  update public.items_cotizacion
    set precio_ofertado = null, cantidad_ofertada = null
  where cotizacion_id = p_cotizacion_id;
end;
$$;

create or replace function public.aceptar_cotizacion_con_cantidades(
  p_cotizacion_id uuid,
  p_cantidades jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Solo el comprador puede aceptar una oferta respondida.';
end;
$$;

create or replace function public.aceptar_cotizacion(p_cotizacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Solo el comprador puede aceptar una oferta respondida.';
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
    'plazo_dias', c.plazo_dias,
    'valida_hasta', c.valida_hasta,
    'condiciones', c.condiciones,
    'respondida_at', c.respondida_at,
    'total_ofertado', c.total_ofertado,
    'motivo_rechazo', c.motivo_rechazo,
    'rechazada_at', c.rechazada_at,
    'aceptada_at', c.aceptada_at,
    'rechazada_motivo', c.rechazada_motivo,
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
          'precio_ofertado', i.precio_ofertado,
          'cantidad_ofertada', i.cantidad_ofertada,
          'sujeta_disponibilidad', i.sujeta_disponibilidad,
          'stock_al_cotizar', i.stock_al_cotizar,
          'producto', case
            when producto.id is null then null
            else jsonb_build_object('id', producto.id, 'nombre', producto.nombre, 'activo', producto.activo, 'precio', producto.precio)
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

revoke execute on function public.aceptar_oferta_cotizacion(uuid) from public, anon;
grant execute on function public.aceptar_oferta_cotizacion(uuid) to authenticated;
revoke execute on function public.rechazar_oferta_cotizacion(uuid, text) from public, anon;
grant execute on function public.rechazar_oferta_cotizacion(uuid, text) to authenticated;
revoke execute on function public.solicitar_nueva_oferta(uuid, text) from public, anon;
grant execute on function public.solicitar_nueva_oferta(uuid, text) to authenticated;
revoke execute on function public.aceptar_cotizacion_con_cantidades(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.aceptar_cotizacion(uuid) from public, anon, authenticated;
