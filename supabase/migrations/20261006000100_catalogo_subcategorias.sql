
create table if not exists public.subcategorias (
  id text primary key,
  categoria_id uuid not null references public.categorias(id),
  nombre text not null,
  slug text not null unique,
  unique (categoria_id, id)
);

alter table public.subcategorias enable row level security;
revoke all on public.subcategorias from public, anon, authenticated;
grant select on public.subcategorias to anon, authenticated;
drop policy if exists "subcategorias: lectura pública" on public.subcategorias;
create policy "subcategorias: lectura pública"
  on public.subcategorias for select using (true);

-- Catálogo fijo de subcategorías asociado a los slugs vigentes.
do $$
begin
  if exists (
    select expected.slug
    from (values ('materiales'), ('electricidad'), ('plomeria'), ('ferreteria'), ('automotriz')) expected(slug)
    left join public.categorias c on c.slug = expected.slug
    where c.id is null
  ) then
    raise exception 'Falta una categoría requerida para el catálogo fijo de subcategorías.';
  end if;
end;
$$;

insert into public.subcategorias (id, categoria_id, nombre, slug)
select c.slug || '-' || s.slug_nombre, c.id, s.nombre, c.slug || '-' || s.slug_nombre
from (values
  ('electricidad', 'cables-y-conductores', 'Cables y conductores'),
  ('electricidad', 'tomacorrientes-e-interruptores', 'Tomacorrientes e interruptores'),
  ('electricidad', 'iluminacion', 'Iluminación'),
  ('electricidad', 'breakers-y-paneles', 'Breakers y paneles'),
  ('electricidad', 'canalizacion-y-accesorios', 'Canalización y accesorios'),
  ('ferreteria', 'herramientas-manuales', 'Herramientas manuales'),
  ('ferreteria', 'herramientas-electricas', 'Herramientas eléctricas'),
  ('ferreteria', 'tornilleria-y-fijaciones', 'Tornillería y fijaciones'),
  ('ferreteria', 'pinturas-y-esmaltes', 'Pinturas y esmaltes'),
  ('ferreteria', 'brochas-y-accesorios', 'Brochas y accesorios'),
  ('materiales', 'cemento-y-mezclas', 'Cemento y mezclas'),
  ('materiales', 'bloques-y-ladrillos', 'Bloques y ladrillos'),
  ('materiales', 'acero-y-varillas', 'Acero y varillas'),
  ('materiales', 'madera-y-paneles', 'Madera y paneles'),
  ('materiales', 'arena-grava-y-agregados', 'Arena, grava y agregados'),
  ('plomeria', 'tuberias', 'Tuberías'),
  ('plomeria', 'conexiones-y-accesorios', 'Conexiones y accesorios'),
  ('plomeria', 'griferia', 'Grifería'),
  ('plomeria', 'sanitarios-y-lavamanos', 'Sanitarios y lavamanos'),
  ('plomeria', 'tanques-y-bombas', 'Tanques y bombas'),
  ('automotriz', 'mecanica-general', 'Mecánica general'),
  ('automotriz', 'aceite-y-filtros', 'Aceite y filtros'),
  ('automotriz', 'frenos-y-suspension', 'Frenos y suspensión'),
  ('automotriz', 'baterias-y-electricidad-automotriz', 'Baterías y electricidad automotriz'),
  ('automotriz', 'lavado-y-estetica', 'Lavado y estética')
) as s(categoria_slug, slug_nombre, nombre)
join public.categorias c on c.slug = s.categoria_slug
on conflict (slug) do nothing;

alter table public.productos add column if not exists subcategoria_id text null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'productos_categoria_subcategoria_fkey' and conrelid = 'public.productos'::regclass) then
    alter table public.productos add constraint productos_categoria_subcategoria_fkey
      foreign key (categoria_id, subcategoria_id) references public.subcategorias(categoria_id, id);
  end if;
end;
$$;
