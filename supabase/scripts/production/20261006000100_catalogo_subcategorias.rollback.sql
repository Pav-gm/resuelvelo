-- ADVERTENCIA: este rollback elimina las asignaciones de subcategoría realizadas desde que se aplicó el cambio.
begin;
alter table public.productos drop constraint if exists productos_categoria_subcategoria_fkey;
alter table public.productos drop column if exists subcategoria_id;
drop table if exists public.subcategorias;
commit;
