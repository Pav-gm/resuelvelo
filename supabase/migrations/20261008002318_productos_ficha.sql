alter table public.productos
  add column if not exists imagen_url text null,
  add column if not exists sku text null,
  add column if not exists especificaciones text null,
  add column if not exists itbis_incluido boolean not null default true;

insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict do nothing;

create policy "productos storage: lectura pública"
  on storage.objects for select
  using (bucket_id = 'productos');

create policy "productos storage: proveedor inserta en su carpeta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'productos'
    and exists (
      select 1
      from public.proveedores
      where id::text = (storage.foldername(name))[1]
        and user_id = auth.uid()
    )
  );

create policy "productos storage: proveedor elimina de su carpeta"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'productos'
    and exists (
      select 1
      from public.proveedores
      where id::text = (storage.foldername(name))[1]
        and user_id = auth.uid()
    )
  );
