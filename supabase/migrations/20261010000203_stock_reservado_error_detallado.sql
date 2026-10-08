create or replace function public.informar_stock_reservado_insuficiente()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.reserva_interna', true) = '1' then
    return NEW;
  end if;

  if NEW.stock < NEW.stock_reservado then
    raise exception 'Hay % unidades reservadas en cotizaciones aceptadas; el stock no puede ser menor que %.',
      NEW.stock_reservado, NEW.stock_reservado;
  end if;

  return NEW;
end;
$$;

create trigger productos_00_stock_reservado_error_detallado
  before update on public.productos
  for each row execute function public.informar_stock_reservado_insuficiente();
