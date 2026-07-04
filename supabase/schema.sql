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

-- ─── productos ──────────────────────────────────────────────
create table if not exists public.productos (
  id            uuid primary key default uuid_generate_v4(),
  proveedor_id  uuid not null references public.proveedores(id) on delete cascade,
  categoria_id  uuid not null references public.categorias(id),
  nombre        text not null,
  descripcion   text,
  precio        numeric(12,2) not null check (precio >= 0),
  unidad        text not null default 'unidad',
  stock         integer not null default 0 check (stock >= 0),
  imagen_url    text,
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ─── cotizaciones ───────────────────────────────────────────
create table if not exists public.cotizaciones (
  id              uuid primary key default uuid_generate_v4(),
  comprador_id    uuid not null references public.profiles(id),
  proveedor_id    uuid not null references public.proveedores(id),
  estado          text not null check (estado in ('pendiente','respondida','aceptada','rechazada')) default 'pendiente',
  mensaje         text,
  total_estimado  numeric(12,2),
  created_at      timestamptz not null default now()
);

-- ─── items_cotizacion ───────────────────────────────────────
create table if not exists public.items_cotizacion (
  id              uuid primary key default uuid_generate_v4(),
  cotizacion_id   uuid not null references public.cotizaciones(id) on delete cascade,
  producto_id     uuid not null references public.productos(id),
  cantidad        integer not null check (cantidad > 0),
  precio_unitario numeric(12,2)
);

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

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

alter table public.profiles          enable row level security;
alter table public.proveedores       enable row level security;
alter table public.categorias        enable row level security;
alter table public.productos         enable row level security;
alter table public.cotizaciones      enable row level security;
alter table public.items_cotizacion  enable row level security;

-- ─── profiles ───────────────────────────────────────────────
create policy "profiles: usuario ve el suyo"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: usuario actualiza el suyo"
  on public.profiles for update
  using (auth.uid() = id);

-- ─── proveedores ────────────────────────────────────────────
create policy "proveedores: lectura pública"
  on public.proveedores for select
  using (true);

create policy "proveedores: proveedor inserta el suyo"
  on public.proveedores for insert
  with check (auth.uid() = user_id);

create policy "proveedores: proveedor actualiza el suyo"
  on public.proveedores for update
  using (auth.uid() = user_id);

-- ─── categorias ─────────────────────────────────────────────
create policy "categorias: lectura pública"
  on public.categorias for select
  using (true);

create policy "categorias: solo admin inserta"
  on public.categorias for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

-- ─── productos ──────────────────────────────────────────────
create policy "productos: lectura pública de activos"
  on public.productos for select
  using (activo = true or auth.uid() = (
    select user_id from public.proveedores where id = proveedor_id
  ));

create policy "productos: proveedor inserta los suyos"
  on public.productos for insert
  with check (
    exists (
      select 1 from public.proveedores
      where id = proveedor_id and user_id = auth.uid()
    )
  );

create policy "productos: proveedor actualiza los suyos"
  on public.productos for update
  using (
    exists (
      select 1 from public.proveedores
      where id = proveedor_id and user_id = auth.uid()
    )
  );

create policy "productos: proveedor elimina los suyos"
  on public.productos for delete
  using (
    exists (
      select 1 from public.proveedores
      where id = proveedor_id and user_id = auth.uid()
    )
  );

-- ─── cotizaciones ───────────────────────────────────────────
create policy "cotizaciones: comprador ve las suyas"
  on public.cotizaciones for select
  using (auth.uid() = comprador_id);

create policy "cotizaciones: proveedor ve las dirigidas a él"
  on public.cotizaciones for select
  using (
    exists (
      select 1 from public.proveedores
      where id = proveedor_id and user_id = auth.uid()
    )
  );

create policy "cotizaciones: comprador crea"
  on public.cotizaciones for insert
  with check (auth.uid() = comprador_id);

create policy "cotizaciones: proveedor actualiza estado"
  on public.cotizaciones for update
  using (
    exists (
      select 1 from public.proveedores
      where id = proveedor_id and user_id = auth.uid()
    )
  );

-- ─── items_cotizacion ───────────────────────────────────────
create policy "items: comprador ve los suyos"
  on public.items_cotizacion for select
  using (
    exists (
      select 1 from public.cotizaciones
      where id = cotizacion_id and comprador_id = auth.uid()
    )
  );

create policy "items: proveedor ve los suyos"
  on public.items_cotizacion for select
  using (
    exists (
      select 1 from public.cotizaciones c
      join public.proveedores p on p.id = c.proveedor_id
      where c.id = cotizacion_id and p.user_id = auth.uid()
    )
  );

create policy "items: comprador inserta"
  on public.items_cotizacion for insert
  with check (
    exists (
      select 1 from public.cotizaciones
      where id = cotizacion_id and comprador_id = auth.uid()
    )
  );
