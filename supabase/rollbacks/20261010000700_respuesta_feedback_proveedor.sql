drop policy if exists "feedback: proveedor responde una vez" on public.feedback;
revoke select (respuesta, respuesta_at) on public.feedback from anon, authenticated;
revoke update (respuesta, respuesta_at) on public.feedback from authenticated;
alter table public.feedback
  drop column respuesta,
  drop column respuesta_at;
