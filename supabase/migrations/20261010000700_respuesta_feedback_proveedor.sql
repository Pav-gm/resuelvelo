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
