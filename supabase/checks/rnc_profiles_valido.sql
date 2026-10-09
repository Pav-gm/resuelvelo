do $$
begin
  if exists (
    select 1
    from public.profiles
    where rnc is not null
      and rnc !~ '^[0-9]{9}([0-9]{2})?$'
  ) then
    raise exception 'profiles.rnc debe contener exactamente 9 u 11 dígitos ASCII cuando no es nulo.';
  end if;
end;
$$;
