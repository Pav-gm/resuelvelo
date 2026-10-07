-- Los productos de SolarTech RD (paneles, baterías, inversor, kit y la evaluación del sistema solar) quedaron en
-- «Iluminación» y «Canalización y accesorios» porque Electricidad no tenía una subcategoría para ellos (hallazgo de la
-- ronda de QA del PR #23). Se crea «Energía solar» y se mueven ahí los cinco, solo si siguen con la subcategoría que les
-- dio 20261007000100: no pisa lo que su proveedor haya elegido desde entonces.
insert into public.subcategorias (id, categoria_id, nombre, slug)
select 'electricidad-energia-solar', c.id, 'Energía solar', 'electricidad-energia-solar'
from public.categorias c
where c.slug = 'electricidad'
on conflict (slug) do nothing;

update public.productos p
set subcategoria_id = 'electricidad-energia-solar'
from (values
  ('d0000000-0000-0000-0000-000000000011'::uuid, 'electricidad-iluminacion'),
  ('d0000000-0000-0000-0000-000000000012'::uuid, 'electricidad-canalizacion-y-accesorios'),
  ('d0000000-0000-0000-0000-000000000013'::uuid, 'electricidad-iluminacion'),
  ('d0000000-0000-0000-0000-000000000014'::uuid, 'electricidad-iluminacion'),
  ('d0000000-0000-0000-0000-000000000015'::uuid, 'electricidad-canalizacion-y-accesorios')
) as v(id, subcategoria_anterior)
where p.id = v.id
  and p.subcategoria_id = v.subcategoria_anterior;
