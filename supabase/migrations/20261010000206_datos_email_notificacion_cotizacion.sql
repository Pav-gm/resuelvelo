create or replace function public.datos_email_notificacion_cotizacion(
  p_cotizacion_id uuid,
  p_tipo text
)
returns table(
  destinatario_email text,
  contraparte_nombre text,
  numero bigint,
  total_estimado numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_cotizacion public.cotizaciones%rowtype;
  v_proveedor_usuario uuid;
  v_destinatario uuid;
begin
  if v_usuario is null then
    raise exception 'Se requiere una sesión autenticada.';
  end if;

  if p_tipo not in (
    'nueva_solicitud', 'cotizacion_respondida', 'cotizacion_aceptada',
    'cotizacion_rechazada', 'cotizacion_despachada', 'cotizacion_recibida',
    'cotizacion_cancelada'
  ) then
    raise exception 'Tipo de notificación no válido.';
  end if;

  select c.* into v_cotizacion
  from public.cotizaciones c
  where c.id = p_cotizacion_id;

  if not found then
    raise exception 'La cotización no existe.';
  end if;

  select p.user_id into v_proveedor_usuario
  from public.proveedores p
  where p.id = v_cotizacion.proveedor_id;

  if v_usuario <> v_cotizacion.comprador_id and v_usuario <> v_proveedor_usuario then
    raise exception 'No tienes acceso a esta cotización.';
  end if;

  if (p_tipo = 'nueva_solicitud' and v_cotizacion.estado = 'pendiente' and v_usuario = v_cotizacion.comprador_id)
    or (p_tipo = 'cotizacion_respondida' and v_cotizacion.estado = 'respondida' and v_usuario = v_proveedor_usuario)
    or (p_tipo = 'cotizacion_aceptada' and v_cotizacion.estado = 'aceptada')
    or (p_tipo = 'cotizacion_rechazada' and v_cotizacion.estado = 'rechazada')
    or (p_tipo = 'cotizacion_despachada' and v_cotizacion.estado = 'despachada' and v_usuario = v_proveedor_usuario)
    or (p_tipo = 'cotizacion_recibida' and v_cotizacion.estado = 'recibida' and v_usuario = v_cotizacion.comprador_id)
    or (p_tipo = 'cotizacion_cancelada' and v_cotizacion.estado = 'cancelada'
      and v_cotizacion.cancelada_por in ('comprador', 'proveedor')) then
    null;
  else
    raise exception 'El estado de la cotización no corresponde a la notificación.';
  end if;

  if p_tipo in ('nueva_solicitud', 'cotizacion_recibida') then
    v_destinatario := v_proveedor_usuario;
  elsif p_tipo in ('cotizacion_respondida', 'cotizacion_despachada') then
    v_destinatario := v_cotizacion.comprador_id;
  elsif p_tipo in ('cotizacion_aceptada', 'cotizacion_rechazada') then
    v_destinatario := case when v_usuario = v_proveedor_usuario
      then v_cotizacion.comprador_id else v_proveedor_usuario end;
  else
    v_destinatario := case when v_cotizacion.cancelada_por = 'comprador'
      then v_proveedor_usuario else v_cotizacion.comprador_id end;
  end if;

  select pr.email into destinatario_email
  from public.profiles pr
  where pr.id = v_destinatario;

  if v_destinatario = v_proveedor_usuario then
    select pr.nombre into contraparte_nombre
    from public.profiles pr
    where pr.id = v_cotizacion.comprador_id;
  else
    select p.nombre_empresa into contraparte_nombre
    from public.proveedores p
    where p.id = v_cotizacion.proveedor_id;
  end if;

  if destinatario_email is null or btrim(destinatario_email) = ''
    or contraparte_nombre is null or btrim(contraparte_nombre) = '' then
    raise exception 'Faltan datos obligatorios del destinatario del correo.';
  end if;

  numero := v_cotizacion.numero;
  total_estimado := v_cotizacion.total_estimado;
  return next;
end;
$$;

comment on function public.datos_email_notificacion_cotizacion(uuid, text) is
  'Devuelve de forma autenticada los datos mínimos para notificar por correo a la contraparte de una cotización.';

revoke all on function public.datos_email_notificacion_cotizacion(uuid, text) from public, anon, authenticated;
grant execute on function public.datos_email_notificacion_cotizacion(uuid, text) to authenticated;
