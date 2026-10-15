-- Verifica que la migración dejó sus productos demo (ids 21 a 100) activos en cada proveedor, sin depender de los 20
-- productos originales (en producción alguno puede estar archivado) ni impedir productos temporales de QA.
-- Mínimo por proveedor = productos que añade la migración: 6, 7, 7, 5 y 5 a los cinco existentes y 10 a cada nuevo.
do $$
declare
  proveedor record;
  cantidad integer;
begin
  for proveedor in
    select * from (values
      ('b0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'Promeria', 6),
      ('b0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'Ferretería López', 7),
      ('b0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000004'::uuid, 'Materiales del Norte', 7),
      ('b0000000-0000-0000-0000-000000000004'::uuid, 'a0000000-0000-0000-0000-000000000005'::uuid, 'SolarTech RD', 5),
      ('b0000000-0000-0000-0000-000000000005'::uuid, 'a0000000-0000-0000-0000-000000000006'::uuid, 'AutoChequeo RD', 5),
      ('b0000000-0000-0000-0000-000000000006'::uuid, 'a0000000-0000-0000-0000-000000000008'::uuid, 'Pinturas Caribe', 10),
      ('b0000000-0000-0000-0000-000000000007'::uuid, 'a0000000-0000-0000-0000-000000000009'::uuid, 'EcoSolar Dominicana', 10),
      ('b0000000-0000-0000-0000-000000000008'::uuid, 'a0000000-0000-0000-0000-000000000010'::uuid, 'MecaniExpress RD', 10),
      ('b0000000-0000-0000-0000-000000000009'::uuid, 'a0000000-0000-0000-0000-000000000011'::uuid, 'Hidrosanitarios del Cibao', 10),
      ('b0000000-0000-0000-0000-000000000010'::uuid, 'a0000000-0000-0000-0000-000000000012'::uuid, 'Aceros y Cemento del Este', 10)
    ) as demo(proveedor_id, user_id, nombre, minimo)
  loop
    if not exists (select 1 from public.proveedores p where p.id = proveedor.proveedor_id and p.user_id = proveedor.user_id and p.nombre_empresa = proveedor.nombre) then
      raise exception 'Falta el proveedor demo % con relación usuario/proveedor esperada.', proveedor.nombre;
    end if;
    select count(*) into cantidad from public.productos p
    where p.proveedor_id = proveedor.proveedor_id and p.activo
      and p.id between 'd0000000-0000-0000-0000-000000000021'::uuid and 'd0000000-0000-0000-0000-000000000100'::uuid;
    if cantidad < proveedor.minimo then
      raise exception 'El proveedor demo % tiene % productos demo activos añadidos por la migración; requiere al menos %.', proveedor.nombre, cantidad, proveedor.minimo;
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
