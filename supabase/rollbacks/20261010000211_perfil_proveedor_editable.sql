drop policy if exists "logos storage: proveedor elimina de su carpeta" on storage.objects;
drop policy if exists "logos storage: proveedor inserta en su carpeta" on storage.objects;
drop policy if exists "logos storage: lectura pública" on storage.objects;

delete from storage.buckets
where id = 'logos'
  and not exists (
    select 1 from storage.objects where bucket_id = 'logos'
  );

drop policy if exists "proveedor_zonas: proveedor elimina las suyas" on public.proveedor_zonas;
drop policy if exists "proveedor_zonas: proveedor actualiza las suyas" on public.proveedor_zonas;
drop policy if exists "proveedor_zonas: proveedor inserta las suyas" on public.proveedor_zonas;
drop policy if exists "proveedor_zonas: lectura pública" on public.proveedor_zonas;

drop table if exists public.proveedor_zonas;

alter table public.proveedores
  drop column if exists sitio_web,
  drop column if exists horario,
  drop column if exists whatsapp,
  drop column if exists telefono,
  drop column if exists rnc;
