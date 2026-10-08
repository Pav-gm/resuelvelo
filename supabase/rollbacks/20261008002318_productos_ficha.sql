drop policy if exists "productos storage: lectura pública" on storage.objects;
drop policy if exists "productos storage: proveedor inserta en su carpeta" on storage.objects;
drop policy if exists "productos storage: proveedor elimina de su carpeta" on storage.objects;

do $$
begin
  if exists (select 1 from storage.buckets where id = 'productos')
     and not exists (select 1 from storage.objects where bucket_id = 'productos') then
    delete from storage.buckets where id = 'productos';
  end if;
end;
$$;

alter table public.productos
  drop column if exists sku,
  drop column if exists especificaciones,
  drop column if exists itbis_incluido;
