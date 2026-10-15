drop view public.feedback_publico;
create view public.feedback_publico
with (security_invoker = true, security_barrier = true)
as
  select id, proveedor_id, calificacion, comentario, created_at,
         'Comprador verificado'::text as autor_anonimo
  from public.feedback;
revoke all on public.feedback_publico from public, anon, authenticated;
grant select on public.feedback_publico to anon, authenticated;

drop policy if exists "feedback: proveedor responde una vez" on public.feedback;
revoke select (respuesta, respuesta_at) on public.feedback from anon, authenticated;
revoke update (respuesta, respuesta_at) on public.feedback from authenticated;
alter table public.feedback
  drop column respuesta,
  drop column respuesta_at;
