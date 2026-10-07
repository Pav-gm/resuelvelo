-- Todo producto activo tiene subcategoría: si no, el filtro por subcategoría del catálogo no lo encuentra.
do $$
declare
  sin_subcategoria integer;
begin
  select count(*) into sin_subcategoria from public.productos where activo and subcategoria_id is null;
  if sin_subcategoria > 0 then
    raise exception 'Hay % productos activos sin subcategoría', sin_subcategoria;
  end if;
end;
$$;
