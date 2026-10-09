import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { getPerfilProveedorDelUsuario } from '@/lib/data'
import PerfilProveedorForm from '@/components/marketplace/PerfilProveedorForm'

export default async function PerfilProveedorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const perfil = await getPerfilProveedorDelUsuario()
  if (!perfil) redirect('/register?rol=proveedor')

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/proveedor">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Perfil de empresa</h1>
      </div>
      <PerfilProveedorForm perfil={perfil} />
    </div>
  )
}
