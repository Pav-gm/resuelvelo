do $$
begin
  if exists (
    select 1
    from public.proveedores
    where verificado is distinct from (verificacion_estado = 'verificado')
       or verificacion_estado not in ('sin_solicitar', 'pendiente', 'verificado', 'rechazado')
  ) then
    raise exception 'Hay proveedores con estado de verificación inconsistente.';
  end if;
end;
$$;
