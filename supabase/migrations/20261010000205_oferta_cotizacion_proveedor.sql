alter table public.items_cotizacion
  add column precio_ofertado numeric null,
  add column cantidad_ofertada integer null,
  add constraint items_cotizacion_cantidad_ofertada_check
    check (cantidad_ofertada is null or cantidad_ofertada between 0 and cantidad);

alter table public.cotizaciones
  add column plazo_dias integer null,
  add column valida_hasta date null,
  add column condiciones text null,
  add column respondida_at timestamptz null,
  add column total_ofertado numeric null,
  add column motivo_rechazo text null;

create policy "cotizaciones: proveedor actualiza oferta pendiente"
  on public.cotizaciones for update to authenticated
  using (
    estado = 'pendiente'
    and exists (
      select 1 from public.proveedores p
      where p.id = proveedor_id and p.user_id = auth.uid()
    )
  )
  with check (
    estado = 'pendiente'
    and exists (
      select 1 from public.proveedores p
      where p.id = proveedor_id and p.user_id = auth.uid()
    )
  );

create policy "items: proveedor actualiza oferta pendiente"
  on public.items_cotizacion for update to authenticated
  using (
    exists (
      select 1
      from public.cotizaciones c
      join public.proveedores p on p.id = c.proveedor_id
      where c.id = cotizacion_id
        and c.estado = 'pendiente'
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.cotizaciones c
      join public.proveedores p on p.id = c.proveedor_id
      where c.id = cotizacion_id
        and c.estado = 'pendiente'
        and p.user_id = auth.uid()
    )
  );

create or replace function public.responder_cotizacion_con_oferta(
  p_cotizacion_id uuid,
  p_lineas jsonb,
  p_plazo_dias integer,
  p_valida_hasta date,
  p_condiciones text
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_total numeric;
  v_items integer;
  v_lineas integer;
  v_linea record;
  v_suma_cantidad integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para responder la cotización.';
  end if;

  select c.estado
    into v_estado
  from public.cotizaciones c
  join public.proveedores p on p.id = c.proveedor_id
  where c.id = p_cotizacion_id
    and p.user_id = auth.uid()
  for update of c;

  if not found then
    raise exception 'No tienes permiso para responder esta cotización.';
  end if;
  if v_estado is distinct from 'pendiente' then
    raise exception 'La cotización ya no está pendiente.';
  end if;
  if p_plazo_dias is null or p_plazo_dias not between 0 and 90 then
    raise exception 'El plazo debe estar entre 0 y 90 días.';
  end if;
  if p_valida_hasta is null or p_valida_hasta <= current_date then
    raise exception 'La fecha de validez debe ser futura.';
  end if;
  if jsonb_typeof(p_lineas) is distinct from 'array' then
    raise exception 'La oferta debe incluir todas las líneas de la cotización.';
  end if;
  if jsonb_array_length(p_lineas) = 0 then
    raise exception 'La oferta debe incluir todas las líneas de la cotización.';
  end if;

  select count(*) into v_items
  from public.items_cotizacion i
  where i.cotizacion_id = p_cotizacion_id;
  select count(*) into v_lineas
  from jsonb_to_recordset(p_lineas) as x(item_id uuid, precio_ofertado numeric, cantidad_ofertada integer);
  if v_items = 0 or v_lineas <> v_items then
    raise exception 'La oferta debe incluir cada línea de la cotización una sola vez.';
  end if;

  for v_linea in
    select x.item_id, x.precio_ofertado, x.cantidad_ofertada
    from jsonb_to_recordset(p_lineas) as x(item_id uuid, precio_ofertado numeric, cantidad_ofertada integer)
  loop
    if v_linea.item_id is null
      or v_linea.precio_ofertado is null
      or v_linea.precio_ofertado <= 0
      or v_linea.precio_ofertado::text in ('NaN', 'Infinity', '-Infinity') then
      raise exception 'Cada precio ofertado debe ser mayor que 0.';
    end if;
    if (select count(*) from jsonb_to_recordset(p_lineas) as x(item_id uuid, precio_ofertado numeric, cantidad_ofertada integer) where x.item_id = v_linea.item_id) <> 1 then
      raise exception 'La oferta debe incluir cada línea de la cotización una sola vez.';
    end if;
    if not exists (
      select 1 from public.items_cotizacion i
      where i.id = v_linea.item_id and i.cotizacion_id = p_cotizacion_id
    ) then
      raise exception 'La oferta debe incluir cada línea de la cotización una sola vez.';
    end if;
    if v_linea.cantidad_ofertada is not null and not exists (
      select 1 from public.items_cotizacion i
      where i.id = v_linea.item_id
        and i.cotizacion_id = p_cotizacion_id
        and v_linea.cantidad_ofertada between 0 and i.cantidad
        and (v_linea.cantidad_ofertada = i.cantidad or i.sujeta_disponibilidad)
    ) then
      raise exception 'Solo puedes reducir la cantidad en líneas sujetas a disponibilidad.';
    end if;
    select v_suma_cantidad + coalesce(v_linea.cantidad_ofertada, i.cantidad)
      into v_suma_cantidad
    from public.items_cotizacion i
    where i.id = v_linea.item_id;
  end loop;

  if v_suma_cantidad = 0 then
    raise exception 'La oferta debe incluir al menos una unidad.';
  end if;

  update public.items_cotizacion i
    set precio_ofertado = x.precio_ofertado,
        cantidad_ofertada = x.cantidad_ofertada
  from jsonb_to_recordset(p_lineas) as x(item_id uuid, precio_ofertado numeric, cantidad_ofertada integer)
  where i.id = x.item_id and i.cotizacion_id = p_cotizacion_id;

  select sum(i.precio_ofertado * coalesce(i.cantidad_ofertada, i.cantidad))
    into v_total
  from public.items_cotizacion i
  where i.cotizacion_id = p_cotizacion_id;

  update public.cotizaciones
    set plazo_dias = p_plazo_dias,
        valida_hasta = p_valida_hasta,
        condiciones = p_condiciones,
        estado = 'respondida',
        respondida_at = now(),
        total_ofertado = v_total
  where id = p_cotizacion_id;

  return v_total;
end;
$$;

create or replace function public.rechazar_cotizacion_con_motivo(
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
    raise exception 'Debes iniciar sesión para responder la cotización.';
  end if;
  if p_motivo is null or btrim(p_motivo) = '' or char_length(p_motivo) > 500 then
    raise exception 'El motivo del rechazo debe tener entre 1 y 500 caracteres.';
  end if;

  update public.cotizaciones c
    set estado = 'rechazada',
        motivo_rechazo = btrim(p_motivo)
  from public.proveedores p
  where c.id = p_cotizacion_id
    and p.id = c.proveedor_id
    and p.user_id = auth.uid()
    and c.estado = 'pendiente';

  if not found then
    raise exception 'La cotización ya no está pendiente o no tienes permiso para rechazarla.';
  end if;
end;
$$;

revoke execute on function public.responder_cotizacion_con_oferta(uuid, jsonb, integer, date, text) from public, anon;
grant execute on function public.responder_cotizacion_con_oferta(uuid, jsonb, integer, date, text) to authenticated;
revoke execute on function public.rechazar_cotizacion_con_motivo(uuid, text) from public, anon;
grant execute on function public.rechazar_cotizacion_con_motivo(uuid, text) to authenticated;

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
