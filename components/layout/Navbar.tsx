import { createClient } from '@/lib/supabase/server'
import NavbarClient from './NavbarClient'
import type { DireccionObraDrawer } from '@/components/marketplace/CarritoDrawer'

export default async function Navbar() {
  let usuario: { nombre: string; email: string; rol: string } | null = null
  let direccionesObra: DireccionObraDrawer[] = []

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, nombre, rol, razon_social')
        .eq('id', user.id)
        .single()

      if (profile) {
        // Nombre visible: razón social del comprador o nombre de la empresa del
        // proveedor; si faltan, se conserva el nombre del perfil.
        let nombre = profile.nombre

        if (profile.rol === 'comprador') {
          const razonSocial = profile.razon_social?.trim()
          if (razonSocial) nombre = razonSocial
        } else if (profile.rol === 'proveedor') {
          try {
            const { data: proveedor } = await supabase
              .from('proveedores')
              .select('nombre_empresa')
              .eq('user_id', user.id)
              .maybeSingle()

            const empresa = proveedor?.nombre_empresa?.trim()
            if (empresa) nombre = empresa
          } catch {
            // Sin fila de proveedor — se conserva el nombre del perfil.
          }
        }

        usuario = { nombre, email: user.email ?? profile.email, rol: profile.rol }

        // Solo el comprador tiene direcciones de obra propias; nunca se exponen
        // las de otros usuarios.
        if (profile.rol === 'comprador') {
          const { data: direcciones } = await supabase
            .from('direcciones_obra')
            .select('id, etiqueta, direccion, provincia, municipio, referencia, es_principal')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          direccionesObra = (direcciones ?? []) as DireccionObraDrawer[]
        }
      }
    }
  } catch {
    // Sin credenciales de Supabase — modo mock
    direccionesObra = []
  }

  return <NavbarClient usuario={usuario} direccionesObra={direccionesObra} />
}
