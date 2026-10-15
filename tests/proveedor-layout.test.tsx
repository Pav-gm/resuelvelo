/**
 * Navegación del panel del proveedor: la sección actual se marca con
 * `aria-current="page"` según la ruta y el parámetro `tab`, y la cabecera
 * muestra el nombre de empresa con su insignia de verificación.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

const h = vi.hoisted(() => ({
  pathname: '/proveedor',
  tab: null as string | null,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => h.pathname,
  useSearchParams: () => ({ get: (clave: string) => (clave === 'tab' ? h.tab : null) }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import ProveedorNav from '@/components/marketplace/ProveedorNav'

function renderNav() {
  return render(
    <ProveedorNav nombreEmpresa="Promeria" verificacionEstado="verificado" verificado={true}>
      <p>Contenido del panel</p>
    </ProveedorNav>
  )
}

afterEach(() => {
  cleanup()
})

describe('Navegación del panel del proveedor', () => {
  it('marca Resumen como sección actual en la ruta raíz del panel', () => {
    h.pathname = '/proveedor'
    h.tab = null

    const { container } = renderNav()

    expect(screen.getByText('Promeria')).toBeInTheDocument()
    expect(screen.getByText('Empresa verificada')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page')
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1)
  })

  it('marca Archivados como sección actual con el parámetro tab', () => {
    h.pathname = '/proveedor/productos'
    h.tab = 'archivados'

    renderNav()

    expect(screen.getByRole('link', { name: 'Archivados' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Productos' })).not.toHaveAttribute('aria-current')
  })

  it('marca la sección de reseñas en su ruta', () => {
    h.pathname = '/proveedor/resenas'
    h.tab = null

    const { container } = renderNav()

    expect(screen.getByRole('link', { name: 'Reseñas' })).toHaveAttribute('aria-current', 'page')
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1)

    for (const nombre of ['Resumen', 'Pedidos', 'Productos', 'Archivados', 'Perfil de la empresa']) {
      expect(screen.getByRole('link', { name: nombre })).not.toHaveAttribute('aria-current')
    }
  })
})
