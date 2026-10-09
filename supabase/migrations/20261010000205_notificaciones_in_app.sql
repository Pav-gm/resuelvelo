create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  tipo text not null,
  cotizacion_id uuid null references public.cotizaciones(id),
  titulo text not null,
  cuerpo text not null,
  leida_at timestamptz null,
  created_at timestamptz not null default now()
);

create index idx_notificaciones_usuario_lectura_fecha
  on public.notificaciones (user_id, leida_at, created_at desc);

alter table public.notificaciones enable row level security;

create policy "notificaciones: usuario lee las suyas"
  on public.notificaciones for select
  using (auth.uid() = user_id);

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

create trigger cotizaciones_notificar_insert
  after insert on public.cotizaciones
  for each row execute function public.crear_notificacion_cotizacion();

create trigger cotizaciones_notificar_cambio_estado
  after update of estado on public.cotizaciones
  for each row execute function public.crear_notificacion_cotizacion();
