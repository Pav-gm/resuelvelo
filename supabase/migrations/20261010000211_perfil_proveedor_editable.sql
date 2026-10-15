alter table public.proveedores
  add column rnc text null,
  add column telefono text null,
  add column whatsapp text null,
  add column horario text null,
  add column sitio_web text null;

create table public.proveedor_zonas (
  proveedor_id uuid not null references public.proveedores(id) on delete cascade,
  provincia text not null,
  primary key (proveedor_id, provincia)
);

alter table public.proveedor_zonas enable row level security;
grant select on public.proveedor_zonas to anon, authenticated;
grant insert, update, delete on public.proveedor_zonas to authenticated;

create policy "proveedor_zonas: lectura pública"
  on public.proveedor_zonas for select
  using (true);

create policy "proveedor_zonas: proveedor inserta las suyas"
  on public.proveedor_zonas for insert to authenticated
  with check (
    exists (
      select 1 from public.proveedores
      where id = proveedor_id and user_id = auth.uid()
    )
  );

create policy "proveedor_zonas: proveedor actualiza las suyas"
  on public.proveedor_zonas for update to authenticated
  using (
    exists (
      select 1 from public.proveedores
      where id = proveedor_id and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.proveedores
      where id = proveedor_id and user_id = auth.uid()
    )
  );

create policy "proveedor_zonas: proveedor elimina las suyas"
  on public.proveedor_zonas for delete to authenticated
  using (
    exists (
      select 1 from public.proveedores
      where id = proveedor_id and user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict do nothing;

create policy "logos storage: lectura pública"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "logos storage: proveedor inserta en su carpeta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and exists (
      select 1 from public.proveedores
      where id::text = (storage.foldername(name))[1]
        and user_id = auth.uid()
    )
  );

create policy "logos storage: proveedor elimina de su carpeta"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos'
    and exists (
      select 1 from public.proveedores
      where id::text = (storage.foldername(name))[1]
        and user_id = auth.uid()
    )
  );
