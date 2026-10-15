-- SKU y especificaciones de los productos del seed, para que su ficha muestre datos completos.
-- Solo rellena productos que todavía no tienen ninguno de los dos.
update public.productos as p set sku = v.sku, especificaciones = v.especificaciones
from (values
  ('d0000000-0000-0000-0000-000000000001'::uuid, 'PRO-PVC-4S-6', E'Material: PVC rígido, cédula 40\nDiámetro: 4" (110 mm)\nLargo: 6 m\nUso: sanitario (desagüe y alcantarillado)\nUnión: cementada'),
  ('d0000000-0000-0000-0000-000000000002'::uuid, 'PRO-PVC-12P-6', E'Material: PVC de presión SDR 13.5\nDiámetro: 1/2"\nLargo: 6 m\nPresión de trabajo: 315 psi\nUso: agua potable fría'),
  ('d0000000-0000-0000-0000-000000000003'::uuid, 'PRO-LLE-12B', E'Material: bronce\nTipo: esférica, paso total\nRosca: 1/2" NPT hembra-hembra\nPresión máxima: 600 psi\nManeral: palanca de acero'),
  ('d0000000-0000-0000-0000-000000000004'::uuid, 'PRO-PEG-TAN-237', E'Marca: Tangit\nContenido: 237 ml\nUso: unión de tubería y accesorios de PVC rígido\nSecado al tacto: 5 minutos\nIncluye aplicador'),
  ('d0000000-0000-0000-0000-000000000005'::uuid, 'LOP-THHN-12-100', E'Calibre: 12 AWG\nConductor: cobre sólido\nAislamiento: THHN/THWN-2, 600 V, 90 °C\nLargo del rollo: 100 m\nColor: negro'),
  ('d0000000-0000-0000-0000-000000000006'::uuid, 'LOP-BRK-SQD-20-1', E'Marca: Square D\nCorriente nominal: 20 A\nPolos: 1\nTensión: 120/240 V\nMontaje: enchufable, línea QO'),
  ('d0000000-0000-0000-0000-000000000007'::uuid, 'LOP-PIN-ACR-5G', E'Tipo: acrílica para interiores\nAcabado: mate\nContenido: 5 galones (18.9 L)\nRendimiento: 35 a 40 m² por galón\nSecado al tacto: 1 hora'),
  ('d0000000-0000-0000-0000-000000000008'::uuid, 'MDN-CEM-P1-425', E'Tipo: Portland I, uso general\nPeso: 42.5 kg\nResistencia a 28 días: 42.5 MPa\nNorma: ASTM C150\nPresentación: saco de papel'),
  ('d0000000-0000-0000-0000-000000000009'::uuid, 'MDN-VAR-38-6', E'Material: acero corrugado grado 60\nDiámetro: 3/8" (9.5 mm)\nLargo: 6 m\nPeso aproximado: 3.4 kg por varilla\nNorma: ASTM A615'),
  ('d0000000-0000-0000-0000-000000000010'::uuid, 'MDN-BLQ-6-P100', E'Medida: 6" x 8" x 16"\nMaterial: hormigón vibrado\nResistencia: 1,000 psi\nPresentación: pallet de 100 bloques\nPeso por bloque: 12 kg aprox.'),
  ('d0000000-0000-0000-0000-000000000011'::uuid, 'SOL-EVA-ELEC', E'Duración: 2 horas aprox.\nIncluye: revisión del panel y la acometida, medición del consumo\nEntrega: informe con el tamaño del sistema solar recomendado\nCobertura: Gran Santo Domingo'),
  ('d0000000-0000-0000-0000-000000000012'::uuid, 'SOL-INV-HIB-5K', E'Potencia: 5 kW\nTipo: híbrido (red, baterías y paneles)\nTensión de baterías: 48 V\nEficiencia máxima: 97.6 %\nIncluye instalación y puesta en marcha'),
  ('d0000000-0000-0000-0000-000000000013'::uuid, 'SOL-PAN-MONO-550', E'Potencia: 550 W\nTecnología: monocristalino PERC, medias celdas\nEficiencia: 21.3 %\nDimensiones: 2,278 x 1,134 x 35 mm\nGarantía de producción: 25 años'),
  ('d0000000-0000-0000-0000-000000000014'::uuid, 'SOL-BAT-LIT-5K', E'Capacidad: 5 kWh\nQuímica: litio ferrofosfato (LiFePO4)\nTensión: 48 V\nCiclos de vida: más de 6,000 al 80 %\nMontaje: pared o rack'),
  ('d0000000-0000-0000-0000-000000000015'::uuid, 'SOL-KIT-RES-3K', E'Potencia: 3 kW\nIncluye: 6 paneles de 550 W, inversor híbrido, estructura y cableado\nInstalación: completa, llave en mano\nGeneración estimada: 360 kWh al mes'),
  ('d0000000-0000-0000-0000-000000000016'::uuid, 'AUT-CHK-PRECOMPRA', E'Duración: 1.5 horas aprox.\nIncluye: motor, transmisión, frenos, suspensión, carrocería y scanner\nEntrega: informe con fotos\nLugar: taller o domicilio'),
  ('d0000000-0000-0000-0000-000000000017'::uuid, 'AUT-DIAG-OBD2', E'Duración: 45 minutos aprox.\nEquipo: scanner OBD-II profesional\nIncluye: lectura y borrado de códigos, datos en vivo\nEntrega: informe de fallas y recomendaciones'),
  ('d0000000-0000-0000-0000-000000000018'::uuid, 'AUT-INSP-MOTO', E'Duración: 1 hora aprox.\nRevisión: frenos, motor, transmisión, sistema eléctrico y neumáticos\nEntrega: lista de puntos a corregir'),
  ('d0000000-0000-0000-0000-000000000019'::uuid, 'AUT-EVAL-CHASIS', E'Duración: 1 hora aprox.\nRevisión: tren delantero, amortiguadores, bujes, rótulas y alineación\nEntrega: diagnóstico con presupuesto de reparación'),
  ('d0000000-0000-0000-0000-000000000020'::uuid, 'AUT-ACEITE-MO', E'Duración: 30 minutos aprox.\nIncluye: mano de obra del cambio de aceite y de filtros de aceite y aire\nNo incluye: aceite ni filtros (los aporta el cliente o se cotizan aparte)')
) as v(id, sku, especificaciones)
where p.id = v.id and p.sku is null and p.especificaciones is null;
