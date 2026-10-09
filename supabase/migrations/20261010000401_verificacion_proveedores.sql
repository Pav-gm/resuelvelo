alter table public.proveedores
  add column verificacion_estado text not null default 'sin_solicitar'
    check (verificacion_estado in ('sin_solicitar', 'pendiente', 'verificado', 'rechazado')),
  add column verificacion_nota text null,
  add column verificacion_solicitada_at timestamptz null,
  add column verificado_at timestamptz null;

update public.proveedores
set verificacion_estado = 'verificado', verificado_at = now()
where verificado = true;

create or replace function public.sincronizar_verificacion_proveedor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean := public.is_admin();
  v_solicitud_rpc boolean := current_setting('app.solicitar_verificacion_proveedor', true) = 'on';
begin
  if tg_op = 'INSERT' then
    if not v_admin and (
      new.verificado is distinct from false
      or new.verificacion_estado is distinct from 'sin_solicitar'
      or new.verificacion_nota is not null
      or new.verificacion_solicitada_at is not null
      or new.verificado_at is not null
    ) then
      raise exception 'Solo un administrador puede definir campos de verificación.';
    end if;
  elsif not v_admin and not v_solicitud_rpc and (
    new.verificado is distinct from old.verificado
    or new.verificacion_estado is distinct from old.verificacion_estado
    or new.verificacion_nota is distinct from old.verificacion_nota
    or new.verificacion_solicitada_at is distinct from old.verificacion_solicitada_at
    or new.verificado_at is distinct from old.verificado_at
  ) then
    raise exception 'Solo un administrador puede modificar los campos de verificación.';
  end if;

  new.verificado := (new.verificacion_estado = 'verificado');
  if new.verificacion_estado = 'verificado' then
    if tg_op = 'INSERT' then
      new.verificado_at := now();
    elsif old.verificacion_estado is distinct from 'verificado' or new.verificado_at is null then
      new.verificado_at := now();
    end if;
  else
    new.verificado_at := null;
  end if;
  return new;
end;
$$;

revoke all on function public.sincronizar_verificacion_proveedor() from public;

create trigger sincronizar_verificacion_proveedor
  before insert or update on public.proveedores
  for each row execute function public.sincronizar_verificacion_proveedor();

create policy "proveedores: admin actualiza verificación"
  on public.proveedores for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.solicitar_verificacion_proveedor()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_proveedor public.proveedores%rowtype;
begin
  if v_usuario is null then
    raise exception 'Debes iniciar sesión para solicitar la verificación.';
  end if;

  select * into v_proveedor
  from public.proveedores
  where user_id = v_usuario
  for update;

  if not found then
    raise exception 'No se encontró un proveedor asociado a tu cuenta.';
  end if;
  if nullif(btrim(v_proveedor.rnc), '') is null or nullif(btrim(v_proveedor.telefono), '') is null then
    raise exception 'Completa el RNC y el teléfono en tu perfil antes de solicitar la verificación.';
  end if;
  if v_proveedor.verificacion_estado not in ('sin_solicitar', 'rechazado') then
    raise exception 'Solo puedes solicitar la verificación si está sin solicitar o fue rechazada.';
  end if;

  perform set_config('app.solicitar_verificacion_proveedor', 'on', true);
  update public.proveedores
  set verificacion_estado = 'pendiente',
      verificacion_solicitada_at = now(),
      verificacion_nota = null
  where id = v_proveedor.id;
end;
$$;

revoke all on function public.solicitar_verificacion_proveedor() from public;
grant execute on function public.solicitar_verificacion_proveedor() to authenticated;
