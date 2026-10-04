-- feedback_publico: solo lectura para anon y authenticated.
--
-- Los privilegios por defecto de Supabase le daban a anon y authenticated todos los permisos sobre las vistas nuevas; la
-- migración anterior solo los quitó de PUBLIC. No era explotable (la vista usa los permisos de quien consulta y esos roles
-- no pueden escribir en feedback), pero una vista pública no debe aceptar INSERT, UPDATE ni DELETE.

revoke all on public.feedback_publico from public, anon, authenticated;
grant select on public.feedback_publico to anon, authenticated;
