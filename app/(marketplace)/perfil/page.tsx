import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PerfilComprador from '@/components/marketplace/PerfilComprador'

const ERROR_DIRECCIONES = 'No se pudieron cargar las direcciones de obra.'

export default async function PerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, nombre, razon_social, rnc, telefono, rol')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil || perfil.rol !== 'comprador') redirect('/catalogo')

  const { data: direcciones, error: errorDirecciones } = await supabase
    .from('direcciones_obra')
    .select('id, etiqueta, direccion, provincia, municipio, referencia, es_principal')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <PerfilComprador
      perfil={{
        nombre: perfil.nombre,
        razon_social: perfil.razon_social,
        rnc: perfil.rnc,
        telefono: perfil.telefono,
      }}
      direcciones={errorDirecciones ? [] : (direcciones ?? [])}
      errorCargaDirecciones={errorDirecciones ? ERROR_DIRECCIONES : null}
    />
  )
}
