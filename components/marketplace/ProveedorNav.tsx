'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VerificacionEstado } from '@/types'

interface EnlacePanel {
  key: string
  label: string
  href: string
}

const ENLACES: EnlacePanel[] = [
  { key: 'resumen', label: 'Resumen', href: '/proveedor' },
  { key: 'pedidos', label: 'Pedidos', href: '/proveedor/pedidos' },
  { key: 'productos', label: 'Productos', href: '/proveedor/productos?tab=productos' },
  { key: 'archivados', label: 'Archivados', href: '/proveedor/productos?tab=archivados' },
  { key: 'resenas', label: 'Reseñas', href: '/proveedor/resenas' },
  { key: 'perfil', label: 'Perfil de la empresa', href: '/proveedor/perfil' },
]

/**
 * ¿El enlace corresponde a la sección actual? Resumen, Pedidos, Reseñas y Perfil
 * por ruta exacta; Productos y Archivados comparten el prefijo de productos y se
 * distinguen por el parámetro `tab=archivados`.
 */
function esActivo(key: string, pathname: string, tab: string | null): boolean {
  if (key === 'productos' || key === 'archivados') {
    if (!pathname.startsWith('/proveedor/productos')) return false
    const enArchivados = tab === 'archivados'
    return key === 'archivados' ? enArchivados : !enArchivados
  }
  const enlace = ENLACES.find((item) => item.key === key)
  return enlace ? pathname === enlace.href : false
}

function EnlacesProveedor() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')

  return (
    <nav
      aria-label="Panel del proveedor"
      className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0"
    >
      {ENLACES.map((enlace) => {
        const activo = esActivo(enlace.key, pathname, tab)
        return (
          <Link
            key={enlace.key}
            href={enlace.href}
            aria-current={activo ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              activo
                ? 'bg-orange-50 text-orange-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            {enlace.label}
          </Link>
        )
      })}
    </nav>
  )
}

interface ProveedorNavProps {
  nombreEmpresa: string
  verificacionEstado?: VerificacionEstado | null
  verificado?: boolean
  children: React.ReactNode
}

/**
 * Shell del panel del proveedor: cabecera con el nombre de la empresa y su
 * insignia, navegación lateral sticky en escritorio y barra horizontal con
 * desplazamiento en móvil, y el área de contenido con los hijos.
 */
export default function ProveedorNav({
  nombreEmpresa,
  verificacionEstado,
  verificado = false,
  children,
}: ProveedorNavProps) {
  const mostrarInsignia = verificacionEstado === 'verificado' || verificado

  return (
    <div className="mx-auto max-w-7xl lg:flex lg:gap-8 lg:px-6">
      <aside className="border-b bg-white px-4 pt-6 lg:w-64 lg:shrink-0 lg:border-b-0 lg:px-0 lg:pt-8">
        <div className="lg:sticky lg:top-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-gray-900">{nombreEmpresa}</span>
            {mostrarInsignia && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Empresa verificada
              </span>
            )}
          </div>
          <Suspense fallback={<div className="h-10" />}>
            <EnlacesProveedor />
          </Suspense>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
