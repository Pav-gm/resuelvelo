'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getProveedorId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
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
  const precio       = parseFloat(formData.get('precio')      as string)
  const unidad       = (formData.get('unidad')       as string)?.trim()
  const stock        = parseInt(formData.get('stock')        as string, 10)
  const categoria_id = formData.get('categoria_id')  as string

  if (!nombre || !unidad || !categoria_id || isNaN(precio) || isNaN(stock)) {
    return { error: 'Completa todos los campos obligatorios.' }
  }
  if (precio < 0) return { error: 'El precio no puede ser negativo.' }
  if (stock < 0)  return { error: 'El stock no puede ser negativo.' }

  const supabase = await createClient()
  const proveedor_id = await getProveedorId()

  const { error } = await supabase.from('productos').insert({
    proveedor_id,
    categoria_id,
    nombre,
    descripcion,
    precio,
    unidad,
    stock,
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
  const precio       = parseFloat(formData.get('precio')      as string)
  const unidad       = (formData.get('unidad')       as string)?.trim()
  const stock        = parseInt(formData.get('stock')        as string, 10)
  const categoria_id = formData.get('categoria_id')  as string

  if (!id || !nombre || !unidad || !categoria_id || isNaN(precio) || isNaN(stock)) {
    return { error: 'Completa todos los campos obligatorios.' }
  }

  const supabase = await createClient()
  const proveedor_id = await getProveedorId()

  const { error } = await supabase
    .from('productos')
    .update({ nombre, descripcion, precio, unidad, stock, categoria_id })
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

// ─── Seguimiento de venta ────────────────────────────────────

export type SeguimientoVentaError = { error: string } | null

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function ejecutarRpcVenta(
  cotizacionId: string,
  rpc: 'despachar_cotizacion' | 'cancelar_venta'
): Promise<SeguimientoVentaError> {
  if (typeof cotizacionId !== 'string' || !UUID_REGEX.test(cotizacionId)) {
    return { error: 'La cotización indicada no es válida.' }
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Inicia sesión para actualizar la venta.' }

    const { error } = await supabase.rpc(rpc, { p_cotizacion_id: cotizacionId })
    if (error) return { error: error.message || 'No se pudo actualizar la venta.' }
  } catch {
    return { error: 'No se pudo actualizar la venta. Intenta de nuevo.' }
  }

  revalidatePath('/proveedor/pedidos')
  revalidatePath('/mis-cotizaciones')
  return null
}

export async function despacharCotizacion(cotizacionId: string): Promise<SeguimientoVentaError> {
  return ejecutarRpcVenta(cotizacionId, 'despachar_cotizacion')
}

export async function cancelarVenta(cotizacionId: string): Promise<SeguimientoVentaError> {
  return ejecutarRpcVenta(cotizacionId, 'cancelar_venta')
}
