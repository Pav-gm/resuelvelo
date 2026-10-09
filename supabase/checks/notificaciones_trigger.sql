-- DO block notificaciones_trigger_contract_check
do $notificaciones_trigger_contract_check$
declare
  v_buyer uuid := gen_random_uuid();
  v_provider_user uuid := gen_random_uuid();
  v_provider uuid := gen_random_uuid();
  v_cotizacion uuid := gen_random_uuid();
  v_count integer;
  v_aviso record;
begin
  begin
    insert into auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values
      (v_buyer, 'authenticated', 'authenticated', v_buyer::text || '@notificaciones.test', '', now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{"nombre":"Comprador de prueba"}'::jsonb, now(), now()),
      (v_provider_user, 'authenticated', 'authenticated', v_provider_user::text || '@notificaciones.test', '', now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{"nombre":"Proveedor de prueba","rol":"proveedor"}'::jsonb, now(), now());

    insert into public.proveedores (id, user_id, nombre_empresa)
    values (v_provider, v_provider_user, 'Proveedor de notificaciones de prueba');

    perform set_config('request.jwt.claim.sub', v_buyer::text, true);
    -- Solo mueve una cotización real existente dentro de la subtransacción que revierte la excepción centinela.
    update public.cotizaciones set numero = -numero where numero = 42;
    insert into public.cotizaciones (id, numero, comprador_id, proveedor_id, estado)
    values (v_cotizacion, 42, v_buyer, v_provider, 'pendiente');

    select count(*) into v_count
    from public.notificaciones
    where cotizacion_id = v_cotizacion;
    if v_count <> 1 then
      raise exception 'Se esperaba un aviso inicial, se encontraron %', v_count;
    end if;

    select * into v_aviso
    from public.notificaciones
    where cotizacion_id = v_cotizacion and tipo = 'nueva_solicitud';
    if not found or v_aviso.user_id <> v_provider_user
      or v_aviso.titulo not like '%#COT-000042%' then
      raise exception 'El aviso de solicitud no tiene destinatario o título esperado';
    end if;

    update public.cotizaciones set estado = 'respondida' where id = v_cotizacion;
    select * into v_aviso from public.notificaciones
    where cotizacion_id = v_cotizacion and tipo = 'cotizacion_respondida';
    if not found or v_aviso.user_id <> v_buyer or v_aviso.titulo not like '%#COT-000042%' then
      raise exception 'El aviso de respuesta no tiene destinatario o título esperado';
    end if;

    perform set_config('request.jwt.claim.sub', v_provider_user::text, true);
    update public.cotizaciones set estado = 'aceptada' where id = v_cotizacion;
    select * into v_aviso from public.notificaciones
    where cotizacion_id = v_cotizacion and tipo = 'cotizacion_aceptada';
    if not found or v_aviso.user_id <> v_buyer or v_aviso.titulo not like '%#COT-000042%' then
      raise exception 'El aviso de aceptación no tiene destinatario o título esperado';
    end if;

    perform set_config('request.jwt.claim.sub', v_buyer::text, true);
    update public.cotizaciones set estado = 'rechazada' where id = v_cotizacion;
    select * into v_aviso from public.notificaciones
    where cotizacion_id = v_cotizacion and tipo = 'cotizacion_rechazada';
    if not found or v_aviso.user_id <> v_provider_user or v_aviso.titulo not like '%#COT-000042%' then
      raise exception 'El aviso de rechazo no tiene destinatario o título esperado';
    end if;

    update public.cotizaciones set estado = 'despachada' where id = v_cotizacion;
    select * into v_aviso from public.notificaciones
    where cotizacion_id = v_cotizacion and tipo = 'cotizacion_despachada';
    if not found or v_aviso.user_id <> v_buyer or v_aviso.titulo not like '%#COT-000042%' then
      raise exception 'El aviso de despacho no tiene destinatario o título esperado';
    end if;

    update public.cotizaciones set estado = 'recibida' where id = v_cotizacion;
    select * into v_aviso from public.notificaciones
    where cotizacion_id = v_cotizacion and tipo = 'cotizacion_recibida';
    if not found or v_aviso.user_id <> v_provider_user or v_aviso.titulo not like '%#COT-000042%' then
      raise exception 'El aviso de recepción no tiene destinatario o título esperado';
    end if;

    update public.cotizaciones
    set estado = 'cancelada', cancelada_por = 'comprador', cancelada_motivo = 'Sin stock'
    where id = v_cotizacion;
    select * into v_aviso from public.notificaciones
    where cotizacion_id = v_cotizacion and tipo = 'cotizacion_cancelada';
    if not found or v_aviso.user_id <> v_provider_user
      or v_aviso.titulo not like '%#COT-000042%'
      or v_aviso.cuerpo not like '%Sin stock%' then
      raise exception 'El aviso de cancelación no tiene destinatario, título o motivo esperado';
    end if;

    select count(*) into v_count from public.notificaciones where cotizacion_id = v_cotizacion;
    if v_count <> 7 then
      raise exception 'Se esperaban siete avisos antes de la repetición de estado, se encontraron %', v_count;
    end if;

    update public.cotizaciones set estado = 'cancelada' where id = v_cotizacion;
    select count(*) into v_count from public.notificaciones where cotizacion_id = v_cotizacion;
    if v_count <> 7 then
      raise exception 'Un estado sin cambios creó otra notificación';
    end if;

    raise exception 'notificaciones_trigger_contract_check_sentinel';
  exception when others then
    if sqlerrm <> 'notificaciones_trigger_contract_check_sentinel' then
      raise;
    end if;
  end;
end;
$notificaciones_trigger_contract_check$;
