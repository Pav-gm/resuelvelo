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

  revalidatePath('/proveedor/pedidos')
  revalidatePath('/mis-cotizaciones')
  return null
}
