drop policy if exists "proveedores: admin actualiza verificación" on public.proveedores;
drop trigger if exists sincronizar_verificacion_proveedor on public.proveedores;
drop function if exists public.solicitar_verificacion_proveedor();
drop function if exists public.sincronizar_verificacion_proveedor();
alter table public.proveedores
  drop constraint if exists proveedores_verificacion_estado_check,
  drop column if exists verificado_at,
  drop column if exists verificacion_solicitada_at,
  drop column if exists verificacion_nota,
  drop column if exists verificacion_estado;
