import { getProveedorDelUsuario } from '@/lib/data'
import ProveedorNav from '@/components/marketplace/ProveedorNav'

/**
 * Shell del panel del proveedor. No añade redirecciones: la protección de rutas
 * existente sigue en cada página.
 */
export default async function ProveedorLayout({ children }: { children: React.ReactNode }) {
  const proveedor = await getProveedorDelUsuario()

  return (
    <ProveedorNav
      nombreEmpresa={proveedor?.nombre_empresa ?? 'Panel del proveedor'}
      verificacionEstado={proveedor?.verificacion_estado ?? null}
      verificado={proveedor?.verificado ?? false}
    >
      {children}
    </ProveedorNav>
  )
}
