'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { enviarNotificacionCotizacionEmail } from '@/lib/notificaciones-email'
import type { CotizacionActionResult, OfertaCotizacionInput } from '@/types'

async function getProveedorId(
  supabase?: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const client = supabase ?? await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await client
    .from('proveedores')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!data) redirect('/login')
  return data.id
}

// ─── Crear producto ──────────────────────────────────────────

export type ProductoError = { error: string } | null

export async function crearProducto(
  _prevState: ProductoError,
  formData: FormData
): Promise<ProductoError> {
  const nombre       = (formData.get('nombre')       as string)?.trim()
  const descripcion  = (formData.get('descripcion')  as string)?.trim() || null
  const precioRaw    = formData.get('precio') as string
  const precio       = parseFloat(precioRaw)
  const unidad       = (formData.get('unidad')       as string)?.trim()
  const stock        = parseInt(formData.get('stock')        as string, 10)
  const categoria_id = formData.get('categoria_id')  as string
  const subcategoria_id = (formData.get('subcategoria_id') as string)?.trim()
  const imagen_url = (formData.get('imagen_url') as string)?.trim() || null
  const sku = (formData.get('sku') as string)?.trim() || null
  const especificaciones = (formData.get('especificaciones') as string)?.trim() || null
  const itbis_incluido = formData.get('itbis_incluido') === 'on'
  if (!subcategoria_id) return { error: 'Selecciona una subcategoría.' }

  if (!nombre || !unidad || !categoria_id || !precioRaw?.trim() || isNaN(stock)) {
    return { error: 'Completa todos los campos obligatorios.' }
  }
  if (!Number.isFinite(precio) || precio <= 0) return { error: 'El precio debe ser mayor que cero.' }
  if (stock < 0)  return { error: 'El stock no puede ser negativo.' }

  const supabase = await createClient()
  const proveedor_id = await getProveedorId()

  const { error } = await supabase.from('productos').insert({
    proveedor_id,
    categoria_id,
    subcategoria_id,
    nombre,
    descripcion,
    precio,
    unidad,
    stock,
    imagen_url,
    sku,
    especificaciones,
    itbis_incluido,
    activo: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/proveedor')
  revalidatePath('/catalogo')
  redirect('/proveedor')
}

// ─── Actualizar producto ─────────────────────────────────────

export async function actualizarProducto(
  _prevState: ProductoError,
  formData: FormData
): Promise<ProductoError> {
  const id           = formData.get('id')           as string
  const nombre       = (formData.get('nombre')       as string)?.trim()
  const descripcion  = (formData.get('descripcion')  as string)?.trim() || null
  const precioRaw    = formData.get('precio') as string
  const precio       = parseFloat(precioRaw)
  const unidad       = (formData.get('unidad')       as string)?.trim()
  const stock        = parseInt(formData.get('stock')        as string, 10)
  const categoria_id = formData.get('categoria_id')  as string
  const subcategoria_id = (formData.get('subcategoria_id') as string)?.trim()
  const imagen_url = (formData.get('imagen_url') as string)?.trim() || null
  const sku = (formData.get('sku') as string)?.trim() || null
  const especificaciones = (formData.get('especificaciones') as string)?.trim() || null
  const itbis_incluido = formData.get('itbis_incluido') === 'on'
  if (!subcategoria_id) return { error: 'Selecciona una subcategoría.' }

  if (!id || !nombre || !unidad || !categoria_id || !precioRaw?.trim() || isNaN(stock)) {
    return { error: 'Completa todos los campos obligatorios.' }
  }
  if (!Number.isFinite(precio) || precio <= 0) return { error: 'El precio debe ser mayor que cero.' }

  const supabase = await createClient()
  const proveedor_id = await getProveedorId()

  const { error } = await supabase
    .from('productos')
    .update({ nombre, descripcion, precio, unidad, stock, categoria_id, subcategoria_id, imagen_url, sku, especificaciones, itbis_incluido })
    .eq('id', id)
    .eq('proveedor_id', proveedor_id)

  if (error) return { error: error.message }

  revalidatePath('/proveedor')
  revalidatePath('/catalogo')
  redirect('/proveedor')
}

// ─── Activar / Desactivar producto ───────────────────────────

export async function toggleProducto(productoId: string, activo: boolean): Promise<void> {
  const supabase = await createClient()
  const proveedor_id = await getProveedorId()

  await supabase
    .from('productos')
    .update({ activo })
    .eq('id', productoId)
    .eq('proveedor_id', proveedor_id)

  revalidatePath('/proveedor')
  revalidatePath('/catalogo')
}

// ─── Eliminar producto ───────────────────────────────────────

export async function eliminarProducto(productoId: string): Promise<void> {
  const supabase = await createClient()
  const proveedor_id = await getProveedorId()

  await supabase
    .from('productos')
    .delete()
    .eq('id', productoId)
    .eq('proveedor_id', proveedor_id)

  revalidatePath('/proveedor')
  revalidatePath('/catalogo')
}

export async function despacharCotizacion(cotizacionId: string): Promise<{ error: string } | null> {
  const supabase = await createClient()
  await getProveedorId()

  const { error } = await supabase.rpc('despachar_cotizacion', {
    p_cotizacion_id: cotizacionId,
  })
  if (error) return { error: error.message }

  await enviarNotificacionCotizacionEmail(cotizacionId, 'cotizacion_despachada')

  revalidatePath('/proveedor/pedidos')
  revalidatePath('/mis-cotizaciones')
  return null
}

export async function aceptarCotizacionConCantidades(
  cotizacionId: string,
  cantidades: Array<{ itemId: string; cantidad: number }>
): Promise<{ error: string } | null> {
  if (
    !Array.isArray(cantidades) ||
    cantidades.length === 0 ||
    cantidades.some((entrada) =>
      !entrada ||
      typeof entrada.itemId !== 'string' ||
      entrada.itemId.trim().length === 0 ||
      !Number.isInteger(entrada.cantidad) ||
      entrada.cantidad < 0
    ) ||
    new Set(cantidades.map((entrada) => entrada?.itemId)).size !== cantidades.length
  ) {
    return { error: 'Datos de cantidades inválidos.' }
  }

  const supabase = await createClient()
  await getProveedorId(supabase)

  const { error } = await supabase.rpc('aceptar_cotizacion_con_cantidades', {
    p_cotizacion_id: cotizacionId,
    p_cantidades: cantidades.map(({ itemId, cantidad }) => ({
      item_id: itemId,
      cantidad,
    })),
  })
  if (error) return { error: error.message }

  await enviarNotificacionCotizacionEmail(cotizacionId, 'cotizacion_aceptada')

  revalidatePath('/proveedor')
  revalidatePath('/proveedor/pedidos')
  revalidatePath('/mis-cotizaciones')
  return null
}

export async function ofertarCotizacion(
  cotizacionId: string,
  oferta: OfertaCotizacionInput
): Promise<CotizacionActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!oferta || !Array.isArray(oferta.lineas) || oferta.lineas.length === 0) {
    return { error: 'La oferta debe incluir todas las líneas de la cotización.' }
  }
  if (oferta.lineas.some((linea) => !linea || typeof linea.itemId !== 'string' || linea.itemId.trim() === '') ||
    new Set(oferta.lineas.map((linea) => linea.itemId)).size !== oferta.lineas.length) {
    return { error: 'Cada línea de la oferta debe tener un identificador único.' }
  }
  if (oferta.lineas.some((linea) =>
    typeof linea.precioUnitario !== 'number' || !Number.isFinite(linea.precioUnitario)
  )) {
    return { error: 'Indica el precio' }
  }
  if (oferta.lineas.some((linea) => linea.precioUnitario <= 0)) {
    return { error: 'Cada precio ofertado debe ser mayor que 0.' }
  }
  if (oferta.lineas.some((linea) =>
    linea.cantidadOfertada !== null &&
    (typeof linea.cantidadOfertada !== 'number' || Number.isNaN(linea.cantidadOfertada))
  )) {
    return { error: 'Indica cuántas unidades confirmas' }
  }
  if (oferta.lineas.some((linea) =>
    linea.cantidadOfertada !== null &&
    (!Number.isInteger(linea.cantidadOfertada) || linea.cantidadOfertada < 0)
  )) {
    return { error: 'Las cantidades ofertadas deben ser números enteros no negativos.' }
  }
  if (oferta.lineas.every((linea) => linea.cantidadOfertada === 0)) {
    return { error: 'Si no puedes servir nada, rechaza la cotización' }
  }
  if (!Number.isInteger(oferta.plazoDias) || oferta.plazoDias < 0 || oferta.plazoDias > 90) {
    return { error: 'El plazo debe estar entre 0 y 90 días.' }
  }
  const fechaValida = typeof oferta.validaHasta === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(oferta.validaHasta) &&
    !Number.isNaN(Date.parse(`${oferta.validaHasta}T00:00:00Z`)) &&
    new Date(`${oferta.validaHasta}T00:00:00Z`).toISOString().slice(0, 10) === oferta.validaHasta &&
    oferta.validaHasta > new Date().toISOString().slice(0, 10)
  if (!fechaValida) return { error: 'La fecha de validez debe ser futura.' }

  const { error } = await supabase.rpc('responder_cotizacion_con_oferta', {
    p_cotizacion_id: cotizacionId,
    p_lineas: oferta.lineas.map(({ itemId, precioUnitario, cantidadOfertada }) => ({
      item_id: itemId,
      precio_ofertado: precioUnitario,
      cantidad_ofertada: cantidadOfertada,
    })),
    p_plazo_dias: oferta.plazoDias,
    p_valida_hasta: oferta.validaHasta,
    p_condiciones: oferta.condiciones,
  })
  if (error) return { error: error.message }

  await enviarNotificacionCotizacionEmail(cotizacionId, 'cotizacion_respondida')

  revalidatePath(`/cotizaciones/${cotizacionId}`)
  revalidatePath('/proveedor')
  revalidatePath('/proveedor/pedidos')
  revalidatePath('/mis-cotizaciones')
  return null
}

export async function rechazarCotizacionConMotivo(
  cotizacionId: string,
  motivo: string
): Promise<CotizacionActionResult> {
  const motivoLimpio = typeof motivo === 'string' ? motivo.trim() : ''
  if (!motivoLimpio || motivo.length > 500) {
    return { error: 'El motivo del rechazo debe tener entre 1 y 500 caracteres.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.rpc('rechazar_cotizacion_con_motivo', {
    p_cotizacion_id: cotizacionId,
    p_motivo: motivoLimpio,
  })
  if (error) return { error: error.message }

  await enviarNotificacionCotizacionEmail(cotizacionId, 'cotizacion_rechazada')

  revalidatePath(`/cotizaciones/${cotizacionId}`)
  revalidatePath('/proveedor')
  revalidatePath('/proveedor/pedidos')
  revalidatePath('/mis-cotizaciones')
  return null
}
