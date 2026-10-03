-- Feedback verificado: una reseña por cotización recibida, escrita solo por su comprador mediante crear_feedback().
--
-- Cambios (aplicar primero en resuelvelo-dev, validar y solo entonces producción, con un respaldo pre-change):
--   1. Tabla public.feedback (RLS: el comprador lee la suya), vista pública public.feedback_publico (solo reseña y
--      etiqueta anónima) y función crear_feedback() con EXECUTE solo para usuarios autenticados.
--   2. Se retira la política "cotizaciones: proveedor actualiza estado": el estado de una cotización cambia solo
--      mediante las funciones aceptar/rechazar/despachar/confirmar_recepcion, para que nadie pueda marcar una venta
--      como recibida por fuera del flujo y falsear una reseña "verificada".
--   3. Se concede EXECUTE a authenticated en esas cinco funciones (idempotente: ya lo conceden los privilegios por
--      defecto de Supabase; se deja explícito porque ahora son la única vía).
--
-- Desplegar el código antes de aplicar esta migración causaría errores de lectura y escritura del feedback.

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
create policy "feedback: comprador consulta la suya"
  on public.feedback for select to authenticated
  using (comprador_id = auth.uid());

-- La API pública recibe solo contenido de reseña y una etiqueta anónima.
create or replace view public.feedback_publico
with (security_barrier = true)
as
  select id, proveedor_id, calificacion, comentario, created_at,
         'Comprador verificado'::text as autor_anonimo
  from public.feedback;

revoke all on public.feedback from anon, authenticated;
grant select on public.feedback to authenticated;
revoke all on public.feedback_publico from public;
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

-- El estado de una cotización cambia solo por funciones, nunca por UPDATE directo del proveedor.
drop policy if exists "cotizaciones: proveedor actualiza estado" on public.cotizaciones;

grant execute on function public.aceptar_cotizacion(uuid)    to authenticated;
grant execute on function public.cancelar_venta(uuid)        to authenticated;
grant execute on function public.confirmar_recepcion(uuid)   to authenticated;
grant execute on function public.despachar_cotizacion(uuid)  to authenticated;
grant execute on function public.rechazar_cotizacion(uuid)   to authenticated;
