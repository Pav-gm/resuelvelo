'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { esRncValido } from '@/lib/validaciones-perfil'

export type PerfilCompradorInput = {
  nombre: string
  razon_social: string
  rnc: string
  telefono: string
}

export type DireccionObraInput = {
  etiqueta: string
  direccion: string
  provincia: string
  municipio: string
  referencia: string
  es_principal: boolean
}

export type PerfilActionResult = { error: string | null; success: boolean }

const NO_AUTORIZADO: PerfilActionResult = { error: 'No autorizado.', success: false }

async function clienteComprador() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.rol !== 'comprador') return null
  return { supabase, user }
}

function errorSupabase(): PerfilActionResult {
  return { error: 'No se pudo guardar la información. Inténtalo de nuevo.', success: false }
}

export async function guardarPerfil(datos: PerfilCompradorInput): Promise<PerfilActionResult> {
  try {
    const acceso = await clienteComprador()
    if (!acceso) return NO_AUTORIZADO

    const nombre = datos.nombre.trim()
    const razon_social = datos.razon_social.trim()
    const rnc = datos.rnc.trim()
    const telefono = datos.telefono.trim()

    if (!nombre) return { error: 'El nombre es obligatorio.', success: false }
    if (!esRncValido(rnc)) {
      return { error: 'El RNC debe tener 9 u 11 dígitos numéricos.', success: false }
    }

    const { error } = await acceso.supabase
      .from('profiles')
      .update({ nombre, razon_social: razon_social || null, rnc: rnc || null, telefono: telefono || null })
      .eq('id', acceso.user.id)

    if (error) return errorSupabase()
    revalidatePath('/perfil')
    return { error: null, success: true }
  } catch {
    return errorSupabase()
  }
}

function normalizarDireccion(datos: DireccionObraInput) {
  const etiqueta = datos.etiqueta.trim()
  const direccion = datos.direccion.trim()
  const provincia = datos.provincia.trim()
  if (!etiqueta || !direccion || !provincia) return null
  return {
    etiqueta,
    direccion,
    provincia,
    municipio: datos.municipio.trim() || null,
    referencia: datos.referencia.trim() || null,
    es_principal: datos.es_principal,
  }
}

function errorDireccion(): PerfilActionResult {
  return { error: 'La etiqueta, la dirección y la provincia son obligatorias.', success: false }
}

export async function crearDireccionObra(datos: DireccionObraInput): Promise<PerfilActionResult> {
  try {
    const acceso = await clienteComprador()
    if (!acceso) return NO_AUTORIZADO
    const direccion = normalizarDireccion(datos)
    if (!direccion) return errorDireccion()

    const { error } = await acceso.supabase
      .from('direcciones_obra')
      .insert({ ...direccion, user_id: acceso.user.id })
    if (error) return errorSupabase()
    revalidatePath('/perfil')
    return { error: null, success: true }
  } catch {
    return errorSupabase()
  }
}

export async function actualizarDireccionObra(
  id: string,
  datos: DireccionObraInput
): Promise<PerfilActionResult> {
  try {
    const acceso = await clienteComprador()
    if (!acceso) return NO_AUTORIZADO
    const direccion = normalizarDireccion(datos)
    if (!direccion) return errorDireccion()

    const { error } = await acceso.supabase
      .from('direcciones_obra')
      .update(direccion)
      .eq('id', id)
      .eq('user_id', acceso.user.id)
    if (error) return errorSupabase()
    revalidatePath('/perfil')
    return { error: null, success: true }
  } catch {
    return errorSupabase()
  }
}

export async function eliminarDireccionObra(id: string): Promise<PerfilActionResult> {
  try {
    const acceso = await clienteComprador()
    if (!acceso) return NO_AUTORIZADO

    const { error } = await acceso.supabase
      .from('direcciones_obra')
      .delete()
      .eq('id', id)
      .eq('user_id', acceso.user.id)
    if (error) return errorSupabase()
    revalidatePath('/perfil')
    return { error: null, success: true }
  } catch {
    return errorSupabase()
  }
}
