'use server'

import type { Notificacion } from '@/types'
import { createClient } from '@/lib/supabase/server'

const ERROR_SESION = 'Inicia sesión para ver tus notificaciones.'

export async function obtenerNotificaciones(
  limite?: number
): Promise<{ data: Notificacion[]; noLeidas: number; error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { data: [], noLeidas: 0, error: ERROR_SESION }
  }

  let filasQuery = supabase
    .from('notificaciones')
    .select('id, user_id, tipo, cotizacion_id, titulo, cuerpo, leida_at, created_at')
    .order('created_at', { ascending: false })

  if (Number.isInteger(limite) && limite! > 0) {
    filasQuery = filasQuery.limit(limite!)
  }

  const [conteo, filas] = await Promise.all([
    supabase
      .from('notificaciones')
      .select('id', { count: 'exact', head: true })
      .is('leida_at', null),
    filasQuery,
  ])

  if (conteo.error || filas.error) {
    return {
      data: [],
      noLeidas: 0,
      error: 'No se pudieron cargar las notificaciones.',
    }
  }

  return {
    data: (filas.data ?? []) as Notificacion[],
    noLeidas: conteo.count ?? 0,
    error: null,
  }
}

export async function marcarTodasLasNotificacionesLeidas(): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: ERROR_SESION }
  }

  const { error } = await supabase
    .from('notificaciones')
    .update({ leida_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('leida_at', null)

  return {
    error: error ? 'No se pudieron marcar las notificaciones como leídas.' : null,
  }
}
