alter table public.items_cotizacion
  add column sujeta_disponibilidad boolean not null default false,
  add column stock_al_cotizar integer;
