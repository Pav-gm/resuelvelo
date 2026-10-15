do $$
begin
  if exists (
    select 1 from public.items_cotizacion
    where producto_id is null and nullif(btrim(descripcion), '') is null
  ) then
    raise exception 'Hay líneas de cotización sin producto ni descripción.';
  end if;

  if exists (
    select 1
    from public.cotizaciones c
    join public.solicitudes s on s.id = c.solicitud_id
    where c.solicitud_id is not null and c.comprador_id <> s.comprador_id
  ) then
    raise exception 'Una cotización pertenece a un comprador distinto de su solicitud.';
  end if;
end;
$$;
