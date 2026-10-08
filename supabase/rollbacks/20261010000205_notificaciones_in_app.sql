drop trigger if exists cotizaciones_notificar_insert on public.cotizaciones;
drop trigger if exists cotizaciones_notificar_cambio_estado on public.cotizaciones;
drop function if exists public.crear_notificacion_cotizacion();
drop policy if exists "notificaciones: usuario lee las suyas" on public.notificaciones;
drop policy if exists "notificaciones: usuario marca las suyas" on public.notificaciones;
drop index if exists public.idx_notificaciones_usuario_lectura_fecha;
drop table if exists public.notificaciones;
