-- Quita solo los SKU y especificaciones que puso la migración (los que el proveedor cambió se quedan).
update public.productos set sku = null, especificaciones = null
where id::text like 'd0000000-0000-0000-0000-0000000000%' and sku in ('PRO-PVC-4S-6', 'PRO-PVC-12P-6', 'PRO-LLE-12B', 'PRO-PEG-TAN-237', 'LOP-THHN-12-100', 'LOP-BRK-SQD-20-1', 'LOP-PIN-ACR-5G', 'MDN-CEM-P1-425', 'MDN-VAR-38-6', 'MDN-BLQ-6-P100', 'SOL-EVA-ELEC', 'SOL-INV-HIB-5K', 'SOL-PAN-MONO-550', 'SOL-BAT-LIT-5K', 'SOL-KIT-RES-3K', 'AUT-CHK-PRECOMPRA', 'AUT-DIAG-OBD2', 'AUT-INSP-MOTO', 'AUT-EVAL-CHASIS', 'AUT-ACEITE-MO');
