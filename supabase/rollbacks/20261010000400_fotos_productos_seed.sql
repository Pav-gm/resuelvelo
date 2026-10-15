-- Quita solo las fotos de catálogo que puso la migración (las que el proveedor cambió se quedan).
update public.productos set imagen_url = null
where imagen_url like '/productos/d0000000-%.jpg' and imagen_url = '/productos/' || id::text || '.jpg';
