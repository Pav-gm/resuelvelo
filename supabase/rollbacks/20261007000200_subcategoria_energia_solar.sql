-- Deshace 20261007000200_subcategoria_energia_solar: devuelve los cinco productos de SolarTech RD a la subcategoría que
-- tenían y borra «Energía solar» si ningún otro producto la usa (si alguno la usa, la subcategoría se queda).
update public.productos p
set subcategoria_id = v.subcategoria_anterior
from (values
  ('d0000000-0000-0000-0000-000000000011'::uuid, 'electricidad-iluminacion'),
  ('d0000000-0000-0000-0000-000000000012'::uuid, 'electricidad-canalizacion-y-accesorios'),
  ('d0000000-0000-0000-0000-000000000013'::uuid, 'electricidad-iluminacion'),
  ('d0000000-0000-0000-0000-000000000014'::uuid, 'electricidad-iluminacion'),
  ('d0000000-0000-0000-0000-000000000015'::uuid, 'electricidad-canalizacion-y-accesorios')
) as v(id, subcategoria_anterior)
where p.id = v.id
  and p.subcategoria_id = 'electricidad-energia-solar';

delete from public.subcategorias s
where s.id = 'electricidad-energia-solar'
  and not exists (select 1 from public.productos p where p.subcategoria_id = s.id);
