-- Elimina solo productos añadidos por la migración que no tengan cotizaciones asociadas.
delete from public.productos p
where p.id between 'd0000000-0000-0000-0000-000000000021'::uuid and 'd0000000-0000-0000-0000-000000000100'::uuid
  and not exists (
    select 1 from public.items_cotizacion i where i.producto_id = p.id
  );
