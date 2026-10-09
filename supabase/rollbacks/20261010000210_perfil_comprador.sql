drop policy "direcciones_obra: usuario elimina las suyas" on public.direcciones_obra;
drop policy "direcciones_obra: usuario actualiza las suyas" on public.direcciones_obra;
drop policy "direcciones_obra: usuario crea las suyas" on public.direcciones_obra;
drop policy "direcciones_obra: usuario ve las suyas" on public.direcciones_obra;

drop table public.direcciones_obra;

alter table public.profiles
  drop column razon_social,
  drop column rnc;
