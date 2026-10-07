alter table public.cotizaciones
  drop constraint if exists cotizaciones_numero_key;

alter table public.cotizaciones
  drop column if exists numero;
