import { createClient } from '@/lib/supabase/server'
import NavbarClient from './NavbarClient'

export default async function Navbar() {
  let usuario: { nombre: string; rol: string } | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, rol')
        .eq('id', user.id)
        .single()

      if (profile) {
        usuario = { nombre: profile.nombre, rol: profile.rol }
      }
    }
  } catch {
    // Sin credenciales de Supabase — modo mock
  }

  return <NavbarClient usuario={usuario} />
}
