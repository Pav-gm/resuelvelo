'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ItemCarrito } from '@/types'

// ─── Crear cotización(es) desde el carrito ───────────────────
// Agrupa los items por proveedor y crea una cotización por cada uno.

export type CotizarError = { error: string } | null

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

  // Agrupar items por proveedor_id (el valor que venga del carrito del cliente)
  const grupos: Record<string, ItemCarrito[]> = {}
  for (const item of items) {
    const pid = item.producto.proveedor_id
    if (!grupos[pid]) grupos[pid] = []
    grupos[pid].push(item)
  }

  // Resolver todos los productos de una vez contra la base de datos: nunca
  // confiamos en proveedor_id/precio que llega del carrito del cliente, ya
  // que puede provenir de datos mock (IDs no-UUID) o estar desactualizado.
  const todosLosProductoIds = items.map((i) => i.producto.id)
  let productosDb: { id: string; proveedor_id: string; precio: number; stock: number }[] | null
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('id, proveedor_id, precio, stock')
      .in('id', todosLosProductoIds)

    if (error) return { error: 'No se pudo validar el stock actual. Intenta de nuevo.' }
    productosDb = data
  } catch {
    return { error: 'No se pudo validar el stock actual. Intenta de nuevo.' }
  }

  const productoPorId = new Map((productosDb ?? []).map((p) => [p.id, p]))
  for (const item of items) {
    const productoDb = productoPorId.get(item.producto.id)
    // Los IDs que no existen conservan el flujo parcial previo.
    if (productoDb && item.cantidad > productoDb.stock) {
      return {
        error: `No hay stock suficiente para ${item.producto.nombre ?? 'uno de los productos'} (disponible: ${productoDb.stock}, solicitado: ${item.cantidad}).`,
      }
    }
  }

  let creadas = 0
  let algunProductoInvalido = false

  for (const itemsGrupo of Object.values(grupos)) {
    const itemsValidos = itemsGrupo.filter((i) => productoPorId.has(i.producto.id))
    if (itemsValidos.length < itemsGrupo.length) algunProductoInvalido = true
    if (!itemsValidos.length) continue

    const proveedorId = productoPorId.get(itemsValidos[0].producto.id)!.proveedor_id

    const total = itemsValidos.reduce((sum, i) => {
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

    const itemsInsert = itemsValidos.map((i) => ({
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
  redirect(`/mis-cotizaciones?enviada=1${algunProductoInvalido ? '&parcial=1' : ''}`)
}

// ─── Responder cotización (proveedor) ────────────────────────

type EstadoCotizacion = 'respondida' | 'aceptada' | 'rechazada'

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

  await supabase
    .from('cotizaciones')
    .update({ estado })
    .eq('id', cotizacionId)
    .eq('proveedor_id', prov.id)

  revalidatePath('/proveedor')
  revalidatePath('/proveedor/pedidos')
}

// ─── Seguimiento de venta (comprador) ────────────────────────

export type SeguimientoVentaError = { error: string } | null

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function ejecutarRpcSeguimientoVenta(
  cotizacionId: string,
  rpc: 'cancelar_venta' | 'confirmar_recepcion'
): Promise<SeguimientoVentaError> {
  if (typeof cotizacionId !== 'string' || !UUID_REGEX.test(cotizacionId)) {
    return { error: 'La cotización indicada no es válida.' }
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Inicia sesión para actualizar la cotización.' }

    const { error } = await supabase.rpc(rpc, { p_cotizacion_id: cotizacionId })
    if (error) return { error: error.message || 'No se pudo actualizar la cotización.' }
  } catch {
    return { error: 'No se pudo actualizar la cotización. Intenta de nuevo.' }
  }

  revalidatePath('/proveedor/pedidos')
  revalidatePath('/mis-cotizaciones')
  return null
}

export async function cancelarCotizacion(cotizacionId: string): Promise<SeguimientoVentaError> {
  return ejecutarRpcSeguimientoVenta(cotizacionId, 'cancelar_venta')
}

export async function confirmarRecepcion(cotizacionId: string): Promise<SeguimientoVentaError> {
  return ejecutarRpcSeguimientoVenta(cotizacionId, 'confirmar_recepcion')
}
