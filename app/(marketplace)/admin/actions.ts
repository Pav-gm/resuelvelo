'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
