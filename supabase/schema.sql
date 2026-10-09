-- =============================================================
-- Resuélvelo — Schema principal
-- Ejecutar en: Supabase SQL Editor
-- Orden: este archivo primero, luego seed.sql
-- =============================================================

-- ─── Extensiones ────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- =============================================================
-- TABLAS
-- =============================================================

-- ─── profiles ───────────────────────────────────────────────
-- Extiende auth.users; se crea automáticamente via trigger.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  nombre     text not null,
  rol        text not null check (rol in ('comprador', 'proveedor', 'admin')) default 'comprador',
  telefono   text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ─── proveedores ────────────────────────────────────────────
create table if not exists public.proveedores (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  nombre_empresa text not null,
  descripcion    text,
  direccion      text,
  ciudad         text,
  logo_url       text,
  verificado     boolean not null default false,
  created_at     timestamptz not null default now()
);

-- ─── categorias ─────────────────────────────────────────────
create table if not exists public.categorias (
  id     uuid primary key default uuid_generate_v4(),
  nombre text not null,
  slug   text not null unique,
  icono  text
);

-- ─── subcategorias ──────────────────────────────────────────
create table if not exists public.subcategorias (
  id text primary key,
  categoria_id uuid not null references public.categorias(id),
  nombre text not null,
  slug text not null unique,
  unique (categoria_id, id)
);

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

-- ─── productos ──────────────────────────────────────────────
create table if not exists public.productos (
  id            uuid primary key default uuid_generate_v4(),
  proveedor_id  uuid not null references public.proveedores(id) on delete cascade,
  categoria_id  uuid not null references public.categorias(id),
  subcategoria_id text,
  nombre        text not null,
  descripcion   text,
  precio        numeric(12,2) not null check (precio >= 0),
  unidad        text not null default 'unidad',
  stock         integer not null default 0 check (stock >= 0),
  imagen_url    text,
  sku           text,
  especificaciones text,
  itbis_incluido boolean not null default true,
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ─── Storage de imágenes de productos (referencia; se aplica por migración) ───
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict do nothing;

create policy "productos storage: lectura pública"
  on storage.objects for select
  using (bucket_id = 'productos');

create policy "productos storage: proveedor inserta en su carpeta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'productos'
    and exists (
      select 1 from public.proveedores
      where id::text = (storage.foldername(name))[1]
        and user_id = auth.uid()
    )
  );

create policy "productos storage: proveedor elimina de su carpeta"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'productos'
    and exists (
      select 1 from public.proveedores
      where id::text = (storage.foldername(name))[1]
        and user_id = auth.uid()
    )
  );

alter table public.productos add column if not exists subcategoria_id text null;

-- ─── cotizaciones ───────────────────────────────────────────
create table if not exists public.cotizaciones (
  id              uuid primary key default uuid_generate_v4(),
  numero          bigint generated by default as identity not null unique,
  comprador_id    uuid not null references public.profiles(id),
  proveedor_id    uuid not null references public.proveedores(id),
  estado          text not null check (estado in ('pendiente','respondida','aceptada','rechazada')) default 'pendiente',
  mensaje         text,
  total_estimado  numeric(12,2),
  plazo_dias      integer,
  valida_hasta    date,
  condiciones     text,
  respondida_at   timestamptz,
  total_ofertado  numeric,
  motivo_rechazo  text,
  rechazada_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ─── items_cotizacion ───────────────────────────────────────
create table if not exists public.items_cotizacion (
  id              uuid primary key default uuid_generate_v4(),
  cotizacion_id   uuid not null references public.cotizaciones(id) on delete cascade,
  producto_id     uuid not null references public.productos(id),
  cantidad        integer not null check (cantidad > 0),
  precio_unitario numeric(12,2),
  sujeta_disponibilidad boolean not null default false,
  stock_al_cotizar integer,
  cantidad_confirmada integer,
  constraint items_cotizacion_cantidad_confirmada_check
    check (cantidad_confirmada is null or cantidad_confirmada between 0 and cantidad),
  precio_ofertado numeric,
  cantidad_ofertada integer,
  constraint items_cotizacion_cantidad_ofertada_check
    check (cantidad_ofertada is null or cantidad_ofertada between 0 and cantidad)
);

alter table public.productos drop constraint if exists productos_categoria_subcategoria_fkey;
alter table public.productos
  add constraint productos_categoria_subcategoria_fkey
  foreign key (categoria_id, subcategoria_id) references public.subcategorias(categoria_id, id);

-- =============================================================
-- ÍNDICES
-- =============================================================
create index if not exists idx_proveedores_user_id       on public.proveedores(user_id);
create index if not exists idx_productos_proveedor_id    on public.productos(proveedor_id);
create index if not exists idx_productos_categoria_id    on public.productos(categoria_id);
create index if not exists idx_productos_activo          on public.productos(activo);
create index if not exists idx_cotizaciones_comprador    on public.cotizaciones(comprador_id);
create index if not exists idx_cotizaciones_proveedor    on public.cotizaciones(proveedor_id);
create index if not exists idx_cotizaciones_estado       on public.cotizaciones(estado);
create index if not exists idx_items_cotizacion_id       on public.items_cotizacion(cotizacion_id);

-- =============================================================
-- TRIGGER — crear profile al registrarse
-- =============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'rol', 'comprador')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Evita recursión: las políticas de admin no pueden leer profiles
-- bajo RLS, porque esa lectura volvería a evaluar las mismas políticas.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and rol = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

alter table public.profiles          enable row level security;
alter table public.proveedores       enable row level security;
alter table public.categorias        enable row level security;
alter table public.subcategorias     enable row level security;
revoke all on public.subcategorias from public, anon, authenticated;
grant select on public.subcategorias to anon, authenticated;
alter table public.productos         enable row level security;
alter table public.cotizaciones      enable row level security;
alter table public.items_cotizacion  enable row level security;

-- ─── profiles ───────────────────────────────────────────────
-- drop + create para poder re-ejecutar este archivo en un proyecto que ya tiene políticas.
drop policy if exists "profiles: usuario ve el suyo" on public.profiles;
create policy "profiles: usuario ve el suyo"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: usuario actualiza el suyo" on public.profiles;
create policy "profiles: usuario actualiza el suyo"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "profiles: admin lee todos" on public.profiles;
create policy "profiles: admin lee todos"
  on public.profiles for select
  using (
    public.is_admin()
  );

-- ─── proveedores ────────────────────────────────────────────
drop policy if exists "proveedores: lectura pública" on public.proveedores;
create policy "proveedores: lectura pública"
  on public.proveedores for select
  using (true);

drop policy if exists "proveedores: proveedor inserta el suyo" on public.proveedores;
create policy "proveedores: proveedor inserta el suyo"
  on public.proveedores for insert
  with check (auth.uid() = user_id);

drop policy if exists "proveedores: proveedor actualiza el suyo" on public.proveedores;
create policy "proveedores: proveedor actualiza el suyo"
  on public.proveedores for update
  using (auth.uid() = user_id);

-- ─── subcategorias ──────────────────────────────────────────
drop policy if exists "subcategorias: lectura pública" on public.subcategorias;
create policy "subcategorias: lectura pública"
  on public.subcategorias for select using (true);

-- ─── categorias ─────────────────────────────────────────────
drop policy if exists "categorias: lectura pública" on public.categorias;
create policy "categorias: lectura pública"
  on public.categorias for select
  using (true);

drop policy if exists "categorias: solo admin inserta" on public.categorias;
create policy "categorias: solo admin inserta"
  on public.categorias for insert
  with check (
    public.is_admin()
  );

-- ─── productos ──────────────────────────────────────────────
drop policy if exists "productos: lectura pública de activos" on public.productos;
create policy "productos: lectura pública de activos"
  on public.productos for select
  using (activo = true or auth.uid() = (
    select user_id from public.proveedores where id = proveedor_id
  ));

drop policy if exists "productos: compradores leen productos de sus cotizaciones" on public.productos;
create policy "productos: compradores leen productos de sus cotizaciones"
  on public.productos for select
  using (
    exists (
      select 1
      from public.items_cotizacion i
      join public.cotizaciones c on c.id = i.cotizacion_id
      where i.producto_id = productos.id
        and c.comprador_id = auth.uid()
    )
  );

drop policy if exists "productos: proveedor inserta los suyos" on public.productos;
create policy "productos: proveedor inserta los suyos"
  on public.productos for insert
  with check (
    exists (
      select 1 from public.proveedores
      where id = proveedor_id and user_id = auth.uid()
    )
  );

drop policy if exists "productos: proveedor actualiza los suyos" on public.productos;
create policy "productos: proveedor actualiza los suyos"
  on public.productos for update
  using (
    exists (
      select 1 from public.proveedores
      where id = proveedor_id and user_id = auth.uid()
    )
  );

drop policy if exists "productos: proveedor elimina los suyos" on public.productos;
create policy "productos: proveedor elimina los suyos"
  on public.productos for delete
  using (
    exists (
      select 1 from public.proveedores
      where id = proveedor_id and user_id = auth.uid()
    )
  );

drop policy if exists "productos: admin lee todos" on public.productos;
create policy "productos: admin lee todos"
  on public.productos for select
  using (
    public.is_admin()
  );

drop policy if exists "productos: admin actualiza" on public.productos;
create policy "productos: admin actualiza"
  on public.productos for update
  using (
    public.is_admin()
  );

-- ─── cotizaciones ───────────────────────────────────────────
drop policy if exists "cotizaciones: comprador ve las suyas" on public.cotizaciones;
create policy "cotizaciones: comprador ve las suyas"
  on public.cotizaciones for select
  using (auth.uid() = comprador_id);

drop policy if exists "cotizaciones: proveedor ve las dirigidas a él" on public.cotizaciones;
create policy "cotizaciones: proveedor ve las dirigidas a él"
  on public.cotizaciones for select
  using (
    exists (
      select 1 from public.proveedores
      where id = proveedor_id and user_id = auth.uid()
    )
  );

drop policy if exists "cotizaciones: comprador crea" on public.cotizaciones;
create policy "cotizaciones: comprador crea"
  on public.cotizaciones for insert
  with check (auth.uid() = comprador_id);

drop policy if exists "cotizaciones: proveedor actualiza estado" on public.cotizaciones;
drop policy if exists "cotizaciones: proveedor actualiza oferta pendiente" on public.cotizaciones;
create policy "cotizaciones: proveedor actualiza oferta pendiente"
  on cotizaciones for update to authenticated
  using (
    estado = 'pendiente'
    and exists (select 1 from public.proveedores p where p.id = proveedor_id and p.user_id = auth.uid())
  )
  with check (
    estado = 'pendiente'
    and exists (select 1 from public.proveedores p where p.id = proveedor_id and p.user_id = auth.uid())
  );

drop policy if exists "cotizaciones: admin lee todas" on public.cotizaciones;
create policy "cotizaciones: admin lee todas"
  on public.cotizaciones for select
  using (
    public.is_admin()
  );

-- ─── items_cotizacion ───────────────────────────────────────
drop policy if exists "items: comprador ve los suyos" on public.items_cotizacion;
create policy "items: comprador ve los suyos"
  on public.items_cotizacion for select
  using (
    exists (
      select 1 from public.cotizaciones
      where id = cotizacion_id and comprador_id = auth.uid()
    )
  );

drop policy if exists "items: proveedor ve los suyos" on public.items_cotizacion;
create policy "items: proveedor ve los suyos"
  on public.items_cotizacion for select
  using (
    exists (
      select 1 from public.cotizaciones c
      join public.proveedores p on p.id = c.proveedor_id
      where c.id = cotizacion_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "items: comprador inserta" on public.items_cotizacion;
create policy "items: comprador inserta"
  on public.items_cotizacion for insert
  with check (
    exists (
      select 1 from public.cotizaciones
      where id = cotizacion_id and comprador_id = auth.uid()
    )
  );

drop policy if exists "items: admin lee todos" on public.items_cotizacion;
create policy "items: admin lee todos"
  on public.items_cotizacion for select
  using (
    public.is_admin()
  );

drop policy if exists "items: proveedor actualiza oferta pendiente" on public.items_cotizacion;
create policy "items: proveedor actualiza oferta pendiente"
  on public.items_cotizacion for update to authenticated
  using (
    exists (
      select 1 from public.cotizaciones c
      join public.proveedores p on p.id = c.proveedor_id
      where c.id = cotizacion_id and c.estado = 'pendiente' and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cotizaciones c
      join public.proveedores p on p.id = c.proveedor_id
      where c.id = cotizacion_id and c.estado = 'pendiente' and p.user_id = auth.uid()
    )
  );

revoke update on public.cotizaciones from authenticated;
grant update (plazo_dias, valida_hasta, condiciones, respondida_at, total_ofertado) on public.cotizaciones to authenticated;
revoke update on public.items_cotizacion from authenticated;
grant update (precio_ofertado, cantidad_ofertada) on public.items_cotizacion to authenticated;


-- =============================================================
-- SEGUIMIENTO DE VENTA — reserva y descuento de stock
-- (idempotente: se puede re-ejecutar en un proyecto existente)
-- =============================================================

alter table public.productos
  add column if not exists stock_reservado integer not null default 0;

alter table public.cotizaciones
  add column if not exists despachada_at timestamptz,
  add column if not exists cancelada_por text,
  add column if not exists cancelada_motivo text,
  add column if not exists cancelada_at timestamptz,
  add column if not exists recibida_por  text;

alter table public.productos drop constraint if exists productos_reserva_no_supera_stock;
alter table public.productos add constraint productos_reserva_no_supera_stock
  check (stock_reservado >= 0 and stock_reservado <= stock);

alter table public.cotizaciones drop constraint if exists cotizaciones_estado_check;
alter table public.cotizaciones add constraint cotizaciones_estado_check
  check (estado in ('pendiente','respondida','aceptada','rechazada','despachada','recibida','cancelada'));

alter table public.cotizaciones drop constraint if exists cotizaciones_cancelada_por_check;
alter table public.cotizaciones add constraint cotizaciones_cancelada_por_check
  check (cancelada_por is null or cancelada_por in ('comprador','proveedor'));

alter table public.cotizaciones drop constraint if exists cotizaciones_recibida_por_check;
alter table public.cotizaciones add constraint cotizaciones_recibida_por_check
  check (recibida_por is null or recibida_por in ('comprador','proveedor'));

-- ─── feedback verificado ───────────────────────────────────
create table if not exists public.feedback (
  id             uuid primary key default uuid_generate_v4(),
  cotizacion_id  uuid not null references public.cotizaciones(id) on delete cascade,
  comprador_id   uuid not null references public.profiles(id) on delete cascade,
  proveedor_id   uuid not null references public.proveedores(id) on delete cascade,
  calificacion   smallint not null check (calificacion between 1 and 5),
  comentario     text check (comentario is null or char_length(comentario) <= 1000),
  created_at     timestamptz not null default now(),
  constraint feedback_cotizacion_id_key unique (cotizacion_id)
);

create index if not exists idx_feedback_proveedor_fecha
  on public.feedback(proveedor_id, created_at desc);
create index if not exists idx_feedback_comprador
  on public.feedback(comprador_id);

alter table public.feedback enable row level security;
drop policy if exists "feedback: partes leen" on public.feedback;
drop policy if exists "feedback: comprador consulta la suya" on public.feedback;
drop policy if exists "feedback: lectura publica" on public.feedback;
-- Todas las filas son legibles, pero solo las columnas con GRANT (más abajo): comprador_id no lo es para nadie.
create policy "feedback: lectura publica"
  on public.feedback for select to anon, authenticated
  using (true);

-- La API pública recibe solo contenido de reseña y una etiqueta anónima. La vista usa los permisos de quien consulta
-- (security_invoker): no se salta RLS ni los permisos por columna.
create or replace view public.feedback_publico
with (security_invoker = true, security_barrier = true)
as
  select id, proveedor_id, calificacion, comentario, created_at,
         'Comprador verificado'::text as autor_anonimo
  from public.feedback;

revoke all on public.feedback from anon, authenticated;
grant select (id, proveedor_id, calificacion, comentario, created_at) on public.feedback to anon;
grant select (id, proveedor_id, calificacion, comentario, created_at, cotizacion_id) on public.feedback to authenticated;
revoke all on public.feedback_publico from public, anon, authenticated;
grant select on public.feedback_publico to anon, authenticated;

create or replace function public.crear_feedback(
  p_cotizacion_id uuid,
  p_calificacion integer,
  p_comentario text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comprador_id uuid;
  v_proveedor_id uuid;
  v_estado text;
  v_feedback_id uuid;
begin
  if auth.uid() is null then
    raise exception 'FEEDBACK_NO_AUTENTICADO';
  end if;

  if p_calificacion is null or p_calificacion not between 1 and 5
     or (p_comentario is not null and char_length(p_comentario) > 1000) then
    raise exception 'FEEDBACK_VALIDACION';
  end if;

  select c.comprador_id, c.proveedor_id, c.estado
    into v_comprador_id, v_proveedor_id, v_estado
  from public.cotizaciones c
  where c.id = p_cotizacion_id
  for update;

  if not found or v_comprador_id is distinct from auth.uid() or v_estado is distinct from 'recibida' then
    raise exception 'FEEDBACK_NO_ELEGIBLE';
  end if;

  if exists (select 1 from public.feedback f where f.cotizacion_id = p_cotizacion_id) then
    raise exception 'FEEDBACK_DUPLICADO';
  end if;

  insert into public.feedback(cotizacion_id, comprador_id, proveedor_id, calificacion, comentario)
  values (p_cotizacion_id, v_comprador_id, v_proveedor_id, p_calificacion, p_comentario)
  returning id into v_feedback_id;

  return v_feedback_id;
exception
  when unique_violation then
    raise exception 'FEEDBACK_DUPLICADO';
end;
$$;

revoke execute on function public.crear_feedback(uuid, integer, text) from public, anon;
grant execute on function public.crear_feedback(uuid, integer, text) to authenticated;

-- Solo las funciones de abajo pueden tocar stock_reservado.
create or replace function public.informar_stock_reservado_insuficiente()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.reserva_interna', true) = '1' then
    return NEW;
  end if;

  if NEW.stock < NEW.stock_reservado then
    raise exception 'Hay % unidades reservadas en cotizaciones aceptadas; el stock no puede ser menor que %.',
      NEW.stock_reservado, NEW.stock_reservado;
  end if;

  return NEW;
end;
$$;

create or replace function public.proteger_stock_reservado()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.reserva_interna', true) = '1' then
    return new;
  end if;

  if new.stock_reservado is distinct from old.stock_reservado then
    raise exception 'El stock reservado solo cambia al aceptar, cancelar o confirmar una venta.';
  end if;

  if new.stock < new.stock_reservado then
    raise exception 'No puedes dejar el stock por debajo de las unidades reservadas.';
  end if;

  return new;
end;
$$;

drop trigger if exists productos_proteger_reserva on public.productos;
create trigger productos_proteger_reserva
  before update on public.productos
  for each row execute function public.proteger_stock_reservado();

create trigger productos_00_stock_reservado_error_detallado
  before update on public.productos
  for each row execute function public.informar_stock_reservado_insuficiente();

create or replace function public.rechazar_cotizacion(p_cotizacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  update public.cotizaciones c
    set estado = 'rechazada'
  from public.proveedores p
  where c.id = p_cotizacion_id
    and c.proveedor_id = p.id
    and p.user_id = auth.uid()
    and c.estado = 'pendiente';

  if not found then
    raise exception 'Solo puedes rechazar una cotización pendiente.';
  end if;
end;
$$;

create or replace function public.aceptar_cotizacion(p_cotizacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cantidades jsonb;
begin
  select coalesce(
    jsonb_agg(jsonb_build_object('item_id', i.id, 'cantidad', i.cantidad) order by i.id),
    '[]'::jsonb
  ) into v_cantidades
  from public.items_cotizacion i
  where i.cotizacion_id = p_cotizacion_id;

  perform public.aceptar_cotizacion_con_cantidades(p_cotizacion_id, v_cantidades);
end;
$$;

create or replace function public.aceptar_cotizacion_con_cantidades(
  p_cotizacion_id uuid,
  p_cantidades jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_item record;
  v_stock integer;
  v_reservado integer;
  v_nombre text;
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  select c.estado into v_estado
  from public.cotizaciones c
  join public.proveedores p on p.id = c.proveedor_id
  where c.id = p_cotizacion_id and p.user_id = auth.uid()
  for update of c;

  if not found then raise exception 'No autorizado.'; end if;
  if v_estado is distinct from 'pendiente' then
    raise exception 'Solo puedes aceptar una cotización pendiente.';
  end if;
  if not exists (select 1 from public.items_cotizacion where cotizacion_id = p_cotizacion_id) then
    raise exception 'La cotización no tiene productos.';
  end if;
  if jsonb_typeof(p_cantidades) is distinct from 'array' then
    raise exception 'Debes enviar una cantidad para cada producto.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_cantidades) as entrada(valor)
    where jsonb_typeof(entrada.valor) is distinct from 'object'
       or jsonb_typeof(entrada.valor->'item_id') is distinct from 'string'
       or jsonb_typeof(entrada.valor->'cantidad') is distinct from 'number'
       or coalesce(entrada.valor->>'cantidad', '') !~ '^(0|[1-9][0-9]*)$'
  ) then
    raise exception 'Las cantidades deben ser enteros no negativos por producto.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_cantidades) as entrada(valor)
    left join public.items_cotizacion i
      on i.id::text = entrada.valor->>'item_id' and i.cotizacion_id = p_cotizacion_id
    where i.id is null
  ) then
    raise exception 'La cotización contiene una línea desconocida.';
  end if;
  if exists (
    select entrada.valor->>'item_id'
    from jsonb_array_elements(p_cantidades) as entrada(valor)
    group by entrada.valor->>'item_id' having count(*) > 1
  ) then
    raise exception 'No puedes repetir líneas de la cotización.';
  end if;
  if jsonb_array_length(p_cantidades) <> (
    select count(*) from public.items_cotizacion where cotizacion_id = p_cotizacion_id
  ) then
    raise exception 'Debes enviar una cantidad para cada producto.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_cantidades) as entrada(valor)
    join public.items_cotizacion i
      on i.id::text = entrada.valor->>'item_id' and i.cotizacion_id = p_cotizacion_id
    where (entrada.valor->>'cantidad')::bigint > i.cantidad
  ) then
    raise exception 'La cantidad confirmada no puede superar la solicitada.';
  end if;
  if (select coalesce(sum((entrada.valor->>'cantidad')::bigint), 0)
      from jsonb_array_elements(p_cantidades) as entrada(valor)) = 0 then
    raise exception 'Debes confirmar al menos una unidad.';
  end if;

  for v_item in
    select distinct i.producto_id
    from public.items_cotizacion i
    where i.cotizacion_id = p_cotizacion_id
    order by i.producto_id
  loop
    perform 1 from public.productos producto
    where producto.id = v_item.producto_id for update;
  end loop;

  for v_item in
    select i.producto_id, sum((entrada.valor->>'cantidad')::bigint) as cantidad
    from public.items_cotizacion i
    join jsonb_array_elements(p_cantidades) as entrada(valor)
      on i.id::text = entrada.valor->>'item_id'
    where i.cotizacion_id = p_cotizacion_id
    group by i.producto_id order by i.producto_id
  loop
    select producto.stock, producto.stock_reservado, producto.nombre
      into v_stock, v_reservado, v_nombre
    from public.productos producto where producto.id = v_item.producto_id;
    if v_stock is null then raise exception 'Un producto de la cotización ya no existe.'; end if;
    if v_stock - v_reservado < v_item.cantidad then
      raise exception 'No hay stock disponible de % (disponible: %, confirmado: %).',
        v_nombre, (v_stock - v_reservado), v_item.cantidad;
    end if;
  end loop;

  perform set_config('app.reserva_interna', '1', true);
  update public.items_cotizacion i
    set cantidad_confirmada = (entrada.valor->>'cantidad')::integer
  from jsonb_array_elements(p_cantidades) as entrada(valor)
  where i.id::text = entrada.valor->>'item_id' and i.cotizacion_id = p_cotizacion_id;

  for v_item in
    select i.producto_id, sum(i.cantidad_confirmada) as cantidad
    from public.items_cotizacion i where i.cotizacion_id = p_cotizacion_id
    group by i.producto_id order by i.producto_id
  loop
    update public.productos
      set stock_reservado = stock_reservado + v_item.cantidad
      where id = v_item.producto_id;
  end loop;

  update public.cotizaciones set estado = 'aceptada' where id = p_cotizacion_id;
end;
$$;

create or replace function public.despachar_cotizacion(p_cotizacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  update public.cotizaciones c
    set estado = 'despachada',
        despachada_at = now()
  from public.proveedores p
  where c.id = p_cotizacion_id
    and c.proveedor_id = p.id
    and p.user_id = auth.uid()
    and c.estado = 'aceptada';

  if not found then
    raise exception 'Solo puedes despachar una venta aceptada.';
  end if;
end;
$$;

create or replace function public.cancelar_venta(p_cotizacion_id uuid, p_cancelada_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_actor text;
  v_item record;
begin
  if p_cancelada_motivo is null or btrim(p_cancelada_motivo) = '' then
    raise exception 'Indica un motivo válido para cancelar.';
  end if;

  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  select c.estado,
    case
      when p.user_id = auth.uid() then 'proveedor'
      when c.comprador_id = auth.uid() then 'comprador'
    end
    into v_estado, v_actor
  from public.cotizaciones c
  join public.proveedores p on p.id = c.proveedor_id
  where c.id = p_cotizacion_id
    and (p.user_id = auth.uid() or c.comprador_id = auth.uid())
  for update of c;

  if not found or v_actor is null then
    raise exception 'No autorizado.';
  end if;

  if v_actor = 'comprador' and v_estado is distinct from 'aceptada' then
    raise exception 'Solo puedes cancelar antes de que el proveedor despache.';
  end if;

  if v_actor = 'proveedor' and v_estado not in ('aceptada', 'despachada') then
    raise exception 'Esta venta ya no se puede cancelar.';
  end if;

  perform set_config('app.reserva_interna', '1', true);

  for v_item in
    select i.producto_id, sum(coalesce(i.cantidad_confirmada, i.cantidad)) as cantidad
    from public.items_cotizacion i
    where i.cotizacion_id = p_cotizacion_id
    group by i.producto_id
    order by i.producto_id
  loop
    update public.productos
      set stock_reservado = greatest(0, stock_reservado - v_item.cantidad)
      where id = v_item.producto_id;
  end loop;

  update public.cotizaciones
    set estado = 'cancelada',
        cancelada_por = v_actor,
        cancelada_motivo = btrim(p_cancelada_motivo),
        cancelada_at = now()
    where id = p_cotizacion_id;
end;
$$;

-- La firma antigua se conserva para compatibilidad, pero ya no cancela sin motivo.
create or replace function public.cancelar_venta(p_cotizacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Indica un motivo válido para cancelar.';
end;
$$;

create or replace function public.confirmar_recepcion(p_cotizacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_stock integer;
  v_reservado integer;
  v_nombre text;
  v_estado text;
  v_actor text;
  v_despachada_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  select c.estado, c.despachada_at,
    case
      when c.comprador_id = auth.uid() then 'comprador'
      when p.user_id = auth.uid() then 'proveedor'
    end
    into v_estado, v_despachada_at, v_actor
  from public.cotizaciones c
  join public.proveedores p on p.id = c.proveedor_id
  where c.id = p_cotizacion_id
    and (c.comprador_id = auth.uid() or p.user_id = auth.uid())
  for update of c;

  if not found or v_actor is null then
    raise exception 'No autorizado.';
  end if;

  if v_estado is distinct from 'despachada' then
    raise exception 'Solo puedes marcar como recibido un pedido despachado.';
  end if;

  if v_actor = 'proveedor' and (
    v_despachada_at is null
    or v_despachada_at + interval '7 days' > now()
  ) then
    raise exception 'Puedes marcarla como recibida 7 días después del despacho, si el cliente no lo hizo.';
  end if;

  perform set_config('app.reserva_interna', '1', true);

  for v_item in
    select i.producto_id, sum(coalesce(i.cantidad_confirmada, i.cantidad)) as cantidad
    from public.items_cotizacion i
    where i.cotizacion_id = p_cotizacion_id
    group by i.producto_id
    order by i.producto_id
  loop
    select stock, stock_reservado, nombre
      into v_stock, v_reservado, v_nombre
    from public.productos
    where id = v_item.producto_id
    for update;

    if v_stock is null then
      raise exception 'Un producto de la cotización ya no existe.';
    end if;

    if v_stock < v_item.cantidad then
      raise exception 'No se puede confirmar %: el stock físico no alcanza.', v_nombre;
    end if;

    update public.productos
      set stock = stock - v_item.cantidad,
          stock_reservado = greatest(0, stock_reservado - v_item.cantidad)
      where id = v_item.producto_id;
  end loop;

  update public.cotizaciones
    set estado = 'recibida',
        recibida_por = v_actor
    where id = p_cotizacion_id;
end;
$$;

-- =============================================================
-- PERMISOS DE EJECUCIÓN
-- Las funciones SECURITY DEFINER quedan expuestas en /rest/v1/rpc.
-- =============================================================

-- Detalle compartido: solo el comprador o el usuario del proveedor destinatario.
create or replace function public.responder_cotizacion_con_oferta(
  p_cotizacion_id uuid,
  p_lineas jsonb,
  p_plazo_dias integer,
  p_valida_hasta date,
  p_condiciones text
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_total numeric;
  v_items integer;
  v_lineas integer;
  v_linea record;
  v_suma_cantidad integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para responder la cotización.';
  end if;

  select c.estado
    into v_estado
  from public.cotizaciones c
  join public.proveedores p on p.id = c.proveedor_id
  where c.id = p_cotizacion_id
    and p.user_id = auth.uid()
  for update of c;

  if not found then
    raise exception 'No tienes permiso para responder esta cotización.';
  end if;
  if v_estado is distinct from 'pendiente' then
    raise exception 'La cotización ya no está pendiente.';
  end if;
  if p_plazo_dias is null or p_plazo_dias not between 0 and 90 then
    raise exception 'El plazo debe estar entre 0 y 90 días.';
  end if;
  if p_valida_hasta is null or p_valida_hasta <= current_date then
    raise exception 'La fecha de validez debe ser futura.';
  end if;
  if jsonb_typeof(p_lineas) is distinct from 'array' then
    raise exception 'La oferta debe incluir todas las líneas de la cotización.';
  end if;
  if jsonb_array_length(p_lineas) = 0 then
    raise exception 'La oferta debe incluir todas las líneas de la cotización.';
  end if;

  select count(*) into v_items
  from public.items_cotizacion i
  where i.cotizacion_id = p_cotizacion_id;
  select count(*) into v_lineas
  from jsonb_to_recordset(p_lineas) as x(item_id uuid, precio_ofertado numeric, cantidad_ofertada integer);
  if v_items = 0 or v_lineas <> v_items then
    raise exception 'La oferta debe incluir cada línea de la cotización una sola vez.';
  end if;

  for v_linea in
    select x.item_id, x.precio_ofertado, x.cantidad_ofertada
    from jsonb_to_recordset(p_lineas) as x(item_id uuid, precio_ofertado numeric, cantidad_ofertada integer)
  loop
    if v_linea.item_id is null
      or v_linea.precio_ofertado is null
      or v_linea.precio_ofertado <= 0
      or v_linea.precio_ofertado::text in ('NaN', 'Infinity', '-Infinity') then
      raise exception 'Cada precio ofertado debe ser mayor que 0.';
    end if;
    if (select count(*) from jsonb_to_recordset(p_lineas) as x(item_id uuid, precio_ofertado numeric, cantidad_ofertada integer) where x.item_id = v_linea.item_id) <> 1 then
      raise exception 'La oferta debe incluir cada línea de la cotización una sola vez.';
    end if;
    if not exists (
      select 1 from public.items_cotizacion i
      where i.id = v_linea.item_id and i.cotizacion_id = p_cotizacion_id
    ) then
      raise exception 'La oferta debe incluir cada línea de la cotización una sola vez.';
    end if;
    if v_linea.cantidad_ofertada is not null and not exists (
      select 1 from public.items_cotizacion i
      where i.id = v_linea.item_id
        and i.cotizacion_id = p_cotizacion_id
        and v_linea.cantidad_ofertada between 0 and i.cantidad
        and (v_linea.cantidad_ofertada = i.cantidad or i.sujeta_disponibilidad)
    ) then
      raise exception 'Solo puedes reducir la cantidad en líneas sujetas a disponibilidad.';
    end if;
    select v_suma_cantidad + coalesce(v_linea.cantidad_ofertada, i.cantidad)
      into v_suma_cantidad
    from public.items_cotizacion i
    where i.id = v_linea.item_id;
  end loop;

  if v_suma_cantidad = 0 then
    raise exception 'La oferta debe incluir al menos una unidad.';
  end if;

  update public.items_cotizacion i
    set precio_ofertado = x.precio_ofertado,
        cantidad_ofertada = x.cantidad_ofertada
  from jsonb_to_recordset(p_lineas) as x(item_id uuid, precio_ofertado numeric, cantidad_ofertada integer)
  where i.id = x.item_id and i.cotizacion_id = p_cotizacion_id;

  select sum(i.precio_ofertado * coalesce(i.cantidad_ofertada, i.cantidad))
    into v_total
  from public.items_cotizacion i
  where i.cotizacion_id = p_cotizacion_id;

  update public.cotizaciones
    set plazo_dias = p_plazo_dias,
        valida_hasta = p_valida_hasta,
        condiciones = p_condiciones,
        estado = 'respondida',
        respondida_at = now(),
        total_ofertado = v_total
  where id = p_cotizacion_id;

  return v_total;
end;
$$;

create or replace function public.rechazar_cotizacion_con_motivo(
  p_cotizacion_id uuid,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para responder la cotización.';
  end if;
  if p_motivo is null or btrim(p_motivo) = '' or char_length(p_motivo) > 500 then
    raise exception 'El motivo del rechazo debe tener entre 1 y 500 caracteres.';
  end if;

  update public.cotizaciones c
    set estado = 'rechazada',
        motivo_rechazo = btrim(p_motivo),
        rechazada_at = now()
  from public.proveedores p
  where c.id = p_cotizacion_id
    and p.id = c.proveedor_id
    and p.user_id = auth.uid()
    and c.estado = 'pendiente';

  if not found then
    raise exception 'La cotización ya no está pendiente o no tienes permiso para rechazarla.';
  end if;
end;
$$;

revoke execute on function public.responder_cotizacion_con_oferta(uuid, jsonb, integer, date, text) from public, anon;
grant execute on function public.responder_cotizacion_con_oferta(uuid, jsonb, integer, date, text) to authenticated;
revoke execute on function public.rechazar_cotizacion_con_motivo(uuid, text) from public, anon;
grant execute on function public.rechazar_cotizacion_con_motivo(uuid, text) to authenticated;

create or replace function public.get_cotizacion_detalle(p_cotizacion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_detalle jsonb;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.cotizaciones c
    left join public.proveedores p on p.id = c.proveedor_id
    where c.id = p_cotizacion_id
      and (c.comprador_id = auth.uid() or p.user_id = auth.uid())
  ) then
    raise exception 'COTIZACION_NO_AUTORIZADA';
  end if;

  select jsonb_build_object(
    'id', c.id,
    'numero', c.numero,
    'comprador_id', c.comprador_id,
    'proveedor_id', c.proveedor_id,
    'estado', c.estado,
    'mensaje', c.mensaje,
    'total_estimado', c.total_estimado,
    'created_at', c.created_at,
    'despachada_at', c.despachada_at,
    'cancelada_por', c.cancelada_por,
    'cancelada_at', c.cancelada_at,
    'cancelada_motivo', c.cancelada_motivo,
    'plazo_dias', c.plazo_dias,
    'valida_hasta', c.valida_hasta,
    'condiciones', c.condiciones,
    'respondida_at', c.respondida_at,
    'total_ofertado', c.total_ofertado,
    'motivo_rechazo', c.motivo_rechazo,
    'rechazada_at', c.rechazada_at,
    'proveedor', jsonb_build_object(
      'id', p.id,
      'nombre_empresa', p.nombre_empresa,
      'ciudad', p.ciudad,
      'verificado', p.verificado
    ),
    'comprador', jsonb_build_object(
      'id', comprador.id,
      'nombre', comprador.nombre,
      'email', comprador.email,
      'telefono', comprador.telefono
    ),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'cotizacion_id', i.cotizacion_id,
          'producto_id', i.producto_id,
          'cantidad', i.cantidad,
          'cantidad_confirmada', i.cantidad_confirmada,
          'precio_unitario', i.precio_unitario,
          'precio_ofertado', i.precio_ofertado,
          'cantidad_ofertada', i.cantidad_ofertada,
          'sujeta_disponibilidad', i.sujeta_disponibilidad,
          'stock_al_cotizar', i.stock_al_cotizar,
          'producto', case
            when producto.id is null then null
            else jsonb_build_object('id', producto.id, 'nombre', producto.nombre, 'activo', producto.activo, 'precio', producto.precio)
          end
        ) order by i.id
      )
      from public.items_cotizacion i
      left join public.productos producto on producto.id = i.producto_id
      where i.cotizacion_id = c.id
    ), '[]'::jsonb)
  )
  into v_detalle
  from public.cotizaciones c
  join public.proveedores p on p.id = c.proveedor_id
  join public.profiles comprador on comprador.id = c.comprador_id
  where c.id = p_cotizacion_id;

  return v_detalle;
end;
$$;

revoke execute on function public.get_cotizacion_detalle(uuid) from public, anon;
grant execute on function public.get_cotizacion_detalle(uuid) to authenticated;

-- Funciones de venta: solo usuarios con sesión (además validan auth.uid()).
revoke execute on function public.aceptar_cotizacion_con_cantidades(uuid, jsonb) from public, anon;
revoke execute on function public.aceptar_cotizacion(uuid)    from public, anon;
revoke execute on function public.cancelar_venta(uuid)        from public, anon;
revoke execute on function public.cancelar_venta(uuid, text)   from public, anon;
revoke execute on function public.confirmar_recepcion(uuid)   from public, anon;
revoke execute on function public.despachar_cotizacion(uuid)  from public, anon;
revoke execute on function public.rechazar_cotizacion(uuid)   from public, anon;
grant execute on function public.aceptar_cotizacion(uuid)     to authenticated;
grant execute on function public.aceptar_cotizacion_con_cantidades(uuid, jsonb) to authenticated;
grant execute on function public.cancelar_venta(uuid)         to authenticated;
grant execute on function public.cancelar_venta(uuid, text)   to authenticated;
grant execute on function public.confirmar_recepcion(uuid)    to authenticated;
grant execute on function public.despachar_cotizacion(uuid)  to authenticated;
grant execute on function public.rechazar_cotizacion(uuid)   to authenticated;

-- =============================================================
-- NOTIFICACIONES IN-APP
-- La migración 20261010000205_notificaciones_in_app.sql es la fuente aplicable.
-- =============================================================

create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  tipo text not null,
  cotizacion_id uuid null references public.cotizaciones(id),
  titulo text not null,
  cuerpo text not null,
  leida_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notificaciones_usuario_lectura_fecha
  on public.notificaciones (user_id, leida_at, created_at desc);

alter table public.notificaciones enable row level security;

drop policy if exists "notificaciones: usuario lee las suyas" on public.notificaciones;
create policy "notificaciones: usuario lee las suyas"
  on public.notificaciones for select
  using (auth.uid() = user_id);

drop policy if exists "notificaciones: usuario marca las suyas" on public.notificaciones;
create policy "notificaciones: usuario marca las suyas"
  on public.notificaciones for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.notificaciones from public, anon, authenticated;
grant select, update on public.notificaciones to authenticated;

create or replace function public.crear_notificacion_cotizacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proveedor_user_id uuid;
  v_destinatario uuid;
  v_tipo text;
  v_titulo text;
  v_cuerpo text;
  v_identificador text;
begin
  if tg_op = 'UPDATE' and old.estado is not distinct from new.estado then
    return new;
  end if;

  select p.user_id into v_proveedor_user_id
  from public.proveedores p
  where p.id = new.proveedor_id;

  if v_proveedor_user_id is null then
    return new;
  end if;

  v_identificador := '#COT-' || lpad(
    new.numero::text,
    greatest(6, length(new.numero::text)),
    '0'
  );

  if tg_op = 'INSERT' then
    if new.estado <> 'pendiente' then
      return new;
    end if;
    v_destinatario := v_proveedor_user_id;
    v_tipo := 'nueva_solicitud';
    v_titulo := 'Nueva solicitud ' || v_identificador;
    v_cuerpo := 'Tienes una nueva solicitud de cotización.';
  else
    case new.estado
      when 'respondida' then
        v_destinatario := new.comprador_id;
        v_tipo := 'cotizacion_respondida';
        v_titulo := 'Cotización respondida ' || v_identificador;
        v_cuerpo := 'El proveedor respondió tu solicitud.';
      when 'aceptada' then
        v_destinatario := case
          when auth.uid() = new.comprador_id then v_proveedor_user_id
          else new.comprador_id
        end;
        v_tipo := 'cotizacion_aceptada';
        v_titulo := 'Cotización aceptada ' || v_identificador;
        v_cuerpo := 'La cotización fue aceptada.';
      when 'rechazada' then
        v_destinatario := case
          when auth.uid() = new.comprador_id then v_proveedor_user_id
          else new.comprador_id
        end;
        v_tipo := 'cotizacion_rechazada';
        v_titulo := 'Cotización rechazada ' || v_identificador;
        v_cuerpo := 'La cotización fue rechazada.';
      when 'despachada' then
        v_destinatario := new.comprador_id;
        v_tipo := 'cotizacion_despachada';
        v_titulo := 'Cotización despachada ' || v_identificador;
        v_cuerpo := 'Tu pedido fue despachado.';
      when 'recibida' then
        v_destinatario := v_proveedor_user_id;
        v_tipo := 'cotizacion_recibida';
        v_titulo := 'Cotización recibida ' || v_identificador;
        v_cuerpo := 'El comprador confirmó la recepción del pedido.';
      when 'cancelada' then
        v_destinatario := case new.cancelada_por
          when 'comprador' then v_proveedor_user_id
          when 'proveedor' then new.comprador_id
          else null
        end;
        v_tipo := 'cotizacion_cancelada';
        v_titulo := 'Cotización cancelada ' || v_identificador;
        v_cuerpo := 'La cotización fue cancelada. Motivo: ' ||
          coalesce(nullif(btrim(new.cancelada_motivo), ''), 'No especificado');
      else
        return new;
    end case;
  end if;

  if v_destinatario is not null then
    insert into public.notificaciones (user_id, tipo, cotizacion_id, titulo, cuerpo)
    values (v_destinatario, v_tipo, new.id, v_titulo, v_cuerpo);
  end if;

  return new;
end;
$$;

revoke all on function public.crear_notificacion_cotizacion() from public, anon, authenticated;

drop trigger if exists cotizaciones_notificar_insert on public.cotizaciones;
create trigger cotizaciones_notificar_insert
  after insert on public.cotizaciones
  for each row execute function public.crear_notificacion_cotizacion();

drop trigger if exists cotizaciones_notificar_cambio_estado on public.cotizaciones;
create trigger cotizaciones_notificar_cambio_estado
  after update of estado on public.cotizaciones
  for each row execute function public.crear_notificacion_cotizacion();

-- Función de trigger: Postgres no exige EXECUTE para dispararlo.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- is_admin() debe seguir ejecutable por anon: las políticas RLS la evalúan
-- también en consultas sin sesión (por ejemplo, el catálogo público).

alter function public.proteger_stock_reservado() set search_path = public;
create or replace function public.datos_email_notificacion_cotizacion(
  p_cotizacion_id uuid,
  p_tipo text
)
returns table(
  destinatario_email text,
  contraparte_nombre text,
  numero bigint,
  total_estimado numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_cotizacion public.cotizaciones%rowtype;
  v_proveedor_usuario uuid;
  v_destinatario uuid;
begin
  if v_usuario is null then
    raise exception 'Se requiere una sesión autenticada.';
  end if;

  if p_tipo not in (
    'nueva_solicitud', 'cotizacion_respondida', 'cotizacion_aceptada',
    'cotizacion_rechazada', 'cotizacion_despachada', 'cotizacion_recibida',
    'cotizacion_cancelada'
  ) then
    raise exception 'Tipo de notificación no válido.';
  end if;

  select c.* into v_cotizacion
  from public.cotizaciones c
  where c.id = p_cotizacion_id;

  if not found then
    raise exception 'La cotización no existe.';
  end if;

  select p.user_id into v_proveedor_usuario
  from public.proveedores p
  where p.id = v_cotizacion.proveedor_id;

  if v_usuario <> v_cotizacion.comprador_id and v_usuario <> v_proveedor_usuario then
    raise exception 'No tienes acceso a esta cotización.';
  end if;

  if (p_tipo = 'nueva_solicitud' and v_cotizacion.estado = 'pendiente' and v_usuario = v_cotizacion.comprador_id)
    or (p_tipo = 'cotizacion_respondida' and v_cotizacion.estado = 'respondida' and v_usuario = v_proveedor_usuario)
    or (p_tipo = 'cotizacion_aceptada' and v_cotizacion.estado = 'aceptada')
    or (p_tipo = 'cotizacion_rechazada' and v_cotizacion.estado = 'rechazada')
    or (p_tipo = 'cotizacion_despachada' and v_cotizacion.estado = 'despachada' and v_usuario = v_proveedor_usuario)
    or (p_tipo = 'cotizacion_recibida' and v_cotizacion.estado = 'recibida' and v_usuario = v_cotizacion.comprador_id)
    or (p_tipo = 'cotizacion_cancelada' and v_cotizacion.estado = 'cancelada'
      and v_cotizacion.cancelada_por in ('comprador', 'proveedor')) then
    null;
  else
    raise exception 'El estado de la cotización no corresponde a la notificación.';
  end if;

  if p_tipo in ('nueva_solicitud', 'cotizacion_recibida') then
    v_destinatario := v_proveedor_usuario;
  elsif p_tipo = 'cotizacion_respondida' or p_tipo = 'cotizacion_despachada' then
    v_destinatario := v_cotizacion.comprador_id;
  elsif p_tipo in ('cotizacion_aceptada', 'cotizacion_rechazada') then
    v_destinatario := case when v_usuario = v_proveedor_usuario
      then v_cotizacion.comprador_id else v_proveedor_usuario end;
  else
    v_destinatario := case when v_cotizacion.cancelada_por = 'comprador'
      then v_proveedor_usuario else v_cotizacion.comprador_id end;
  end if;

  select pr.email into destinatario_email
  from public.profiles pr
  where pr.id = v_destinatario;

  if v_destinatario = v_proveedor_usuario then
    select pr.nombre into contraparte_nombre
    from public.profiles pr
    where pr.id = v_cotizacion.comprador_id;
  else
    select p.nombre_empresa into contraparte_nombre
    from public.proveedores p
    where p.id = v_cotizacion.proveedor_id;
  end if;

  if destinatario_email is null or btrim(destinatario_email) = ''
    or contraparte_nombre is null or btrim(contraparte_nombre) = '' then
    raise exception 'Faltan datos obligatorios del destinatario del correo.';
  end if;

  numero := v_cotizacion.numero;
  total_estimado := v_cotizacion.total_estimado;
  return next;
end;
$$;

comment on function public.datos_email_notificacion_cotizacion(uuid, text) is
  'Devuelve de forma autenticada los datos mínimos para notificar por correo a la contraparte de una cotización.';

revoke all on function public.datos_email_notificacion_cotizacion(uuid, text) from public, anon, authenticated;
grant execute on function public.datos_email_notificacion_cotizacion(uuid, text) to authenticated;
