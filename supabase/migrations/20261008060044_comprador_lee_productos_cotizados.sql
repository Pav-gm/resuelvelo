create policy "productos: compradores leen productos de sus cotizaciones"
  on public.productos for select
  using (
    exists (
      select 1
      from public.items_cotizacion i
      join public.cotizaciones c on c.id = i.cotizacion_id
      where i.producto_id = productos.id
        and c.comprador_id = auth.uid()
    )
  );
