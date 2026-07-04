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

  let items: ItemCarrito[]
  try {
    items = JSON.parse(itemsRaw)
  } catch {
    return { error: 'Datos del carrito inválidos.' }
  }

  if (!items.length) return { error: 'El carrito está vacío.' }

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
  const { data: productosDb } = await supabase
    .from('productos')
    .select('id, proveedor_id, precio')
    .in('id', todosLosProductoIds)

  const productoPorId = new Map((productosDb ?? []).map((p) => [p.id, p]))

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
