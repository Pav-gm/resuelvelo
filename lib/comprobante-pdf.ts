export type DatosComprobante = {
  numero: number
  aceptada_at: string | null
  proveedor: {
    nombre_empresa: string
    rnc: string | null
    direccion: string | null
    telefono: string | null
  }
  comprador: {
    nombre: string
    razon_social: string | null
    rnc: string | null
    telefono: string | null
  }
  plazo_dias: number | null
  valida_hasta: string | null
  condiciones: string | null
  items: Array<{
    cantidad: number
    cantidad_confirmada: number | null
    precio_unitario: number | null
    precio_ofertado: number | null
    producto: { nombre: string } | null
    itbis_incluido: boolean | null
  }>
}

const LEYENDA = 'Documento informativo. No es un comprobante fiscal (sin NCF) y no sustituye la factura del proveedor.'
function fecha(valor: string | null): string {
  if (!valor) return '—'
  const date = valor.length > 10
    ? new Date(valor)
    : new Date(`${valor.slice(0, 10)}T12:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: valor.length > 10 ? 'America/Santo_Domingo' : 'UTC',
  }).format(date)
}

function opcional(valor: string | null | undefined): string {
  return valor?.trim() || '—'
}

function importe(valor: number): string {
  const [entero, dec] = Math.abs(valor).toFixed(2).split('.')
  const agrupado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `RD$ ${valor < 0 ? '-' : ''}${agrupado},${dec}`
}

const r2 = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100

export function lineasComprobante(datos: DatosComprobante): string[] {
  const lineas: string[] = [
    'Resuélvelo',
    `Cotización aceptada #COT-${String(datos.numero).padStart(6, '0')}`,
    `Fecha de aceptación: ${fecha(datos.aceptada_at)}`,
    '',
    'Proveedor',
    `Nombre: ${datos.proveedor.nombre_empresa}`,
    `RNC: ${opcional(datos.proveedor.rnc)}`,
    `Dirección: ${opcional(datos.proveedor.direccion)}`,
    `Teléfono: ${opcional(datos.proveedor.telefono)}`,
    '',
    'Comprador',
    `Nombre o razón social: ${opcional(datos.comprador.razon_social) === '—' ? datos.comprador.nombre : datos.comprador.razon_social}`,
    `RNC: ${opcional(datos.comprador.rnc)}`,
    `Teléfono: ${opcional(datos.comprador.telefono)}`,
    '',
    'Detalle',
  ]

  let subtotalGeneral = 0
  let itbisTotal = 0
  let total = 0

  for (const item of datos.items) {
    const cantidad = item.cantidad_confirmada ?? item.cantidad
    const precio = item.precio_unitario ?? item.precio_ofertado ?? 0
    const bruto = cantidad * precio
    const base = item.itbis_incluido ? r2(bruto / 1.18) : r2(bruto)
    const impuesto = item.itbis_incluido ? r2(bruto - base) : r2(base * 0.18)
    const importeTotal = base + impuesto
    subtotalGeneral += base
    itbisTotal += impuesto
    total += importeTotal
    lineas.push(
      item.producto?.nombre ?? 'Producto no disponible',
      `Cantidad: ${cantidad}`,
      `Precio ofertado: ${importe(precio)}`,
      `Subtotal línea: ${importe(bruto)}`,
    )
  }

  lineas.push(
    '',
    `Subtotal general: ${importe(subtotalGeneral)}`,
    `ITBIS (18 %): ${importe(itbisTotal)}`,
    `Total: ${importe(total)}`,
    `Plazo de entrega: ${datos.plazo_dias == null ? '—' : `${datos.plazo_dias} días`}`,
    `Válida hasta: ${fecha(datos.valida_hasta)}`,
    `Condiciones: ${opcional(datos.condiciones)}`,
    '',
    LEYENDA,
  )

  return lineas
}
