drop function public.aceptar_oferta_de_solicitud(uuid);
drop function public.crear_solicitud_a_proveedores(text, text, date, uuid[], jsonb);

create or replace function public.responder_cotizacion_con_oferta(
  p_cotizacion_id uuid, p_lineas jsonb, p_plazo_dias integer, p_valida_hasta date, p_condiciones text
)
returns numeric language plpgsql security definer set search_path = public
as $$
declare
  v_estado text; v_total numeric; v_items integer; v_lineas integer; v_linea record; v_suma_cantidad integer := 0;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión para responder la cotización.'; end if;
  select c.estado into v_estado from public.cotizaciones c join public.proveedores p on p.id = c.proveedor_id
    where c.id = p_cotizacion_id and p.user_id = auth.uid() for update of c;
  if not found then raise exception 'No tienes permiso para responder esta cotización.'; end if;
  if v_estado is distinct from 'pendiente' then raise exception 'La cotización ya no está pendiente.'; end if;
  if p_plazo_dias is null or p_plazo_dias not between 0 and 90 then raise exception 'El plazo debe estar entre 0 y 90 días.'; end if;
  if p_valida_hasta is null or p_valida_hasta <= current_date then raise exception 'La fecha de validez debe ser futura.'; end if;
  if jsonb_typeof(p_lineas) is distinct from 'array' or jsonb_array_length(p_lineas) = 0 then raise exception 'La oferta debe incluir todas las líneas de la cotización.'; end if;
  select count(*) into v_items from public.items_cotizacion i where i.cotizacion_id = p_cotizacion_id;
  select count(*) into v_lineas from jsonb_to_recordset(p_lineas) as x(item_id uuid, precio_ofertado numeric, cantidad_ofertada integer);
  if v_items = 0 or v_lineas <> v_items then raise exception 'La oferta debe incluir cada línea de la cotización una sola vez.'; end if;
  for v_linea in select x.item_id, x.precio_ofertado, x.cantidad_ofertada from jsonb_to_recordset(p_lineas) as x(item_id uuid, precio_ofertado numeric, cantidad_ofertada integer) loop
    if v_linea.item_id is null or v_linea.precio_ofertado is null or v_linea.precio_ofertado <= 0 or v_linea.precio_ofertado::text in ('NaN', 'Infinity', '-Infinity') then raise exception 'Cada precio ofertado debe ser mayor que 0.'; end if;
    if (select count(*) from jsonb_to_recordset(p_lineas) as x(item_id uuid, precio_ofertado numeric, cantidad_ofertada integer) where x.item_id = v_linea.item_id) <> 1 then raise exception 'La oferta debe incluir cada línea de la cotización una sola vez.'; end if;
    if not exists (select 1 from public.items_cotizacion i where i.id = v_linea.item_id and i.cotizacion_id = p_cotizacion_id) then raise exception 'La oferta debe incluir cada línea de la cotización una sola vez.'; end if;
    if v_linea.cantidad_ofertada is not null and not exists (select 1 from public.items_cotizacion i where i.id = v_linea.item_id and i.cotizacion_id = p_cotizacion_id and v_linea.cantidad_ofertada between 0 and i.cantidad and (v_linea.cantidad_ofertada = i.cantidad or i.sujeta_disponibilidad)) then raise exception 'Solo puedes reducir la cantidad en líneas sujetas a disponibilidad.'; end if;
    select v_suma_cantidad + coalesce(v_linea.cantidad_ofertada, i.cantidad) into v_suma_cantidad from public.items_cotizacion i where i.id = v_linea.item_id;
  end loop;
  if v_suma_cantidad = 0 then raise exception 'La oferta debe incluir al menos una unidad.'; end if;
  update public.items_cotizacion i set precio_ofertado = x.precio_ofertado, cantidad_ofertada = x.cantidad_ofertada from jsonb_to_recordset(p_lineas) as x(item_id uuid, precio_ofertado numeric, cantidad_ofertada integer) where i.id = x.item_id and i.cotizacion_id = p_cotizacion_id;
  select sum(i.precio_ofertado * coalesce(i.cantidad_ofertada, i.cantidad)) into v_total from public.items_cotizacion i where i.cotizacion_id = p_cotizacion_id;
  update public.cotizaciones set plazo_dias = p_plazo_dias, valida_hasta = p_valida_hasta, condiciones = p_condiciones, estado = 'respondida', respondida_at = now(), total_ofertado = v_total where id = p_cotizacion_id;
  return v_total;
end;
$$;

create or replace function public.aceptar_oferta_cotizacion(p_cotizacion_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare v_estado text; v_valida_hasta date; v_item record; v_stock integer; v_reservado integer; v_nombre text;
begin
  if auth.uid() is null then raise exception 'No autorizado.'; end if;
  select c.estado, c.valida_hasta into v_estado, v_valida_hasta from public.cotizaciones c where c.id = p_cotizacion_id and c.comprador_id = auth.uid() for update;
  if not found then raise exception 'No tienes permiso para decidir esta cotización.'; end if;
  if v_estado is distinct from 'respondida' then raise exception 'La cotización ya no está respondida.'; end if;
  if v_valida_hasta is null or v_valida_hasta < current_date then raise exception 'La oferta está vencida.'; end if;
  if not exists (select 1 from public.items_cotizacion where cotizacion_id = p_cotizacion_id) then raise exception 'La oferta no tiene líneas.'; end if;
  if (select coalesce(sum(coalesce(i.cantidad_ofertada, i.cantidad)), 0) from public.items_cotizacion i where i.cotizacion_id = p_cotizacion_id) < 1 then raise exception 'La oferta debe incluir al menos una unidad.'; end if;
  if exists (select 1 from public.items_cotizacion i where i.cotizacion_id = p_cotizacion_id and (i.precio_ofertado is null or i.precio_ofertado <= 0)) then raise exception 'La oferta contiene una línea sin precio ofertado.'; end if;
  for v_item in select distinct i.producto_id from public.items_cotizacion i where i.cotizacion_id = p_cotizacion_id order by i.producto_id loop perform 1 from public.productos p where p.id = v_item.producto_id for update; end loop;
  for v_item in select i.producto_id, sum(coalesce(i.cantidad_ofertada, i.cantidad)) as cantidad from public.items_cotizacion i where i.cotizacion_id = p_cotizacion_id group by i.producto_id order by i.producto_id loop
    select p.stock, p.stock_reservado, p.nombre into v_stock, v_reservado, v_nombre from public.productos p where p.id = v_item.producto_id;
    if v_stock is null then raise exception 'Un producto de la cotización ya no existe.'; end if;
    if v_stock - coalesce(v_reservado, 0) < v_item.cantidad then raise exception 'No hay stock disponible de % (disponible: %, confirmado: %).', v_nombre, v_stock - coalesce(v_reservado, 0), v_item.cantidad; end if;
  end loop;
  perform set_config('app.reserva_interna', '1', true);
  update public.items_cotizacion i set cantidad_confirmada = coalesce(i.cantidad_ofertada, i.cantidad), precio_unitario = i.precio_ofertado where i.cotizacion_id = p_cotizacion_id;
  for v_item in select i.producto_id, sum(i.cantidad_confirmada) as cantidad from public.items_cotizacion i where i.cotizacion_id = p_cotizacion_id group by i.producto_id order by i.producto_id loop
    update public.productos set stock_reservado = coalesce(stock_reservado, 0) + v_item.cantidad where id = v_item.producto_id;
  end loop;
  update public.cotizaciones set estado = 'aceptada', aceptada_at = now() where id = p_cotizacion_id;
end;
$$;

drop policy "solicitudes: comprador crea las suyas" on public.solicitudes;
drop policy "solicitudes: comprador ve las suyas" on public.solicitudes;
drop index public.cotizaciones_solicitud_id_idx;
alter table public.items_cotizacion drop constraint items_cotizacion_producto_o_descripcion_check;
alter table public.items_cotizacion drop column unidad;
alter table public.items_cotizacion drop column descripcion;
alter table public.items_cotizacion alter column producto_id set not null;
alter table public.cotizaciones drop column solicitud_id;
drop table public.solicitudes;
