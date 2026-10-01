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
create policy "cotizaciones: proveedor actualiza estado"
  on public.cotizaciones for update
  using (
    exists (
      select 1 from public.proveedores
      where id = proveedor_id and user_id = auth.uid()
    )
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


-- =============================================================
-- SEGUIMIENTO DE VENTA — reserva y descuento de stock
-- (idempotente: se puede re-ejecutar en un proyecto existente)
-- =============================================================

alter table public.productos
  add column if not exists stock_reservado integer not null default 0;

alter table public.cotizaciones
  add column if not exists despachada_at timestamptz,
  add column if not exists cancelada_por text,
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

-- Solo las funciones de abajo pueden tocar stock_reservado.
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
  v_estado text;
  v_item record;
  v_stock integer;
  v_reservado integer;
  v_nombre text;
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  select c.estado
    into v_estado
  from public.cotizaciones c
  join public.proveedores p on p.id = c.proveedor_id
  where c.id = p_cotizacion_id
    and p.user_id = auth.uid()
  for update of c;

  if not found then
    raise exception 'No autorizado.';
  end if;

  if v_estado is distinct from 'pendiente' then
    raise exception 'Solo puedes aceptar una cotización pendiente.';
  end if;

  if not exists (
    select 1 from public.items_cotizacion where cotizacion_id = p_cotizacion_id
  ) then
    raise exception 'La cotización no tiene productos.';
  end if;

  perform set_config('app.reserva_interna', '1', true);

  for v_item in
    select i.producto_id, sum(i.cantidad) as cantidad
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

    if v_stock - v_reservado < v_item.cantidad then
      raise exception 'No hay stock disponible de % (disponible: %, pedido: %).',
        v_nombre, (v_stock - v_reservado), v_item.cantidad;
    end if;

    update public.productos
      set stock_reservado = stock_reservado + v_item.cantidad
      where id = v_item.producto_id;
  end loop;

  update public.cotizaciones
    set estado = 'aceptada'
    where id = p_cotizacion_id;
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

create or replace function public.cancelar_venta(p_cotizacion_id uuid)
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
    select i.producto_id, sum(i.cantidad) as cantidad
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
        cancelada_por = v_actor
    where id = p_cotizacion_id;
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
    select i.producto_id, sum(i.cantidad) as cantidad
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

-- Funciones de venta: solo usuarios con sesión (además validan auth.uid()).
revoke execute on function public.aceptar_cotizacion(uuid)    from public, anon;
revoke execute on function public.cancelar_venta(uuid)        from public, anon;
revoke execute on function public.confirmar_recepcion(uuid)   from public, anon;
revoke execute on function public.despachar_cotizacion(uuid)  from public, anon;
revoke execute on function public.rechazar_cotizacion(uuid)   from public, anon;

-- Función de trigger: Postgres no exige EXECUTE para dispararlo.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- is_admin() debe seguir ejecutable por anon: las políticas RLS la evalúan
-- también en consultas sin sesión (por ejemplo, el catálogo público).

alter function public.proteger_stock_reservado() set search_path = public;
