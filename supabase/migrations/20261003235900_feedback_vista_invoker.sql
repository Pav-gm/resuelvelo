-- Feedback: la vista pública pasa a security_invoker (sin saltarse RLS) y la lectura se controla por columnas.
--
-- Antes: feedback_publico corría con los permisos de su dueño (el linter de Supabase la marca como ERROR, "Security
-- Definer View") y la tabla dependía de una política para el comprador.
-- Ahora: cualquiera puede leer las filas de feedback, pero solo las columnas con GRANT. Nadie (anon ni authenticated)
-- puede leer comprador_id; los usuarios autenticados leen además cotizacion_id, que la aplicación usa para saber si el
-- comprador ya dejó su reseña (no se puede cruzar con cotizaciones: esa tabla sigue protegida por RLS).
-- La vista usa los permisos de quien consulta. crear_feedback() sigue siendo security definer y no cambia.

drop policy if exists "feedback: comprador consulta la suya" on public.feedback;
drop policy if exists "feedback: lectura publica" on public.feedback;
create policy "feedback: lectura publica"
  on public.feedback for select to anon, authenticated
  using (true);

revoke all on public.feedback from anon, authenticated;
grant select (id, proveedor_id, calificacion, comentario, created_at) on public.feedback to anon;
grant select (id, proveedor_id, calificacion, comentario, created_at, cotizacion_id) on public.feedback to authenticated;

alter view public.feedback_publico set (security_invoker = true, security_barrier = true);
