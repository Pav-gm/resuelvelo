-- Asigna a los productos que ya existían antes de 20261006000100_catalogo_subcategorias la subcategoría que les da
-- seed.sql. Sin esto, filtrar el catálogo por subcategoría no los encuentra y al editarlos no viene nada precargado.
-- Solo toca productos sin subcategoría y cuya categoría coincide con la de la subcategoría: no pisa lo que un proveedor
-- ya eligió ni un producto que cambió de categoría.
update public.productos p
set subcategoria_id = v.subcategoria_id
from (values
  ('d0000000-0000-0000-0000-000000000001'::uuid, 'plomeria-tuberias'),
  ('d0000000-0000-0000-0000-000000000002'::uuid, 'plomeria-tuberias'),
  ('d0000000-0000-0000-0000-000000000003'::uuid, 'plomeria-griferia'),
  ('d0000000-0000-0000-0000-000000000004'::uuid, 'plomeria-conexiones-y-accesorios'),
  ('d0000000-0000-0000-0000-000000000005'::uuid, 'electricidad-cables-y-conductores'),
  ('d0000000-0000-0000-0000-000000000006'::uuid, 'electricidad-breakers-y-paneles'),
  ('d0000000-0000-0000-0000-000000000007'::uuid, 'ferreteria-pinturas-y-esmaltes'),
  ('d0000000-0000-0000-0000-000000000008'::uuid, 'materiales-cemento-y-mezclas'),
  ('d0000000-0000-0000-0000-000000000009'::uuid, 'materiales-acero-y-varillas'),
  ('d0000000-0000-0000-0000-000000000010'::uuid, 'materiales-bloques-y-ladrillos'),
  ('d0000000-0000-0000-0000-000000000011'::uuid, 'electricidad-iluminacion'),
  ('d0000000-0000-0000-0000-000000000012'::uuid, 'electricidad-canalizacion-y-accesorios'),
  ('d0000000-0000-0000-0000-000000000013'::uuid, 'electricidad-iluminacion'),
  ('d0000000-0000-0000-0000-000000000014'::uuid, 'electricidad-iluminacion'),
  ('d0000000-0000-0000-0000-000000000015'::uuid, 'electricidad-canalizacion-y-accesorios'),
  ('d0000000-0000-0000-0000-000000000016'::uuid, 'automotriz-mecanica-general'),
  ('d0000000-0000-0000-0000-000000000017'::uuid, 'automotriz-mecanica-general'),
  ('d0000000-0000-0000-0000-000000000018'::uuid, 'automotriz-mecanica-general'),
  ('d0000000-0000-0000-0000-000000000019'::uuid, 'automotriz-frenos-y-suspension'),
  ('d0000000-0000-0000-0000-000000000020'::uuid, 'automotriz-aceite-y-filtros')
) as v(id, subcategoria_id)
join public.subcategorias s on s.id = v.subcategoria_id
where p.id = v.id
  and p.subcategoria_id is null
  and p.categoria_id = s.categoria_id;
