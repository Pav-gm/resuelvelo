do $$
begin
  if exists (
    select 1
    from public.items_cotizacion i
    join public.cotizaciones c on c.id = i.cotizacion_id
    where c.estado in ('aceptada', 'despachada', 'recibida')
      and i.cantidad_confirmada > i.cantidad
  ) then
    raise exception 'Una cantidad confirmada supera la cantidad solicitada.';
  end if;
end;
$$;
