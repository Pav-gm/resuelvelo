'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ItemCarrito } from '@/types'

// ─── Crear cotización(es) desde el carrito ───────────────────
// Agrupa los items por proveedor y crea una cotización por cada uno.

export type CotizarError = { error: string; noDisponibles?: string[] } | null

// Forma de un uuid de Postgres, sin exigir versión ni variante: los productos del
// seed (y de producción) usan ids como d0000000-0000-0000-0000-000000000001.
const UUID_PRODUCTO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function cotizarDesdeCarrito(
  _prevState: CotizarError,
  formData: FormData
): Promise<CotizarError> {
  const itemsRaw = formData.get('items') as string
  if (!itemsRaw) return { error: 'El carrito está vacío.' }

  let itemsRawParsed: unknown
  try {
    itemsRawParsed = JSON.parse(itemsRaw)
  } catch {
    return { error: 'Datos del carrito inválidos.' }
  }

  if (!Array.isArray(itemsRawParsed)) {
    return { error: 'Datos del carrito inválidos.' }
  }
  if (!itemsRawParsed.length) return { error: 'El carrito está vacío.' }

  const itemsUnicos = new Map<string, ItemCarrito>()
  for (const item of itemsRawParsed) {
    if (
      !item ||
      typeof item !== 'object' ||
      !('producto' in item) ||
      !item.producto ||
      typeof item.producto !== 'object' ||
      !('id' in item.producto) ||
      typeof item.producto.id !== 'string' ||
      !item.producto.id.trim() ||
      !('cantidad' in item) ||
      !Number.isInteger(item.cantidad) ||
      item.cantidad <= 0
    ) {
      return { error: 'Datos del carrito inválidos.' }
    }

    const productoId = item.producto.id
    const itemExistente = itemsUnicos.get(productoId)
    if (itemExistente) {
      const cantidadFusionada = itemExistente.cantidad + item.cantidad
      if (!Number.isSafeInteger(cantidadFusionada)) {
        return { error: 'Datos del carrito inválidos.' }
      }
      itemExistente.cantidad = cantidadFusionada
    } else {
      itemsUnicos.set(productoId, item as ItemCarrito)
    }
  }

  const items = Array.from(itemsUnicos.values())

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Resolver todos los productos de una vez contra la base de datos: nunca
  // confiamos en proveedor_id/precio que llega del carrito del cliente, ya
  // que puede provenir de datos mock (IDs no-UUID) o estar desactualizado.
  const todosLosProductoIds = items.map((i) => i.producto.id)
  const idsUuid = todosLosProductoIds.filter((id) => UUID_PRODUCTO.test(id))
  let productosDb: { id: string; proveedor_id: string; precio: number; stock: number; activo: boolean }[]
  try {
    if (idsUuid.length) {
      const { data, error } = await supabase
        .from('productos')
        .select('id, proveedor_id, precio, stock, activo')
        .in('id', idsUuid)

      if (error) return { error: 'No se pudo validar el stock actual. Intenta de nuevo.' }
      productosDb = data ?? []
    } else {
      productosDb = []
    }
  } catch {
    return { error: 'No se pudo validar el stock actual. Intenta de nuevo.' }
  }

  const productoPorId = new Map(productosDb.map((p) => [p.id, p]))
  const noDisponibles = items.filter((item) => {
    if (!UUID_PRODUCTO.test(item.producto.id)) return true
    const productoDb = productoPorId.get(item.producto.id)
    return !productoDb || !productoDb.activo
  })
  if (noDisponibles.length) {
    const nombres = noDisponibles.map((item) => {
      const nombre = (item.producto as { nombre?: unknown }).nombre
      return typeof nombre === 'string' && nombre.trim() ? nombre : 'uno de los productos'
    }).join(', ')
    return {
      error: `Estos productos ya no están disponibles: ${nombres}. Los quitamos del carrito.`,
      noDisponibles: noDisponibles.map((item) => item.producto.id),
    }
  }

  for (const item of items) {
    const productoDb = productoPorId.get(item.producto.id)!
    if (item.cantidad > productoDb.stock) {
      return {
        error: `No hay stock suficiente para ${item.producto.nombre ?? 'uno de los productos'} (disponible: ${productoDb.stock}, solicitado: ${item.cantidad}).`,
      }
    }
  }

  const grupos: Record<string, ItemCarrito[]> = {}
  for (const item of items) {
    const proveedorId = productoPorId.get(item.producto.id)!.proveedor_id
    if (!grupos[proveedorId]) grupos[proveedorId] = []
    grupos[proveedorId].push(item)
  }

  let creadas = 0

  for (const itemsGrupo of Object.values(grupos)) {

    const proveedorId = productoPorId.get(itemsGrupo[0].producto.id)!.proveedor_id

    const total = itemsGrupo.reduce((sum, i) => {
      const precio = productoPorId.get(i.producto.id)!.precio
      return sum + precio * i.cantidad
    }, 0)

    const { data: cotizacion, error: errCot } = await supabase
      .from('cotizaciones')
      .insert({
        comprador_id: user.id,
        proveedor_id: proveedorId,
        estado: 'pendiente',
        total_estimado: total,
      })
      .select('id')
      .single()

    if (errCot || !cotizacion) continue

    const itemsInsert = itemsGrupo.map((i) => ({
      cotizacion_id: cotizacion.id,
      producto_id: i.producto.id,
      cantidad: i.cantidad,
      precio_unitario: productoPorId.get(i.producto.id)!.precio,
    }))

    const { error: errItems } = await supabase.from('items_cotizacion').insert(itemsInsert)
    if (errItems) continue

    creadas++
  }

  if (creadas === 0) {
    return {
      error: 'No se pudo crear la cotización: los productos del carrito ya no están disponibles. Actualiza el catálogo e intenta de nuevo.',
    }
  }

  revalidatePath('/mis-cotizaciones')
  redirect('/mis-cotizaciones?enviada=1')
}

// ─── Responder cotización (proveedor) ────────────────────────

type EstadoCotizacion = 'aceptada' | 'rechazada'

export async function responderCotizacion(
  cotizacionId: string,
  estado: EstadoCotizacion
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: prov } = await supabase
    .from('proveedores')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!prov) return

  const { error } = estado === 'aceptada'
    ? await supabase.rpc('aceptar_cotizacion', { p_cotizacion_id: cotizacionId })
    : await supabase.rpc('rechazar_cotizacion', { p_cotizacion_id: cotizacionId })

  if (error) return

  revalidatePath('/proveedor')
  revalidatePath('/proveedor/pedidos')
}

export async function confirmarRecepcion(cotizacionId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.rpc('confirmar_recepcion', { p_cotizacion_id: cotizacionId })
  revalidatePath('/mis-cotizaciones')
  revalidatePath('/proveedor/pedidos')
}

export async function cancelarVenta(cotizacionId: string): Promise<{ error: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.rpc('cancelar_venta', {
    p_cotizacion_id: cotizacionId,
  })

  if (error) return { error: error.message }

  revalidatePath('/proveedor/pedidos')
  revalidatePath('/mis-cotizaciones')
  return null
}

export type CrearFeedbackResultado = { data: { id: string } } | { error: string }

export async function crearFeedback(input: {
  cotizacionId: string
  calificacion: number
  comentario?: string
}): Promise<CrearFeedbackResultado> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'FEEDBACK_NO_AUTENTICADO' }

  if (
    !input ||
    typeof input.cotizacionId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.cotizacionId) ||
    !Number.isInteger(input.calificacion) ||
    input.calificacion < 1 ||
    input.calificacion > 5 ||
    (input.comentario !== undefined && typeof input.comentario !== 'string') ||
    (typeof input.comentario === 'string' && [...input.comentario].length > 1000)
  ) {
    return { error: 'FEEDBACK_VALIDACION' }
  }

  const comentario = input.comentario?.trim() || null
  const { data, error } = await supabase.rpc('crear_feedback', {
    p_cotizacion_id: input.cotizacionId,
    p_calificacion: input.calificacion,
    p_comentario: comentario,
  })

  if (error) {
    const code = error.message.match(/FEEDBACK_(?:DUPLICADO|NO_ELEGIBLE|VALIDACION|NO_AUTENTICADO)/)?.[0]
    return { error: code ?? 'FEEDBACK_ERROR' }
  }

  revalidatePath('/mis-cotizaciones')
  revalidatePath('/proveedores')
  return { data: { id: data as string } }
}
