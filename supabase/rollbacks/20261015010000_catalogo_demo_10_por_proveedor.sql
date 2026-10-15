-- Inversa exacta de la migración: quita los productos añadidos (ids 21 a 100) que no tengan cotizaciones y, de las cinco
-- cuentas demo nuevas (a…0008 a a…0012), las que no tengan cotizaciones ni productos. Borrar el usuario de Auth elimina en
-- cascada su identidad, su perfil, su proveedor y la cobertura de ese proveedor.
delete from public.productos p
where p.id between 'd0000000-0000-0000-0000-000000000021'::uuid and 'd0000000-0000-0000-0000-000000000100'::uuid
  and not exists (
    select 1 from public.items_cotizacion i where i.producto_id = p.id
  );

delete from auth.users u
where u.id in (
    'a0000000-0000-0000-0000-000000000008'::uuid,
    'a0000000-0000-0000-0000-000000000009'::uuid,
    'a0000000-0000-0000-0000-000000000010'::uuid,
    'a0000000-0000-0000-0000-000000000011'::uuid,
    'a0000000-0000-0000-0000-000000000012'::uuid
  )
  and not exists (
    select 1
    from public.proveedores pr
    where pr.user_id = u.id
      and (
        exists (select 1 from public.cotizaciones c where c.proveedor_id = pr.id)
        or exists (select 1 from public.productos p where p.proveedor_id = pr.id)
      )
  );
