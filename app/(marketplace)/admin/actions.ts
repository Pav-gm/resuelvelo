'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { VerificacionActionResult } from '@/types'

export async function resolverVerificacionProveedor(
  proveedorId: string,
  estado: 'verificado' | 'rechazado',
  nota: string
): Promise<VerificacionActionResult> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'No autorizado.' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()
  if (profileError || profile?.rol !== 'admin') return { error: 'No autorizado.' }
  if (estado !== 'verificado' && estado !== 'rechazado') return { error: 'Estado de verificación no válido.' }
  const notaRecortada = typeof nota === 'string' ? nota.trim() : ''
  if (!notaRecortada || notaRecortada.length > 1000) {
    return { error: 'La nota es obligatoria y no puede superar 1000 caracteres.' }
  }

  const { data, error } = await supabase
    .from('proveedores')
    .update({
      verificacion_estado: estado,
      verificacion_nota: notaRecortada,
      verificado_at: estado === 'verificado' ? new Date().toISOString() : null,
    })
    .eq('id', proveedorId)
    .eq('verificacion_estado', 'pendiente')
    .select('id')
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'La solicitud ya no está pendiente.' }

  revalidatePath('/admin')
  revalidatePath('/proveedor')
  revalidatePath('/proveedores')
  return { success: true }
}

export async function setProductoActivo(
  id: string,
  activo: boolean
): Promise<{ error?: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'No autorizado.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'admin') return { error: 'No autorizado.' }

  const { error } = await supabase
    .from('productos')
    .update({ activo })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin')
}


export async function setProductoSubcategoria(
  id: string,
  subcategoriaId: string
): Promise<{ error?: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()
  if (profile?.rol !== 'admin') return { error: 'No autorizado.' }

  const { error } = await supabase
    .from('productos')
    .update({ subcategoria_id: subcategoriaId || null })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidatePath('/catalogo')
}
