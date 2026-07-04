'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

export type AuthError = { error: string } | null

// ─── Registro ────────────────────────────────────────────────

export async function registrar(
  _prevState: AuthError,
  formData: FormData
): Promise<AuthError> {
  const nombre = (formData.get('nombre') as string)?.trim()
  const email  = (formData.get('email')  as string)?.trim()
  const password = formData.get('password') as string
  const rol    = (formData.get('rol')    as UserRole) ?? 'comprador'

  if (!nombre || !email || !password) {
    return { error: 'Completa todos los campos.' }
  }
  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre, rol },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Ya existe una cuenta con ese email.' }
    }
    return { error: error.message }
  }

  if (rol === 'proveedor' && data.user) {
    await supabase.from('proveedores').insert({
      user_id: data.user.id,
      nombre_empresa: nombre,
    })
  }

  revalidatePath('/', 'layout')
  redirect(rol === 'proveedor' ? '/proveedor' : '/catalogo')
}

// ─── Login ───────────────────────────────────────────────────

export async function iniciarSesion(
  _prevState: AuthError,
  formData: FormData
): Promise<AuthError> {
  const email    = (formData.get('email')    as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Ingresa email y contraseña.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email o contraseña incorrectos.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', data.user.id)
    .single()

  revalidatePath('/', 'layout')
  redirect(profile?.rol === 'proveedor' ? '/proveedor' : '/catalogo')
}

// ─── Logout ──────────────────────────────────────────────────

export async function cerrarSesion(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

// ─── Recuperar contraseña ────────────────────────────────────

export type RecuperarState = { error: string } | { success: true } | null

export async function solicitarRecuperacion(
  _prevState: RecuperarState,
  formData: FormData
): Promise<RecuperarState> {
  const email = (formData.get('email') as string)?.trim()

  if (!email) {
    return { error: 'Ingresa tu email.' }
  }

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/actualizar-password`,
  })

  // Siempre respondemos con éxito, exista o no una cuenta con ese email
  // (evita filtrar qué correos están registrados).
  return { success: true }
}
