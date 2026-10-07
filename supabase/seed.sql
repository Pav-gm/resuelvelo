-- =============================================================
-- Resuélvelo — Seed COMPLETO (estado ideal para demo)
-- Ejecutar DESPUÉS de schema.sql, en Supabase → SQL Editor.
-- Es idempotente: se puede re-ejecutar sin duplicar datos.
--
-- Crea: 7 usuarios de Auth + profiles + 5 proveedores
--       + 20 productos + cotizaciones de ejemplo.
--
-- CREDENCIALES DEMO (password para todos):  Demo1234!
--   comprador@demo.com    (comprador)
--   promeria@demo.com     (proveedor — Promeria)
--   lopez@demo.com        (proveedor — Ferretería López)
--   norte@demo.com        (proveedor — Materiales del Norte)
--   admin@demo.com        (admin — sin fila en proveedores)
--   solartech@demo.com    (proveedor — SolarTech RD)
--   autochequeo@demo.com  (proveedor — AutoChequeo RD)
-- =============================================================

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- =============================================================
-- CATEGORÍAS
-- =============================================================
insert into public.categorias (id, nombre, slug, icono) values
  ('c1000000-0000-0000-0000-000000000001', 'Materiales de construcción', 'materiales',   '🧱'),
  ('c1000000-0000-0000-0000-000000000002', 'Electricidad',               'electricidad', '⚡'),
  ('c1000000-0000-0000-0000-000000000003', 'Plomería',                   'plomeria',     '🔧'),
  ('c1000000-0000-0000-0000-000000000004', 'Ferretería y pinturas',      'ferreteria',   '🔨'),
  ('c1000000-0000-0000-0000-000000000005', 'Servicios automotrices',     'automotriz',   '🚗')
on conflict (slug) do nothing;

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
  ('electricidad', 'energia-solar', 'Energía solar'),
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

-- =============================================================
-- USUARIOS DE AUTH  (el trigger on_auth_user_created crea el profile)
-- =============================================================
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'comprador@demo.com', crypt('Demo1234!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}',
   '{"nombre":"Construcciones Herrera","rol":"comprador"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'promeria@demo.com', crypt('Demo1234!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}',
   '{"nombre":"Promeria","rol":"proveedor"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003',
   'authenticated', 'authenticated', 'lopez@demo.com', crypt('Demo1234!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}',
   '{"nombre":"Ferretería López","rol":"proveedor"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004',
   'authenticated', 'authenticated', 'norte@demo.com', crypt('Demo1234!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}',
   '{"nombre":"Materiales del Norte","rol":"proveedor"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000007',
   'authenticated', 'authenticated', 'admin@demo.com', crypt('Demo1234!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}',
   '{"nombre":"Administración Resuélvelo","rol":"admin"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- Identidades (necesarias para login con email en GoTrue)
insert into auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values
  ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   '{"sub":"a0000000-0000-0000-0000-000000000001","email":"comprador@demo.com"}', 'email', now(), now(), now()),
  ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002',
   '{"sub":"a0000000-0000-0000-0000-000000000002","email":"promeria@demo.com"}', 'email', now(), now(), now()),
  ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003',
   '{"sub":"a0000000-0000-0000-0000-000000000003","email":"lopez@demo.com"}', 'email', now(), now(), now()),
  ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004',
   '{"sub":"a0000000-0000-0000-0000-000000000004","email":"norte@demo.com"}', 'email', now(), now(), now()),
  ('a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000007',
   '{"sub":"a0000000-0000-0000-0000-000000000007","email":"admin@demo.com"}', 'email', now(), now(), now())
on conflict do nothing;

-- Asegurar profiles (por si el trigger no estuviera activo al crear los users)
insert into public.profiles (id, email, nombre, rol) values
  ('a0000000-0000-0000-0000-000000000001', 'comprador@demo.com', 'Construcciones Herrera', 'comprador'),
  ('a0000000-0000-0000-0000-000000000002', 'promeria@demo.com',  'Promeria',               'proveedor'),
  ('a0000000-0000-0000-0000-000000000003', 'lopez@demo.com',     'Ferretería López',       'proveedor'),
  ('a0000000-0000-0000-0000-000000000004', 'norte@demo.com',     'Materiales del Norte',   'proveedor'),
  ('a0000000-0000-0000-0000-000000000007', 'admin@demo.com',     'Administración Resuélvelo', 'admin')
on conflict (id) do nothing;

-- =============================================================
-- PROVEEDORES
-- =============================================================
insert into public.proveedores (id, user_id, nombre_empresa, descripcion, ciudad, verificado) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
   'Promeria', 'Especialistas en plomería y sistemas hidráulicos.', 'Santo Domingo', true),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003',
   'Ferretería López', 'Ferretería con más de 20 años en el mercado.', 'Santiago', true),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004',
   'Materiales del Norte', 'Distribuidor de materiales de construcción a granel.', 'La Vega', true)
on conflict (id) do nothing;

-- =============================================================
-- PRODUCTOS
-- =============================================================
insert into public.productos (id, proveedor_id, categoria_id, nombre, descripcion, precio, unidad, stock, subcategoria_id) values
  -- Promeria — plomería
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003',
   'Tubo PVC 4" x 6m (sanitario)', 'Tubería PVC sanitaria cédula 40, para desagüe y alcantarillado.', 680.00, 'unidad', 120, 'plomeria-tuberias'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003',
   'Tubo PVC 1/2" x 6m (presión)', null, 180.00, 'unidad', 350, 'plomeria-tuberias'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003',
   'Llave de paso esférica 1/2" (bronce)', null, 320.00, 'unidad', 200, 'plomeria-griferia'),
  ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003',
   'Pegamento PVC Tangit 237ml', null, 290.00, 'frasco', 0, 'plomeria-conexiones-y-accesorios'),
  -- Ferretería López — electricidad y ferretería
  ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002',
   'Cable eléctrico THHN 12 AWG (rollo 100m)', null, 3200.00, 'rollo', 45, 'electricidad-cables-y-conductores'),
  ('d0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002',
   'Breaker Square D 20A 1 polo', null, 580.00, 'unidad', 80, 'electricidad-breakers-y-paneles'),
  ('d0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000004',
   'Pintura acrílica interior (cubo 5 galones)', null, 2800.00, 'cubo', 25, 'ferreteria-pinturas-y-esmaltes'),
  -- Materiales del Norte — construcción
  ('d0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001',
   'Cemento Portland Tipo I (42.5 kg)', 'Saco de cemento Portland gris, resistencia mínima 42.5 MPa.', 850.00, 'saco', 500, 'materiales-cemento-y-mezclas'),
  ('d0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001',
   'Varilla de hierro 3/8" x 6m', null, 420.00, 'unidad', 300, 'materiales-acero-y-varillas'),
  ('d0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001',
   'Bloques de hormigón 6" (pallet x 100)', null, 4800.00, 'pallet', 30, 'materiales-bloques-y-ladrillos')
on conflict (id) do update set subcategoria_id = excluded.subcategoria_id;

-- =============================================================
-- COTIZACIONES DE EJEMPLO  (comprador → proveedores, varios estados)
-- =============================================================
insert into public.cotizaciones (id, comprador_id, proveedor_id, estado, mensaje, total_estimado) values
  -- Promeria: pendiente (para responder en la demo)
  ('e0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'pendiente',  'Necesito estos materiales para una obra en Santo Domingo Este.', 1040.00),
  -- Promeria: pendiente (se acepta desde la demo para reservar stock)
  ('e0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'pendiente',  'Pedido recurrente de plomería.', 640.00),
  -- Ferretería López: respondida
  ('e0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
   'respondida', '¿Tienen disponibilidad inmediata?', 3200.00),
  -- Materiales del Norte: rechazada
  ('e0000000-0000-0000-0000-000000000004',
   'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'rechazada',  'Cotización para proyecto grande.', 9600.00)
on conflict (id) do nothing;

insert into public.items_cotizacion (id, cotizacion_id, producto_id, cantidad, precio_unitario) values
  -- e1 (Promeria, pendiente)
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 1, 680.00),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 2, 180.00),
  -- e2 (Promeria, aceptada)
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 2, 320.00),
  -- e3 (Ferretería López, respondida)
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000005', 1, 3200.00),
  -- e4 (Materiales del Norte, rechazada)
  ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000010', 2, 4800.00)
on conflict (id) do nothing;

-- =============================================================
-- PROVEEDORES DE SERVICIOS ADICIONALES
--   SolarTech RD     — energía solar / eléctrica
--   AutoChequeo RD   — evaluación automotriz
-- Credenciales (password Demo1234!):
--   solartech@demo.com   (proveedor)
--   autochequeo@demo.com (proveedor)
-- =============================================================

-- Usuarios de Auth
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000005',
   'authenticated', 'authenticated', 'solartech@demo.com', crypt('Demo1234!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}',
   '{"nombre":"SolarTech RD","rol":"proveedor"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000006',
   'authenticated', 'authenticated', 'autochequeo@demo.com', crypt('Demo1234!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}',
   '{"nombre":"AutoChequeo RD","rol":"proveedor"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values
  ('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005',
   '{"sub":"a0000000-0000-0000-0000-000000000005","email":"solartech@demo.com"}', 'email', now(), now(), now()),
  ('a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006',
   '{"sub":"a0000000-0000-0000-0000-000000000006","email":"autochequeo@demo.com"}', 'email', now(), now(), now())
on conflict do nothing;

insert into public.profiles (id, email, nombre, rol) values
  ('a0000000-0000-0000-0000-000000000005', 'solartech@demo.com',   'SolarTech RD',   'proveedor'),
  ('a0000000-0000-0000-0000-000000000006', 'autochequeo@demo.com', 'AutoChequeo RD', 'proveedor')
on conflict (id) do nothing;

-- Proveedores
insert into public.proveedores (id, user_id, nombre_empresa, descripcion, ciudad, verificado) values
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005',
   'SolarTech RD',
   'Evaluación de equipos eléctricos, instalación de inversores, paneles solares y baterías. Soluciones de energía renovable llave en mano.',
   'Santo Domingo', true),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006',
   'AutoChequeo RD',
   'Evaluación automotriz, chequeo pre-compra, diagnóstico computarizado e inspección de carros y motocicletas.',
   'Santiago', true)
on conflict (id) do nothing;

-- Productos / servicios — SolarTech RD (categoría: electricidad)
insert into public.productos (id, proveedor_id, categoria_id, nombre, descripcion, precio, unidad, stock, subcategoria_id) values
  ('d0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002',
   'Evaluación de sistema eléctrico y consumo', 'Visita técnica para evaluar instalación y dimensionar el sistema solar.', 2500.00, 'servicio', 50, 'electricidad-energia-solar'),
  ('d0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002',
   'Inversor híbrido 5kW (instalación incluida)', 'Inversor híbrido con instalación y configuración profesional.', 78000.00, 'unidad', 12, 'electricidad-energia-solar'),
  ('d0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002',
   'Panel solar monocristalino 550W', 'Panel de alta eficiencia con 25 años de garantía.', 12500.00, 'unidad', 80, 'electricidad-energia-solar'),
  ('d0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002',
   'Batería de litio 5kWh', 'Banco de baterías de litio para respaldo de energía.', 95000.00, 'unidad', 15, 'electricidad-energia-solar'),
  ('d0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002',
   'Kit solar residencial 3kW llave en mano', 'Paneles, inversor, estructura e instalación completa.', 285000.00, 'kit', 6, 'electricidad-energia-solar')
on conflict (id) do update set subcategoria_id = excluded.subcategoria_id;

-- Productos / servicios — AutoChequeo RD (categoría: automotriz)
insert into public.productos (id, proveedor_id, categoria_id, nombre, descripcion, precio, unidad, stock, subcategoria_id) values
  ('d0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005',
   'Chequeo pre-compra de vehículo', 'Inspección completa antes de comprar un carro usado.', 3500.00, 'servicio', 100, 'automotriz-mecanica-general'),
  ('d0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005',
   'Diagnóstico computarizado (scanner OBD-II)', 'Lectura y análisis de códigos de falla del vehículo.', 1800.00, 'servicio', 100, 'automotriz-mecanica-general'),
  ('d0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005',
   'Inspección técnica de motocicleta', 'Revisión de frenos, motor, transmisión y eléctrico.', 1200.00, 'servicio', 100, 'automotriz-mecanica-general'),
  ('d0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005',
   'Evaluación de chasis y suspensión', 'Diagnóstico de tren delantero, amortiguadores y alineación.', 2200.00, 'servicio', 100, 'automotriz-frenos-y-suspension'),
  ('d0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005',
   'Cambio de aceite y filtros (mano de obra)', 'Servicio de mantenimiento preventivo, no incluye insumos.', 1500.00, 'servicio', 100, 'automotriz-aceite-y-filtros')
on conflict (id) do update set subcategoria_id = excluded.subcategoria_id;
