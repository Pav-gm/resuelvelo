-- =============================================================
-- Resuélvelo — Seed COMPLETO (estado ideal para demo)
-- Ejecutar DESPUÉS de schema.sql, en Supabase → SQL Editor.
-- Es idempotente: se puede re-ejecutar sin duplicar datos.
--
-- Crea: 12 usuarios de Auth + profiles + 10 proveedores
--       + 100 productos + cotizaciones de ejemplo.
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
alter table public.proveedores disable trigger sincronizar_verificacion_proveedor;
insert into public.proveedores (id, user_id, nombre_empresa, descripcion, ciudad, verificado, verificacion_estado, verificado_at) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
   'Promeria', 'Especialistas en plomería y sistemas hidráulicos.', 'Santo Domingo', true, 'verificado', '2026-01-02T00:00:00Z'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003',
   'Ferretería López', 'Ferretería con más de 20 años en el mercado.', 'Santiago', true, 'verificado', '2026-01-02T00:00:00Z'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004',
   'Materiales del Norte', 'Distribuidor de materiales de construcción a granel.', 'La Vega', true, 'verificado', '2026-01-02T00:00:00Z')
on conflict (id) do nothing;
alter table public.proveedores enable trigger sincronizar_verificacion_proveedor;

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
alter table public.proveedores disable trigger sincronizar_verificacion_proveedor;
insert into public.proveedores (id, user_id, nombre_empresa, descripcion, ciudad, verificado, verificacion_estado, verificado_at) values
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005',
   'SolarTech RD',
   'Evaluación de equipos eléctricos, instalación de inversores, paneles solares y baterías. Soluciones de energía renovable llave en mano.',
   'Santo Domingo', true, 'verificado', '2026-01-02T00:00:00Z'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006',
   'AutoChequeo RD',
   'Evaluación automotriz, chequeo pre-compra, diagnóstico computarizado e inspección de carros y motocicletas.',
   'Santiago', true, 'verificado', '2026-01-02T00:00:00Z')
on conflict (id) do nothing;
alter table public.proveedores enable trigger sincronizar_verificacion_proveedor;

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

-- Catálogo ampliado de demostración (idempotente).
-- Cuentas, proveedores, cobertura y 80 productos adicionales del catálogo demo.
insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change,email_change_token_new) values
('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000008','authenticated','authenticated','pinturascaribe@demo.com',crypt('Demo1234!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"nombre":"Pinturas Caribe","rol":"proveedor"}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000009','authenticated','authenticated','ecosolar@demo.com',crypt('Demo1234!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"nombre":"EcoSolar Dominicana","rol":"proveedor"}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000010','authenticated','authenticated','mecaniexpress@demo.com',crypt('Demo1234!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"nombre":"MecaniExpress RD","rol":"proveedor"}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000011','authenticated','authenticated','hidrocibao@demo.com',crypt('Demo1234!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"nombre":"Hidrosanitarios del Cibao","rol":"proveedor"}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000012','authenticated','authenticated','acerosdeleste@demo.com',crypt('Demo1234!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"nombre":"Aceros y Cemento del Este","rol":"proveedor"}',now(),now(),'','','','')
on conflict (id) do nothing;
insert into auth.identities (provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at) values
('a0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000008','{"sub":"a0000000-0000-0000-0000-000000000008","email":"pinturascaribe@demo.com"}','email',now(),now(),now()),
('a0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000009','{"sub":"a0000000-0000-0000-0000-000000000009","email":"ecosolar@demo.com"}','email',now(),now(),now()),
('a0000000-0000-0000-0000-000000000010','a0000000-0000-0000-0000-000000000010','{"sub":"a0000000-0000-0000-0000-000000000010","email":"mecaniexpress@demo.com"}','email',now(),now(),now()),
('a0000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000011','{"sub":"a0000000-0000-0000-0000-000000000011","email":"hidrocibao@demo.com"}','email',now(),now(),now()),
('a0000000-0000-0000-0000-000000000012','a0000000-0000-0000-0000-000000000012','{"sub":"a0000000-0000-0000-0000-000000000012","email":"acerosdeleste@demo.com"}','email',now(),now(),now())
on conflict do nothing;
insert into public.profiles (id,email,nombre,rol) values
('a0000000-0000-0000-0000-000000000008','pinturascaribe@demo.com','Pinturas Caribe','proveedor'),
('a0000000-0000-0000-0000-000000000009','ecosolar@demo.com','EcoSolar Dominicana','proveedor'),
('a0000000-0000-0000-0000-000000000010','mecaniexpress@demo.com','MecaniExpress RD','proveedor'),
('a0000000-0000-0000-0000-000000000011','hidrocibao@demo.com','Hidrosanitarios del Cibao','proveedor'),
('a0000000-0000-0000-0000-000000000012','acerosdeleste@demo.com','Aceros y Cemento del Este','proveedor')
on conflict (id) do nothing;
alter table public.proveedores disable trigger sincronizar_verificacion_proveedor;
insert into public.proveedores (id,user_id,nombre_empresa,descripcion,ciudad,verificado,verificacion_estado,verificado_at) values
('b0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000008','Pinturas Caribe','Especialistas en pinturas, esmaltes y accesorios para acabados de interiores y exteriores.','Santo Domingo',true,'verificado','2026-01-02T00:00:00Z'),
('b0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000009','EcoSolar Dominicana','Soluciones solares con equipos eficientes, instalación y mantenimiento en la costa norte.','Puerto Plata',true,'verificado','2026-01-02T00:00:00Z'),
('b0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000010','MecaniExpress RD','Servicios de diagnóstico, mantenimiento e inspección para vehículos y motocicletas.','Santo Domingo',true,'verificado','2026-01-02T00:00:00Z'),
('b0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000011','Hidrosanitarios del Cibao','Distribución de tuberías, grifería, equipos sanitarios y bombeo para el Cibao.','Santiago',true,'verificado','2026-01-02T00:00:00Z'),
('b0000000-0000-0000-0000-000000000010','a0000000-0000-0000-0000-000000000012','Aceros y Cemento del Este','Suministro de acero, cemento, agregados y bloques para obras del Este.','San Pedro de Macorís',true,'verificado','2026-01-02T00:00:00Z')
on conflict (id) do nothing;
alter table public.proveedores enable trigger sincronizar_verificacion_proveedor;
insert into public.proveedor_zonas (proveedor_id,provincia) values
('b0000000-0000-0000-0000-000000000006','Santo Domingo'),
('b0000000-0000-0000-0000-000000000006','Distrito Nacional'),
('b0000000-0000-0000-0000-000000000006','San Cristóbal'),
('b0000000-0000-0000-0000-000000000007','Puerto Plata'),
('b0000000-0000-0000-0000-000000000007','Espaillat'),
('b0000000-0000-0000-0000-000000000007','Monte Cristi'),
('b0000000-0000-0000-0000-000000000008','Santo Domingo'),
('b0000000-0000-0000-0000-000000000008','La Romana'),
('b0000000-0000-0000-0000-000000000008','San Pedro de Macorís'),
('b0000000-0000-0000-0000-000000000009','Santiago'),
('b0000000-0000-0000-0000-000000000009','La Vega'),
('b0000000-0000-0000-0000-000000000009','Duarte'),
('b0000000-0000-0000-0000-000000000010','San Pedro de Macorís'),
('b0000000-0000-0000-0000-000000000010','Santo Domingo'),
('b0000000-0000-0000-0000-000000000010','La Romana'),
('b0000000-0000-0000-0000-000000000001','Santo Domingo'),
('b0000000-0000-0000-0000-000000000001','Santiago'),
('b0000000-0000-0000-0000-000000000002','Santiago'),
('b0000000-0000-0000-0000-000000000002','Santo Domingo'),
('b0000000-0000-0000-0000-000000000003','La Vega'),
('b0000000-0000-0000-0000-000000000003','Santo Domingo'),
('b0000000-0000-0000-0000-000000000004','Puerto Plata'),
('b0000000-0000-0000-0000-000000000004','Santiago'),
('b0000000-0000-0000-0000-000000000005','Santiago'),
('b0000000-0000-0000-0000-000000000005','Santo Domingo')
on conflict do nothing;
insert into public.productos (id,proveedor_id,categoria_id,nombre,descripcion,precio,unidad,stock,imagen_url,sku,especificaciones,activo,subcategoria_id) values
('d0000000-0000-0000-0000-000000000021','b0000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','Filtro de agua doméstico 10 pulgadas','Promeria: producto de plomería seleccionado para instalación confiable. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',2860.00,'unidad',18,'/productos/d0000000-0000-0000-0000-000000000021.svg','PRO-021','Presentación: unidad
Uso: Filtro de agua doméstico 10 pulgadas
Proveedor: Promeria',true,'plomeria-conexiones-y-accesorios'),
('d0000000-0000-0000-0000-000000000022','b0000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','Válvula check PVC 2"','Promeria: producto de plomería seleccionado para instalación confiable. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',450.00,'unidad',3,'/productos/d0000000-0000-0000-0000-000000000022.svg','PRO-022','Presentación: unidad
Uso: Válvula check PVC 2"
Proveedor: Promeria',true,'plomeria-conexiones-y-accesorios'),
('d0000000-0000-0000-0000-000000000023','b0000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','Codo PVC sanitario 4"','Promeria: producto de plomería seleccionado para instalación confiable. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',185.00,'unidad',47,'/productos/d0000000-0000-0000-0000-000000000023.svg','PRO-023','Presentación: unidad
Uso: Codo PVC sanitario 4"
Proveedor: Promeria',true,'plomeria-conexiones-y-accesorios'),
('d0000000-0000-0000-0000-000000000024','b0000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','Inodoro de dos piezas blanco','Promeria: producto de plomería seleccionado para instalación confiable. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',6900.00,'unidad',48,'/productos/d0000000-0000-0000-0000-000000000024.svg','PRO-024','Presentación: unidad
Uso: Inodoro de dos piezas blanco
Proveedor: Promeria',true,'plomeria-sanitarios-y-lavamanos'),
('d0000000-0000-0000-0000-000000000025','b0000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','Bomba de agua 1/2 HP','Promeria: producto de plomería seleccionado para instalación confiable. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',8200.00,'unidad',49,'/productos/d0000000-0000-0000-0000-000000000025.svg','PRO-025','Presentación: unidad
Uso: Bomba de agua 1/2 HP
Proveedor: Promeria',true,'plomeria-tanques-y-bombas'),
('d0000000-0000-0000-0000-000000000026','b0000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','Ducha eléctrica 4 temperaturas','Promeria: producto de plomería seleccionado para instalación confiable. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',1750.00,'unidad',50,'/productos/d0000000-0000-0000-0000-000000000026.svg','PRO-026','Presentación: unidad
Uso: Ducha eléctrica 4 temperaturas
Proveedor: Promeria',true,'plomeria-griferia'),
('d0000000-0000-0000-0000-000000000027','b0000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000004','Brocha profesional 3 pulgadas','Ferretería López: artículo de ferretería para uso profesional. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',420.00,'unidad',0,'/productos/d0000000-0000-0000-0000-000000000027.svg','LOP-027','Presentación: unidad
Uso: Brocha profesional 3 pulgadas
Proveedor: Ferretería López',true,'ferreteria-brochas-y-accesorios'),
('d0000000-0000-0000-0000-000000000028','b0000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000004','Rodillo para pintar 9 pulgadas','Ferretería López: artículo de ferretería para uso profesional. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',510.00,'unidad',3,'/productos/d0000000-0000-0000-0000-000000000028.svg','LOP-028','Presentación: unidad
Uso: Rodillo para pintar 9 pulgadas
Proveedor: Ferretería López',true,'ferreteria-brochas-y-accesorios'),
('d0000000-0000-0000-0000-000000000029','b0000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000004','Lija para pared grano 120 (paquete)','Ferretería López: artículo de ferretería para uso profesional. Presentación paquete; garantía y disponibilidad sujetas a confirmación.',260.00,'paquete',69,'/productos/d0000000-0000-0000-0000-000000000029.svg','LOP-029','Presentación: paquete
Uso: Lija para pared grano 120 (paquete)
Proveedor: Ferretería López',true,'ferreteria-brochas-y-accesorios'),
('d0000000-0000-0000-0000-000000000030','b0000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000004','Cinta de enmascarar 2 pulgadas','Ferretería López: artículo de ferretería para uso profesional. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',190.00,'unidad',70,'/productos/d0000000-0000-0000-0000-000000000030.svg','LOP-030','Presentación: unidad
Uso: Cinta de enmascarar 2 pulgadas
Proveedor: Ferretería López',true,'ferreteria-brochas-y-accesorios'),
('d0000000-0000-0000-0000-000000000031','b0000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000004','Taladro percutor 1/2"','Ferretería López: artículo de ferretería para uso profesional. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',4850.00,'unidad',30,'/productos/d0000000-0000-0000-0000-000000000031.svg','LOP-031','Presentación: unidad
Uso: Taladro percutor 1/2"
Proveedor: Ferretería López',true,'ferreteria-herramientas-electricas'),
('d0000000-0000-0000-0000-000000000032','b0000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000004','Juego de destornilladores 6 piezas','Ferretería López: artículo de ferretería para uso profesional. Presentación juego; garantía y disponibilidad sujetas a confirmación.',890.00,'juego',22,'/productos/d0000000-0000-0000-0000-000000000032.svg','LOP-032','Presentación: juego
Uso: Juego de destornilladores 6 piezas
Proveedor: Ferretería López',true,'ferreteria-herramientas-manuales'),
('d0000000-0000-0000-0000-000000000033','b0000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000004','Tornillo para madera 2"','Ferretería López: artículo de ferretería para uso profesional. Presentación caja; garantía y disponibilidad sujetas a confirmación.',375.00,'caja',34,'/productos/d0000000-0000-0000-0000-000000000033.svg','LOP-033','Presentación: caja
Uso: Tornillo para madera 2"
Proveedor: Ferretería López',true,'ferreteria-tornilleria-y-fijaciones'),
('d0000000-0000-0000-0000-000000000034','b0000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001','Alambre negro recocido calibre 16 (rollo)','Materiales del Norte: material de construcción seleccionado para obra. Presentación rollo; garantía y disponibilidad sujetas a confirmación.',420.00,'rollo',134,'/productos/d0000000-0000-0000-0000-000000000034.svg','MDN-034','Presentación: rollo
Uso: Alambre negro recocido calibre 16 (rollo)
Proveedor: Materiales del Norte',true,'materiales-acero-y-varillas'),
('d0000000-0000-0000-0000-000000000035','b0000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001','Mortero premezclado de albañilería (saco)','Materiales del Norte: material de construcción seleccionado para obra. Presentación saco; garantía y disponibilidad sujetas a confirmación.',460.00,'saco',135,'/productos/d0000000-0000-0000-0000-000000000035.svg','MDN-035','Presentación: saco
Uso: Mortero premezclado de albañilería (saco)
Proveedor: Materiales del Norte',true,'materiales-cemento-y-mezclas'),
('d0000000-0000-0000-0000-000000000036','b0000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001','Arena lavada','Materiales del Norte: material de construcción seleccionado para obra. Presentación m³; garantía y disponibilidad sujetas a confirmación.',2250.00,'m³',0,'/productos/d0000000-0000-0000-0000-000000000036.svg','MDN-036','Presentación: m³
Uso: Arena lavada
Proveedor: Materiales del Norte',true,'materiales-arena-grava-y-agregados'),
('d0000000-0000-0000-0000-000000000037','b0000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001','Grava triturada','Materiales del Norte: material de construcción seleccionado para obra. Presentación m³; garantía y disponibilidad sujetas a confirmación.',2600.00,'m³',4,'/productos/d0000000-0000-0000-0000-000000000037.svg','MDN-037','Presentación: m³
Uso: Grava triturada
Proveedor: Materiales del Norte',true,'materiales-arena-grava-y-agregados'),
('d0000000-0000-0000-0000-000000000038','b0000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001','Cemento blanco','Materiales del Norte: material de construcción seleccionado para obra. Presentación saco; garantía y disponibilidad sujetas a confirmación.',920.00,'saco',138,'/productos/d0000000-0000-0000-0000-000000000038.svg','MDN-038','Presentación: saco
Uso: Cemento blanco
Proveedor: Materiales del Norte',true,'materiales-cemento-y-mezclas'),
('d0000000-0000-0000-0000-000000000039','b0000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001','Panel de plywood 1/2"','Materiales del Norte: material de construcción seleccionado para obra. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',1450.00,'unidad',139,'/productos/d0000000-0000-0000-0000-000000000039.svg','MDN-039','Presentación: unidad
Uso: Panel de plywood 1/2"
Proveedor: Materiales del Norte',true,'materiales-madera-y-paneles'),
('d0000000-0000-0000-0000-000000000040','b0000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001','Bloque de hormigón 4"','Materiales del Norte: material de construcción seleccionado para obra. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',52.00,'unidad',140,'/productos/d0000000-0000-0000-0000-000000000040.svg','MDN-040','Presentación: unidad
Uso: Bloque de hormigón 4"
Proveedor: Materiales del Norte',true,'materiales-bloques-y-ladrillos'),
('d0000000-0000-0000-0000-000000000041','b0000000-0000-0000-0000-000000000004','c1000000-0000-0000-0000-000000000002','Controlador MPPT 60A','SolarTech RD: equipo solar con instalación especializada. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',18500.00,'unidad',20,'/productos/d0000000-0000-0000-0000-000000000041.svg','SOL-041','Presentación: unidad
Uso: Controlador MPPT 60A
Proveedor: SolarTech RD',true,'electricidad-energia-solar'),
('d0000000-0000-0000-0000-000000000042','b0000000-0000-0000-0000-000000000004','c1000000-0000-0000-0000-000000000002','Estructura para 6 paneles','SolarTech RD: equipo solar con instalación especializada. Presentación kit; garantía y disponibilidad sujetas a confirmación.',24500.00,'kit',12,'/productos/d0000000-0000-0000-0000-000000000042.svg','SOL-042','Presentación: kit
Uso: Estructura para 6 paneles
Proveedor: SolarTech RD',true,'electricidad-energia-solar'),
('d0000000-0000-0000-0000-000000000043','b0000000-0000-0000-0000-000000000004','c1000000-0000-0000-0000-000000000002','Cable solar fotovoltaico 10 AWG','SolarTech RD: equipo solar con instalación especializada. Presentación metro; garantía y disponibilidad sujetas a confirmación.',185.00,'metro',200,'/productos/d0000000-0000-0000-0000-000000000043.svg','SOL-043','Presentación: metro
Uso: Cable solar fotovoltaico 10 AWG
Proveedor: SolarTech RD',true,'electricidad-energia-solar'),
('d0000000-0000-0000-0000-000000000044','b0000000-0000-0000-0000-000000000004','c1000000-0000-0000-0000-000000000002','Optimizador de potencia solar','SolarTech RD: equipo solar con instalación especializada. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',7800.00,'unidad',3,'/productos/d0000000-0000-0000-0000-000000000044.svg','SOL-044','Presentación: unidad
Uso: Optimizador de potencia solar
Proveedor: SolarTech RD',true,'electricidad-energia-solar'),
('d0000000-0000-0000-0000-000000000045','b0000000-0000-0000-0000-000000000004','c1000000-0000-0000-0000-000000000002','Mantenimiento preventivo de sistema solar','SolarTech RD: equipo solar con instalación especializada. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',4500.00,'servicio',0,'/productos/d0000000-0000-0000-0000-000000000045.svg','SOL-045','Presentación: servicio
Uso: Mantenimiento preventivo de sistema solar
Proveedor: SolarTech RD',true,'electricidad-energia-solar'),
('d0000000-0000-0000-0000-000000000046','b0000000-0000-0000-0000-000000000005','c1000000-0000-0000-0000-000000000005','Limpieza de inyectores','AutoChequeo RD: servicio de inspección realizado por técnicos. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',2800.00,'servicio',30,'/productos/d0000000-0000-0000-0000-000000000046.svg','AUT-046','Presentación: servicio
Uso: Limpieza de inyectores
Proveedor: AutoChequeo RD',true,'automotriz-mecanica-general'),
('d0000000-0000-0000-0000-000000000047','b0000000-0000-0000-0000-000000000005','c1000000-0000-0000-0000-000000000005','Revisión de frenos','AutoChequeo RD: servicio de inspección realizado por técnicos. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',950.00,'servicio',0,'/productos/d0000000-0000-0000-0000-000000000047.svg','AUT-047','Presentación: servicio
Uso: Revisión de frenos
Proveedor: AutoChequeo RD',true,'automotriz-frenos-y-suspension'),
('d0000000-0000-0000-0000-000000000048','b0000000-0000-0000-0000-000000000005','c1000000-0000-0000-0000-000000000005','Diagnóstico de batería automotriz','AutoChequeo RD: servicio de inspección realizado por técnicos. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',800.00,'servicio',4,'/productos/d0000000-0000-0000-0000-000000000048.svg','AUT-048','Presentación: servicio
Uso: Diagnóstico de batería automotriz
Proveedor: AutoChequeo RD',true,'automotriz-baterias-y-electricidad-automotriz'),
('d0000000-0000-0000-0000-000000000049','b0000000-0000-0000-0000-000000000005','c1000000-0000-0000-0000-000000000005','Lavado detallado de vehículo','AutoChequeo RD: servicio de inspección realizado por técnicos. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',2200.00,'servicio',25,'/productos/d0000000-0000-0000-0000-000000000049.svg','AUT-049','Presentación: servicio
Uso: Lavado detallado de vehículo
Proveedor: AutoChequeo RD',true,'automotriz-lavado-y-estetica'),
('d0000000-0000-0000-0000-000000000050','b0000000-0000-0000-0000-000000000005','c1000000-0000-0000-0000-000000000005','Cambio de filtro de aire','AutoChequeo RD: servicio de inspección realizado por técnicos. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',650.00,'servicio',40,'/productos/d0000000-0000-0000-0000-000000000050.svg','AUT-050','Presentación: servicio
Uso: Cambio de filtro de aire
Proveedor: AutoChequeo RD',true,'automotriz-aceite-y-filtros'),
('d0000000-0000-0000-0000-000000000051','b0000000-0000-0000-0000-000000000006','c1000000-0000-0000-0000-000000000004','Pintura acrílica interior (cubo 5 galones)','Pinturas Caribe: acabado seleccionado para aplicación profesional. Presentación cubo; garantía y disponibilidad sujetas a confirmación.',2940.00,'cubo',83,'/productos/d0000000-0000-0000-0000-000000000007.jpg','PIN-051','Presentación: cubo
Uso: Pintura acrílica interior (cubo 5 galones)
Proveedor: Pinturas Caribe',true,'ferreteria-pinturas-y-esmaltes'),
('d0000000-0000-0000-0000-000000000052','b0000000-0000-0000-0000-000000000006','c1000000-0000-0000-0000-000000000004','Brocha profesional 3 pulgadas','Pinturas Caribe: acabado seleccionado para aplicación profesional. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',460.00,'unidad',84,'/productos/d0000000-0000-0000-0000-000000000027.svg','PIN-052','Presentación: unidad
Uso: Brocha profesional 3 pulgadas
Proveedor: Pinturas Caribe',true,'ferreteria-brochas-y-accesorios'),
('d0000000-0000-0000-0000-000000000053','b0000000-0000-0000-0000-000000000006','c1000000-0000-0000-0000-000000000004','Rodillo para pintar 9 pulgadas','Pinturas Caribe: acabado seleccionado para aplicación profesional. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',560.00,'unidad',85,'/productos/d0000000-0000-0000-0000-000000000028.svg','PIN-053','Presentación: unidad
Uso: Rodillo para pintar 9 pulgadas
Proveedor: Pinturas Caribe',true,'ferreteria-brochas-y-accesorios'),
('d0000000-0000-0000-0000-000000000054','b0000000-0000-0000-0000-000000000006','c1000000-0000-0000-0000-000000000004','Lija para pared grano 120 (paquete)','Pinturas Caribe: acabado seleccionado para aplicación profesional. Presentación paquete; garantía y disponibilidad sujetas a confirmación.',285.00,'paquete',86,'/productos/d0000000-0000-0000-0000-000000000029.svg','PIN-054','Presentación: paquete
Uso: Lija para pared grano 120 (paquete)
Proveedor: Pinturas Caribe',true,'ferreteria-brochas-y-accesorios'),
('d0000000-0000-0000-0000-000000000055','b0000000-0000-0000-0000-000000000006','c1000000-0000-0000-0000-000000000004','Cinta de enmascarar 2 pulgadas','Pinturas Caribe: acabado seleccionado para aplicación profesional. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',210.00,'unidad',87,'/productos/d0000000-0000-0000-0000-000000000030.svg','PIN-055','Presentación: unidad
Uso: Cinta de enmascarar 2 pulgadas
Proveedor: Pinturas Caribe',true,'ferreteria-brochas-y-accesorios'),
('d0000000-0000-0000-0000-000000000056','b0000000-0000-0000-0000-000000000006','c1000000-0000-0000-0000-000000000004','Pintura acrílica exterior (cubo 5 galones)','Pinturas Caribe: acabado seleccionado para aplicación profesional. Presentación cubo; garantía y disponibilidad sujetas a confirmación.',3250.00,'cubo',0,'/productos/d0000000-0000-0000-0000-000000000056.svg','PIN-056','Presentación: cubo
Uso: Pintura acrílica exterior (cubo 5 galones)
Proveedor: Pinturas Caribe',true,'ferreteria-pinturas-y-esmaltes'),
('d0000000-0000-0000-0000-000000000057','b0000000-0000-0000-0000-000000000006','c1000000-0000-0000-0000-000000000004','Esmalte sintético anticorrosivo (galón)','Pinturas Caribe: acabado seleccionado para aplicación profesional. Presentación galón; garantía y disponibilidad sujetas a confirmación.',1150.00,'galón',5,'/productos/d0000000-0000-0000-0000-000000000057.svg','PIN-057','Presentación: galón
Uso: Esmalte sintético anticorrosivo (galón)
Proveedor: Pinturas Caribe',true,'ferreteria-pinturas-y-esmaltes'),
('d0000000-0000-0000-0000-000000000058','b0000000-0000-0000-0000-000000000006','c1000000-0000-0000-0000-000000000004','Sellador acrílico para paredes (galón)','Pinturas Caribe: acabado seleccionado para aplicación profesional. Presentación galón; garantía y disponibilidad sujetas a confirmación.',680.00,'galón',90,'/productos/d0000000-0000-0000-0000-000000000058.svg','PIN-058','Presentación: galón
Uso: Sellador acrílico para paredes (galón)
Proveedor: Pinturas Caribe',true,'ferreteria-pinturas-y-esmaltes'),
('d0000000-0000-0000-0000-000000000059','b0000000-0000-0000-0000-000000000006','c1000000-0000-0000-0000-000000000004','Masilla para paredes (cubeta)','Pinturas Caribe: acabado seleccionado para aplicación profesional. Presentación cubeta; garantía y disponibilidad sujetas a confirmación.',920.00,'cubeta',91,'/productos/d0000000-0000-0000-0000-000000000059.svg','PIN-059','Presentación: cubeta
Uso: Masilla para paredes (cubeta)
Proveedor: Pinturas Caribe',true,'ferreteria-pinturas-y-esmaltes'),
('d0000000-0000-0000-0000-000000000060','b0000000-0000-0000-0000-000000000006','c1000000-0000-0000-0000-000000000004','Thinner multiuso (galón)','Pinturas Caribe: acabado seleccionado para aplicación profesional. Presentación galón; garantía y disponibilidad sujetas a confirmación.',690.00,'galón',92,'/productos/d0000000-0000-0000-0000-000000000060.svg','PIN-060','Presentación: galón
Uso: Thinner multiuso (galón)
Proveedor: Pinturas Caribe',true,'ferreteria-pinturas-y-esmaltes'),
('d0000000-0000-0000-0000-000000000061','b0000000-0000-0000-0000-000000000007','c1000000-0000-0000-0000-000000000002','Evaluación de sistema eléctrico y consumo','EcoSolar Dominicana: equipo solar dimensionado para uso residencial. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',2700.00,'servicio',45,'/productos/d0000000-0000-0000-0000-000000000011.jpg','ECO-061','Presentación: servicio
Uso: Evaluación de sistema eléctrico y consumo
Proveedor: EcoSolar Dominicana',true,'electricidad-energia-solar'),
('d0000000-0000-0000-0000-000000000062','b0000000-0000-0000-0000-000000000007','c1000000-0000-0000-0000-000000000002','Inversor híbrido 5kW (instalación incluida)','EcoSolar Dominicana: equipo solar dimensionado para uso residencial. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',83500.00,'unidad',4,'/productos/d0000000-0000-0000-0000-000000000012.jpg','ECO-062','Presentación: unidad
Uso: Inversor híbrido 5kW (instalación incluida)
Proveedor: EcoSolar Dominicana',true,'electricidad-energia-solar'),
('d0000000-0000-0000-0000-000000000063','b0000000-0000-0000-0000-000000000007','c1000000-0000-0000-0000-000000000002','Panel solar monocristalino 550W','EcoSolar Dominicana: equipo solar dimensionado para uso residencial. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',13900.00,'unidad',81,'/productos/d0000000-0000-0000-0000-000000000013.jpg','ECO-063','Presentación: unidad
Uso: Panel solar monocristalino 550W
Proveedor: EcoSolar Dominicana',true,'electricidad-energia-solar'),
('d0000000-0000-0000-0000-000000000064','b0000000-0000-0000-0000-000000000007','c1000000-0000-0000-0000-000000000002','Batería de litio 5kWh','EcoSolar Dominicana: equipo solar dimensionado para uso residencial. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',106000.00,'unidad',82,'/productos/d0000000-0000-0000-0000-000000000014.jpg','ECO-064','Presentación: unidad
Uso: Batería de litio 5kWh
Proveedor: EcoSolar Dominicana',true,'electricidad-energia-solar'),
('d0000000-0000-0000-0000-000000000065','b0000000-0000-0000-0000-000000000007','c1000000-0000-0000-0000-000000000002','Kit solar residencial 3kW llave en mano','EcoSolar Dominicana: equipo solar dimensionado para uso residencial. Presentación kit; garantía y disponibilidad sujetas a confirmación.',312000.00,'kit',83,'/productos/d0000000-0000-0000-0000-000000000015.jpg','ECO-065','Presentación: kit
Uso: Kit solar residencial 3kW llave en mano
Proveedor: EcoSolar Dominicana',true,'electricidad-energia-solar'),
('d0000000-0000-0000-0000-000000000066','b0000000-0000-0000-0000-000000000007','c1000000-0000-0000-0000-000000000002','Microinversor 2kW','EcoSolar Dominicana: equipo solar dimensionado para uso residencial. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',39500.00,'unidad',28,'/productos/d0000000-0000-0000-0000-000000000066.svg','ECO-066','Presentación: unidad
Uso: Microinversor 2kW
Proveedor: EcoSolar Dominicana',true,'electricidad-energia-solar'),
('d0000000-0000-0000-0000-000000000067','b0000000-0000-0000-0000-000000000007','c1000000-0000-0000-0000-000000000002','Batería LiFePO4 10kWh','EcoSolar Dominicana: equipo solar dimensionado para uso residencial. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',178000.00,'unidad',12,'/productos/d0000000-0000-0000-0000-000000000067.svg','ECO-067','Presentación: unidad
Uso: Batería LiFePO4 10kWh
Proveedor: EcoSolar Dominicana',true,'electricidad-energia-solar'),
('d0000000-0000-0000-0000-000000000068','b0000000-0000-0000-0000-000000000007','c1000000-0000-0000-0000-000000000002','Cable solar fotovoltaico 6 AWG','EcoSolar Dominicana: equipo solar dimensionado para uso residencial. Presentación metro; garantía y disponibilidad sujetas a confirmación.',320.00,'metro',150,'/productos/d0000000-0000-0000-0000-000000000068.svg','ECO-068','Presentación: metro
Uso: Cable solar fotovoltaico 6 AWG
Proveedor: EcoSolar Dominicana',true,'electricidad-energia-solar'),
('d0000000-0000-0000-0000-000000000069','b0000000-0000-0000-0000-000000000007','c1000000-0000-0000-0000-000000000002','Estructura de techo para 8 paneles','EcoSolar Dominicana: equipo solar dimensionado para uso residencial. Presentación kit; garantía y disponibilidad sujetas a confirmación.',31500.00,'kit',24,'/productos/d0000000-0000-0000-0000-000000000069.svg','ECO-069','Presentación: kit
Uso: Estructura de techo para 8 paneles
Proveedor: EcoSolar Dominicana',true,'electricidad-energia-solar'),
('d0000000-0000-0000-0000-000000000070','b0000000-0000-0000-0000-000000000007','c1000000-0000-0000-0000-000000000002','Mantenimiento de inversor híbrido','EcoSolar Dominicana: equipo solar dimensionado para uso residencial. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',5200.00,'servicio',0,'/productos/d0000000-0000-0000-0000-000000000070.svg','ECO-070','Presentación: servicio
Uso: Mantenimiento de inversor híbrido
Proveedor: EcoSolar Dominicana',true,'electricidad-energia-solar'),
('d0000000-0000-0000-0000-000000000071','b0000000-0000-0000-0000-000000000008','c1000000-0000-0000-0000-000000000005','Chequeo pre-compra de vehículo','MecaniExpress RD: servicio realizado por técnicos especializados. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',3850.00,'servicio',25,'/productos/d0000000-0000-0000-0000-000000000016.jpg','MEC-071','Presentación: servicio
Uso: Chequeo pre-compra de vehículo
Proveedor: MecaniExpress RD',true,'automotriz-mecanica-general'),
('d0000000-0000-0000-0000-000000000072','b0000000-0000-0000-0000-000000000008','c1000000-0000-0000-0000-000000000005','Diagnóstico computarizado (scanner OBD-II)','MecaniExpress RD: servicio realizado por técnicos especializados. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',1990.00,'servicio',3,'/productos/d0000000-0000-0000-0000-000000000017.jpg','MEC-072','Presentación: servicio
Uso: Diagnóstico computarizado (scanner OBD-II)
Proveedor: MecaniExpress RD',true,'automotriz-mecanica-general'),
('d0000000-0000-0000-0000-000000000073','b0000000-0000-0000-0000-000000000008','c1000000-0000-0000-0000-000000000005','Inspección técnica de motocicleta','MecaniExpress RD: servicio realizado por técnicos especializados. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',1320.00,'servicio',93,'/productos/d0000000-0000-0000-0000-000000000018.jpg','MEC-073','Presentación: servicio
Uso: Inspección técnica de motocicleta
Proveedor: MecaniExpress RD',true,'automotriz-mecanica-general'),
('d0000000-0000-0000-0000-000000000074','b0000000-0000-0000-0000-000000000008','c1000000-0000-0000-0000-000000000005','Evaluación de chasis y suspensión','MecaniExpress RD: servicio realizado por técnicos especializados. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',2460.00,'servicio',94,'/productos/d0000000-0000-0000-0000-000000000019.jpg','MEC-074','Presentación: servicio
Uso: Evaluación de chasis y suspensión
Proveedor: MecaniExpress RD',true,'automotriz-frenos-y-suspension'),
('d0000000-0000-0000-0000-000000000075','b0000000-0000-0000-0000-000000000008','c1000000-0000-0000-0000-000000000005','Cambio de aceite y filtros (mano de obra)','MecaniExpress RD: servicio realizado por técnicos especializados. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',1690.00,'servicio',95,'/productos/d0000000-0000-0000-0000-000000000020.jpg','MEC-075','Presentación: servicio
Uso: Cambio de aceite y filtros (mano de obra)
Proveedor: MecaniExpress RD',true,'automotriz-aceite-y-filtros'),
('d0000000-0000-0000-0000-000000000076','b0000000-0000-0000-0000-000000000008','c1000000-0000-0000-0000-000000000005','Alineación y balanceo','MecaniExpress RD: servicio realizado por técnicos especializados. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',1850.00,'servicio',20,'/productos/d0000000-0000-0000-0000-000000000076.svg','MEC-076','Presentación: servicio
Uso: Alineación y balanceo
Proveedor: MecaniExpress RD',true,'automotriz-frenos-y-suspension'),
('d0000000-0000-0000-0000-000000000077','b0000000-0000-0000-0000-000000000008','c1000000-0000-0000-0000-000000000005','Limpieza de inyectores por ultrasonido','MecaniExpress RD: servicio realizado por técnicos especializados. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',3200.00,'servicio',0,'/productos/d0000000-0000-0000-0000-000000000077.svg','MEC-077','Presentación: servicio
Uso: Limpieza de inyectores por ultrasonido
Proveedor: MecaniExpress RD',true,'automotriz-mecanica-general'),
('d0000000-0000-0000-0000-000000000078','b0000000-0000-0000-0000-000000000008','c1000000-0000-0000-0000-000000000005','Revisión de sistema de frenos ABS','MecaniExpress RD: servicio realizado por técnicos especializados. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',1450.00,'servicio',30,'/productos/d0000000-0000-0000-0000-000000000078.svg','MEC-078','Presentación: servicio
Uso: Revisión de sistema de frenos ABS
Proveedor: MecaniExpress RD',true,'automotriz-frenos-y-suspension'),
('d0000000-0000-0000-0000-000000000079','b0000000-0000-0000-0000-000000000008','c1000000-0000-0000-0000-000000000005','Cambio de bujías','MecaniExpress RD: servicio realizado por técnicos especializados. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',1100.00,'servicio',40,'/productos/d0000000-0000-0000-0000-000000000079.svg','MEC-079','Presentación: servicio
Uso: Cambio de bujías
Proveedor: MecaniExpress RD',true,'automotriz-mecanica-general'),
('d0000000-0000-0000-0000-000000000080','b0000000-0000-0000-0000-000000000008','c1000000-0000-0000-0000-000000000005','Diagnóstico de alternador y arranque','MecaniExpress RD: servicio realizado por técnicos especializados. Presentación servicio; garantía y disponibilidad sujetas a confirmación.',1250.00,'servicio',28,'/productos/d0000000-0000-0000-0000-000000000080.svg','MEC-080','Presentación: servicio
Uso: Diagnóstico de alternador y arranque
Proveedor: MecaniExpress RD',true,'automotriz-baterias-y-electricidad-automotriz'),
('d0000000-0000-0000-0000-000000000081','b0000000-0000-0000-0000-000000000009','c1000000-0000-0000-0000-000000000003','Tubo PVC 4" x 6m (sanitario)','Hidrosanitarios del Cibao: solución hidráulica seleccionada para instalación segura. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',735.00,'unidad',30,'/productos/d0000000-0000-0000-0000-000000000001.jpg','HID-081','Presentación: unidad
Uso: Tubo PVC 4" x 6m (sanitario)
Proveedor: Hidrosanitarios del Cibao',true,'plomeria-tuberias'),
('d0000000-0000-0000-0000-000000000082','b0000000-0000-0000-0000-000000000009','c1000000-0000-0000-0000-000000000003','Tubo PVC 1/2" x 6m (presión)','Hidrosanitarios del Cibao: solución hidráulica seleccionada para instalación segura. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',198.00,'unidad',2,'/productos/d0000000-0000-0000-0000-000000000002.jpg','HID-082','Presentación: unidad
Uso: Tubo PVC 1/2" x 6m (presión)
Proveedor: Hidrosanitarios del Cibao',true,'plomeria-tuberias'),
('d0000000-0000-0000-0000-000000000083','b0000000-0000-0000-0000-000000000009','c1000000-0000-0000-0000-000000000003','Llave de paso esférica 1/2" (bronce)','Hidrosanitarios del Cibao: solución hidráulica seleccionada para instalación segura. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',355.00,'unidad',143,'/productos/d0000000-0000-0000-0000-000000000003.jpg','HID-083','Presentación: unidad
Uso: Llave de paso esférica 1/2" (bronce)
Proveedor: Hidrosanitarios del Cibao',true,'plomeria-griferia'),
('d0000000-0000-0000-0000-000000000084','b0000000-0000-0000-0000-000000000009','c1000000-0000-0000-0000-000000000003','Pegamento PVC Tangit 237ml','Hidrosanitarios del Cibao: solución hidráulica seleccionada para instalación segura. Presentación frasco; garantía y disponibilidad sujetas a confirmación.',325.00,'frasco',144,'/productos/d0000000-0000-0000-0000-000000000084.svg','HID-084','Presentación: frasco
Uso: Pegamento PVC Tangit 237ml
Proveedor: Hidrosanitarios del Cibao',true,'plomeria-conexiones-y-accesorios'),
('d0000000-0000-0000-0000-000000000085','b0000000-0000-0000-0000-000000000009','c1000000-0000-0000-0000-000000000003','Filtro de agua doméstico 10 pulgadas','Hidrosanitarios del Cibao: solución hidráulica seleccionada para instalación segura. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',3100.00,'unidad',145,'/productos/d0000000-0000-0000-0000-000000000021.svg','HID-085','Presentación: unidad
Uso: Filtro de agua doméstico 10 pulgadas
Proveedor: Hidrosanitarios del Cibao',true,'plomeria-conexiones-y-accesorios'),
('d0000000-0000-0000-0000-000000000086','b0000000-0000-0000-0000-000000000009','c1000000-0000-0000-0000-000000000003','Lavamanos cerámico blanco','Hidrosanitarios del Cibao: solución hidráulica seleccionada para instalación segura. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',3950.00,'unidad',22,'/productos/d0000000-0000-0000-0000-000000000086.svg','HID-086','Presentación: unidad
Uso: Lavamanos cerámico blanco
Proveedor: Hidrosanitarios del Cibao',true,'plomeria-sanitarios-y-lavamanos'),
('d0000000-0000-0000-0000-000000000087','b0000000-0000-0000-0000-000000000009','c1000000-0000-0000-0000-000000000003','Tanque de agua 500 galones','Hidrosanitarios del Cibao: solución hidráulica seleccionada para instalación segura. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',14500.00,'unidad',0,'/productos/d0000000-0000-0000-0000-000000000087.svg','HID-087','Presentación: unidad
Uso: Tanque de agua 500 galones
Proveedor: Hidrosanitarios del Cibao',true,'plomeria-tanques-y-bombas'),
('d0000000-0000-0000-0000-000000000088','b0000000-0000-0000-0000-000000000009','c1000000-0000-0000-0000-000000000003','Mezcladora para fregadero','Hidrosanitarios del Cibao: solución hidráulica seleccionada para instalación segura. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',2450.00,'unidad',25,'/productos/d0000000-0000-0000-0000-000000000088.svg','HID-088','Presentación: unidad
Uso: Mezcladora para fregadero
Proveedor: Hidrosanitarios del Cibao',true,'plomeria-griferia'),
('d0000000-0000-0000-0000-000000000089','b0000000-0000-0000-0000-000000000009','c1000000-0000-0000-0000-000000000003','Tubo CPVC 3/4" x 6m','Hidrosanitarios del Cibao: solución hidráulica seleccionada para instalación segura. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',480.00,'unidad',100,'/productos/d0000000-0000-0000-0000-000000000089.svg','HID-089','Presentación: unidad
Uso: Tubo CPVC 3/4" x 6m
Proveedor: Hidrosanitarios del Cibao',true,'plomeria-tuberias'),
('d0000000-0000-0000-0000-000000000090','b0000000-0000-0000-0000-000000000009','c1000000-0000-0000-0000-000000000003','Bomba presurizadora 1/2 HP','Hidrosanitarios del Cibao: solución hidráulica seleccionada para instalación segura. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',9250.00,'unidad',16,'/productos/d0000000-0000-0000-0000-000000000090.svg','HID-090','Presentación: unidad
Uso: Bomba presurizadora 1/2 HP
Proveedor: Hidrosanitarios del Cibao',true,'plomeria-tanques-y-bombas'),
('d0000000-0000-0000-0000-000000000091','b0000000-0000-0000-0000-000000000010','c1000000-0000-0000-0000-000000000001','Cemento Portland Tipo I (42.5 kg)','Aceros y Cemento del Este: material seleccionado para obras de construcción. Presentación saco; garantía y disponibilidad sujetas a confirmación.',920.00,'saco',40,'/productos/d0000000-0000-0000-0000-000000000008.jpg','ACE-091','Presentación: saco
Uso: Cemento Portland Tipo I (42.5 kg)
Proveedor: Aceros y Cemento del Este',true,'materiales-cemento-y-mezclas'),
('d0000000-0000-0000-0000-000000000092','b0000000-0000-0000-0000-000000000010','c1000000-0000-0000-0000-000000000001','Varilla de hierro 3/8" x 6m','Aceros y Cemento del Este: material seleccionado para obras de construcción. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',465.00,'unidad',4,'/productos/d0000000-0000-0000-0000-000000000009.jpg','ACE-092','Presentación: unidad
Uso: Varilla de hierro 3/8" x 6m
Proveedor: Aceros y Cemento del Este',true,'materiales-acero-y-varillas'),
('d0000000-0000-0000-0000-000000000093','b0000000-0000-0000-0000-000000000010','c1000000-0000-0000-0000-000000000001','Bloques de hormigón 6" (pallet x 100)','Aceros y Cemento del Este: material seleccionado para obras de construcción. Presentación pallet; garantía y disponibilidad sujetas a confirmación.',5350.00,'pallet',143,'/productos/d0000000-0000-0000-0000-000000000010.jpg','ACE-093','Presentación: pallet
Uso: Bloques de hormigón 6" (pallet x 100)
Proveedor: Aceros y Cemento del Este',true,'materiales-bloques-y-ladrillos'),
('d0000000-0000-0000-0000-000000000094','b0000000-0000-0000-0000-000000000010','c1000000-0000-0000-0000-000000000001','Alambre negro recocido calibre 16 (rollo)','Aceros y Cemento del Este: material seleccionado para obras de construcción. Presentación rollo; garantía y disponibilidad sujetas a confirmación.',450.00,'rollo',144,'/productos/d0000000-0000-0000-0000-000000000034.svg','ACE-094','Presentación: rollo
Uso: Alambre negro recocido calibre 16 (rollo)
Proveedor: Aceros y Cemento del Este',true,'materiales-acero-y-varillas'),
('d0000000-0000-0000-0000-000000000095','b0000000-0000-0000-0000-000000000010','c1000000-0000-0000-0000-000000000001','Mortero premezclado de albañilería (saco)','Aceros y Cemento del Este: material seleccionado para obras de construcción. Presentación saco; garantía y disponibilidad sujetas a confirmación.',500.00,'saco',145,'/productos/d0000000-0000-0000-0000-000000000035.svg','ACE-095','Presentación: saco
Uso: Mortero premezclado de albañilería (saco)
Proveedor: Aceros y Cemento del Este',true,'materiales-cemento-y-mezclas'),
('d0000000-0000-0000-0000-000000000096','b0000000-0000-0000-0000-000000000010','c1000000-0000-0000-0000-000000000001','Malla electrosoldada 6x6 (panel)','Aceros y Cemento del Este: material seleccionado para obras de construcción. Presentación panel; garantía y disponibilidad sujetas a confirmación.',2100.00,'panel',32,'/productos/d0000000-0000-0000-0000-000000000096.svg','ACE-096','Presentación: panel
Uso: Malla electrosoldada 6x6 (panel)
Proveedor: Aceros y Cemento del Este',true,'materiales-acero-y-varillas'),
('d0000000-0000-0000-0000-000000000097','b0000000-0000-0000-0000-000000000010','c1000000-0000-0000-0000-000000000001','Cemento de albañilería (saco)','Aceros y Cemento del Este: material seleccionado para obras de construcción. Presentación saco; garantía y disponibilidad sujetas a confirmación.',790.00,'saco',0,'/productos/d0000000-0000-0000-0000-000000000097.svg','ACE-097','Presentación: saco
Uso: Cemento de albañilería (saco)
Proveedor: Aceros y Cemento del Este',true,'materiales-cemento-y-mezclas'),
('d0000000-0000-0000-0000-000000000098','b0000000-0000-0000-0000-000000000010','c1000000-0000-0000-0000-000000000001','Varilla corrugada 1/2" x 6m','Aceros y Cemento del Este: material seleccionado para obras de construcción. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',650.00,'unidad',24,'/productos/d0000000-0000-0000-0000-000000000098.svg','ACE-098','Presentación: unidad
Uso: Varilla corrugada 1/2" x 6m
Proveedor: Aceros y Cemento del Este',true,'materiales-acero-y-varillas'),
('d0000000-0000-0000-0000-000000000099','b0000000-0000-0000-0000-000000000010','c1000000-0000-0000-0000-000000000001','Grava fina','Aceros y Cemento del Este: material seleccionado para obras de construcción. Presentación m³; garantía y disponibilidad sujetas a confirmación.',2680.00,'m³',80,'/productos/d0000000-0000-0000-0000-000000000099.svg','ACE-099','Presentación: m³
Uso: Grava fina
Proveedor: Aceros y Cemento del Este',true,'materiales-arena-grava-y-agregados'),
('d0000000-0000-0000-0000-000000000100','b0000000-0000-0000-0000-000000000010','c1000000-0000-0000-0000-000000000001','Bloque de hormigón 8"','Aceros y Cemento del Este: material seleccionado para obras de construcción. Presentación unidad; garantía y disponibilidad sujetas a confirmación.',78.00,'unidad',24,'/productos/d0000000-0000-0000-0000-000000000100.svg','ACE-100','Presentación: unidad
Uso: Bloque de hormigón 8"
Proveedor: Aceros y Cemento del Este',true,'materiales-bloques-y-ladrillos')
on conflict (id) do nothing;
