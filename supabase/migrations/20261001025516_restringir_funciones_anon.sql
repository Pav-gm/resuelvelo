-- =============================================================
-- PERMISOS DE EJECUCIÓN
-- Las funciones SECURITY DEFINER quedan expuestas en /rest/v1/rpc.
-- =============================================================

-- Funciones de venta: solo usuarios con sesión (además validan auth.uid()).
revoke execute on function public.aceptar_cotizacion(uuid)    from public, anon;
revoke execute on function public.cancelar_venta(uuid)        from public, anon;
revoke execute on function public.confirmar_recepcion(uuid)   from public, anon;
revoke execute on function public.despachar_cotizacion(uuid)  from public, anon;
revoke execute on function public.rechazar_cotizacion(uuid)   from public, anon;

-- Función de trigger: Postgres no exige EXECUTE para dispararlo.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- is_admin() debe seguir ejecutable por anon: las políticas RLS la evalúan
-- también en consultas sin sesión (por ejemplo, el catálogo público).

alter function public.proteger_stock_reservado() set search_path = public;
