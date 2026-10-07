do $$
declare
  duplicados bigint;
begin
  select count(*) into duplicados
  from (
    select numero
    from public.cotizaciones
    group by numero
    having count(*) > 1
  ) as numeros_duplicados;

  if duplicados > 0 then
    raise exception 'Hay % números de cotización duplicados', duplicados;
  end if;
end;
$$;
