alter table public.feedback
  add column respuesta text null,
  add column respuesta_at timestamptz null;

grant select (respuesta, respuesta_at) on public.feedback to anon, authenticated;
grant update (respuesta, respuesta_at) on public.feedback to authenticated;

create policy "feedback: proveedor responde una vez"
  on public.feedback for update to authenticated
  using (
    respuesta is null
    and exists (
      select 1 from public.proveedores p
      where p.id = feedback.proveedor_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.proveedores p
      where p.id = feedback.proveedor_id and p.user_id = auth.uid()
    )
  );

create or replace view public.feedback_publico
with (security_invoker = true, security_barrier = true)
as
  select id, proveedor_id, calificacion, comentario, created_at,
         'Comprador verificado'::text as autor_anonimo,
         respuesta, respuesta_at
  from public.feedback;
revoke all on public.feedback_publico from public, anon, authenticated;
grant select on public.feedback_publico to anon, authenticated;
