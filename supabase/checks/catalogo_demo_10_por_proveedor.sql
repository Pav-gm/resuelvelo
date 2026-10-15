-- Verifica cobertura mínima del catálogo demo sin impedir productos temporales de QA.
do $$
declare
  proveedor record;
  cantidad integer;
begin
  for proveedor in
    select * from (values
      ('b0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'Promeria'),
      ('b0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'Ferretería López'),
      ('b0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000004'::uuid, 'Materiales del Norte'),
      ('b0000000-0000-0000-0000-000000000004'::uuid, 'a0000000-0000-0000-0000-000000000005'::uuid, 'SolarTech RD'),
      ('b0000000-0000-0000-0000-000000000005'::uuid, 'a0000000-0000-0000-0000-000000000006'::uuid, 'AutoChequeo RD'),
      ('b0000000-0000-0000-0000-000000000006'::uuid, 'a0000000-0000-0000-0000-000000000008'::uuid, 'Pinturas Caribe'),
      ('b0000000-0000-0000-0000-000000000007'::uuid, 'a0000000-0000-0000-0000-000000000009'::uuid, 'EcoSolar Dominicana'),
      ('b0000000-0000-0000-0000-000000000008'::uuid, 'a0000000-0000-0000-0000-000000000010'::uuid, 'MecaniExpress RD'),
      ('b0000000-0000-0000-0000-000000000009'::uuid, 'a0000000-0000-0000-0000-000000000011'::uuid, 'Hidrosanitarios del Cibao'),
      ('b0000000-0000-0000-0000-000000000010'::uuid, 'a0000000-0000-0000-0000-000000000012'::uuid, 'Aceros y Cemento del Este')
    ) as demo(proveedor_id, user_id, nombre)
  loop
    if not exists (select 1 from public.proveedores p where p.id = proveedor.proveedor_id and p.user_id = proveedor.user_id and p.nombre_empresa = proveedor.nombre) then
      raise exception 'Falta el proveedor demo % con relación usuario/proveedor esperada.', proveedor.nombre;
    end if;
    select count(*) into cantidad from public.productos p where p.proveedor_id = proveedor.proveedor_id and p.activo;
    if cantidad < 10 then
      raise exception 'El proveedor demo % tiene % productos activos; requiere al menos 10.', proveedor.nombre, cantidad;
    end if;
  end loop;

  if exists (
    select demo.user_id from (values
      ('a0000000-0000-0000-0000-000000000008'::uuid, 'pinturascaribe@demo.com', 'Pinturas Caribe'),
      ('a0000000-0000-0000-0000-000000000009'::uuid, 'ecosolar@demo.com', 'EcoSolar Dominicana'),
      ('a0000000-0000-0000-0000-000000000010'::uuid, 'mecaniexpress@demo.com', 'MecaniExpress RD'),
      ('a0000000-0000-0000-0000-000000000011'::uuid, 'hidrocibao@demo.com', 'Hidrosanitarios del Cibao'),
      ('a0000000-0000-0000-0000-000000000012'::uuid, 'acerosdeleste@demo.com', 'Aceros y Cemento del Este')
    ) as demo(user_id, email, nombre)
    left join auth.users u on u.id = demo.user_id and u.email = demo.email
    left join public.profiles p on p.id = demo.user_id and p.email = demo.email and p.nombre = demo.nombre and p.rol = 'proveedor'
    where u.id is null or p.id is null
  ) then
    raise exception 'Falta una cuenta de Auth o perfil de proveedor demo esperado.';
  end if;
end;
$$;
