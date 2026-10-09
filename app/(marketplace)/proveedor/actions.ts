'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { enviarNotificacionCotizacionEmail } from '@/lib/notificaciones-email'
import { esFechaISOFuturaEnSantoDomingo } from '@/lib/cotizaciones'
import type { CotizacionActionResult, OfertaCotizacionInput, PerfilProveedorActionResult, ProductoActionResult, VerificacionActionResult } from '@/types'
import { PROVINCIAS } from '@/lib/provincias'

export async function solicitarVerificacionProveedor(): Promise<VerificacionActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) return { error: userError.message }
  if (!user) return { error: 'No autorizado.' }

  const { data: proveedor, error: proveedorError } = await supabase
    .from('proveedores')
    .select('id, rnc, telefono, verificacion_estado, verificado')
    .eq('user_id', user.id)
    .maybeSingle()
  if (proveedorError) return { error: proveedorError.message }
  if (!proveedor) return { error: 'No se pudo identificar el proveedor.' }
  if (!proveedor.rnc?.trim() || !proveedor.telefono?.trim()) {
    return { error: 'Completa el RNC y el teléfono en tu perfil antes de solicitar la verificación.' }
  }
  const estado = proveedor.verificacion_estado ?? (proveedor.verificado ? 'verificado' : 'sin_solicitar')
  if (estado !== 'sin_solicitar' && estado !== 'rechazado') {
    return { error: 'Solo puedes solicitar la verificación si está sin solicitar o fue rechazada.' }
  }

  try {
    const { error } = await supabase.rpc('solicitar_verificacion_proveedor')
    if (error) return { error: error.message }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo solicitar la verificación.' }
  }

  revalidatePath('/proveedor')
  revalidatePath('/proveedor/perfil')
  return { success: true }
}

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

export async function guardarPerfilProveedor(
  _prevState: PerfilProveedorActionResult,
  formData: FormData
): Promise<PerfilProveedorActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (userError) return { error: userError.message }

  const { data: proveedor, error: proveedorError } = await supabase
    .from('proveedores')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (proveedorError) return { error: proveedorError.message }
  if (!proveedor) return { error: 'No se pudo identificar el proveedor.' }

  const valor = (campo: string): string | null => {
    const raw = formData.get(campo)
    return typeof raw === 'string' ? raw.trim() || null : null
  }
  const nombre_empresa = valor('nombre_empresa')
  if (!nombre_empresa) return { error: 'El nombre de empresa es obligatorio.' }

  const zonas = [...new Set(formData.getAll('zonas').filter((zona): zona is string => typeof zona === 'string').map((zona) => zona.trim()))]
  if (zonas.some((zona) => !PROVINCIAS.includes(zona as (typeof PROVINCIAS)[number]))) {
    return { error: 'La zona de cobertura contiene una provincia no válida.' }
  }

  const { error: updateError } = await supabase
    .from('proveedores')
    .update({
      nombre_empresa,
      descripcion: valor('descripcion'),
      direccion: valor('direccion'),
      ciudad: valor('ciudad'),
      rnc: valor('rnc'),
      telefono: valor('telefono'),
      whatsapp: valor('whatsapp'),
      horario: valor('horario'),
      sitio_web: valor('sitio_web'),
      logo_url: valor('logo_url'),
    })
    .eq('id', proveedor.id)
    .eq('user_id', user.id)
  if (updateError) return { error: updateError.message }

  const { error: deleteError } = await supabase
    .from('proveedor_zonas')
    .delete()
    .eq('proveedor_id', proveedor.id)
  if (deleteError) return { error: deleteError.message }

  if (zonas.length > 0) {
    const { error: insertError } = await supabase
      .from('proveedor_zonas')
      .insert(zonas.map((provincia) => ({ proveedor_id: proveedor.id, provincia })))
    if (insertError) return { error: insertError.message }
  }

  revalidatePath('/proveedor')
  revalidatePath('/proveedor/perfil')
  revalidatePath('/proveedores')
  revalidatePath(`/proveedores/${proveedor.id}`)
  return { success: true }
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

export async function archivarOEliminarProducto(productoId: string): Promise<ProductoActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) return { error: userError.message }
  if (!user) return { error: 'No autorizado.' }

  const { data: proveedor, error: proveedorError } = await supabase
    .from('proveedores')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (proveedorError) return { error: proveedorError.message }
  if (!proveedor) return { error: 'No se encontró el producto o no tienes permiso para modificarlo.' }

  const { data: producto, error: productoError } = await supabase
    .from('productos')
    .select('id')
    .eq('id', productoId)
    .eq('proveedor_id', proveedor.id)
    .maybeSingle()
  if (productoError) return { error: productoError.message }
  if (!producto) return { error: 'No se encontró el producto o no tienes permiso para modificarlo.' }

  const { data: items, error: itemsError } = await supabase
    .from('items_cotizacion')
    .select('id')
    .eq('producto_id', productoId)
    .limit(1)
  if (itemsError) return { error: itemsError.message }

  if ((items?.length ?? 0) > 0) {
    const { error } = await supabase
      .from('productos')
      .update({ archivado_at: new Date().toISOString(), activo: false })
      .eq('id', productoId)
      .eq('proveedor_id', proveedor.id)
    if (error) return { error: error.message }
    revalidatePath('/proveedor')
    revalidatePath('/proveedor/productos')
    revalidatePath('/catalogo')
    return { success: true, action: 'archived' }
  }

  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', productoId)
    .eq('proveedor_id', proveedor.id)
  if (error) return { error: error.message }
  revalidatePath('/proveedor')
  revalidatePath('/proveedor/productos')
  revalidatePath('/catalogo')
  return { success: true, action: 'deleted' }
}

export async function restaurarProducto(productoId: string): Promise<ProductoActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) return { error: userError.message }
  if (!user) return { error: 'No autorizado.' }

  const { data: proveedor, error: proveedorError } = await supabase
    .from('proveedores')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (proveedorError) return { error: proveedorError.message }
  if (!proveedor) return { error: 'No se encontró el producto o no tienes permiso para modificarlo.' }

  const { data: producto, error: productoError } = await supabase
    .from('productos')
    .select('id')
    .eq('id', productoId)
    .eq('proveedor_id', proveedor.id)
    .maybeSingle()
  if (productoError) return { error: productoError.message }
  if (!producto) return { error: 'No se encontró el producto o no tienes permiso para modificarlo.' }

  const { error } = await supabase
    .from('productos')
    .update({ archivado_at: null, activo: true })
    .eq('id', productoId)
    .eq('proveedor_id', proveedor.id)
  if (error) return { error: error.message }

  revalidatePath('/proveedor')
  revalidatePath('/proveedor/productos')
  revalidatePath('/catalogo')
  return { success: true, action: 'restored' }
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
  void cotizacionId
  void cantidades
  return { error: 'Solo el comprador puede aceptar una oferta respondida.' }
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
  if (!esFechaISOFuturaEnSantoDomingo(oferta.validaHasta)) {
    return { error: 'La fecha de validez debe ser futura.' }
  }

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

export async function responderFeedbackProveedor(
  feedbackId: string,
  respuesta: string
): Promise<
  | { success: true }
  | { error: 'FEEDBACK_RESPUESTA_VALIDACION' | 'FEEDBACK_NO_DISPONIBLE' | 'FEEDBACK_RESPUESTA_ERROR' }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const respuestaRecortada = respuesta.trim()
  if (!respuestaRecortada || respuestaRecortada.length > 1000) {
    return { error: 'FEEDBACK_RESPUESTA_VALIDACION' }
  }

  try {
    const { data: proveedor, error: proveedorError } = await supabase
      .from('proveedores')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (proveedorError) return { error: 'FEEDBACK_RESPUESTA_ERROR' }
    if (!proveedor) return { error: 'FEEDBACK_NO_DISPONIBLE' }

    const { data, error } = await supabase
      .from('feedback')
      .update({ respuesta: respuestaRecortada, respuesta_at: new Date().toISOString() })
      .eq('id', feedbackId)
      .eq('proveedor_id', proveedor.id)
      .is('respuesta', null)
      .select('id')
    if (error) return { error: 'FEEDBACK_RESPUESTA_ERROR' }
    if (!data?.length) return { error: 'FEEDBACK_NO_DISPONIBLE' }

    revalidatePath('/proveedor')
    revalidatePath(`/proveedores/${proveedor.id}`)
    return { success: true }
  } catch {
    return { error: 'FEEDBACK_RESPUESTA_ERROR' }
  }
}
