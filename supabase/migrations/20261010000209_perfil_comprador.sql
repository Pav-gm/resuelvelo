alter table public.profiles
  add column razon_social text null,
  add column rnc text null;

create table public.direcciones_obra (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  etiqueta text not null,
  direccion text not null,
  provincia text not null,
  municipio text null,
  referencia text null,
  es_principal boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.direcciones_obra enable row level security;

create policy "direcciones_obra: usuario ve las suyas"
  on public.direcciones_obra for select
  using (auth.uid() = user_id);

create policy "direcciones_obra: usuario crea las suyas"
  on public.direcciones_obra for insert
  with check (auth.uid() = user_id);

create policy "direcciones_obra: usuario actualiza las suyas"
  on public.direcciones_obra for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "direcciones_obra: usuario elimina las suyas"
  on public.direcciones_obra for delete
  using (auth.uid() = user_id);
