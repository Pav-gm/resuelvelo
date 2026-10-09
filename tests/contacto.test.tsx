/**
 * Tests de las páginas públicas de soporte (contacto, devoluciones y términos)
 * y de los enlaces a Contacto desde el pie de página y los paneles.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const accionesPerfil = vi.hoisted(() => ({
  guardarPerfil: vi.fn(),
  crearDireccionObra: vi.fn(),
  actualizarDireccionObra: vi.fn(),
  eliminarDireccionObra: vi.fn(),
}))

vi.mock('@/app/(marketplace)/perfil/actions', () => accionesPerfil)

const accionesProveedor = vi.hoisted(() => ({
  solicitarVerificacionProveedor: vi.fn(),
  toggleProducto: vi.fn(),
  archivarOEliminarProducto: vi.fn(),
  restaurarProducto: vi.fn(),
  responderFeedbackProveedor: vi.fn(),
}))

vi.mock('@/app/(marketplace)/proveedor/actions', () => accionesProveedor)

const panel = vi.hoisted(() => ({
  usuario: { id: 'user-prov' },
  proveedor: {
    id: 'prov-1',
    user_id: 'user-prov',
    nombre_empresa: 'Promeria',
    verificado: true,
    created_at: '',
  },
  stats: { productosActivos: 0, cotizacionesPendientes: 0, sinStock: 0 },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: panel.usuario }, error: null }),
    },
  })),
}))

vi.mock('@/lib/data', () => ({
  getProveedorDelUsuario: vi.fn(async () => panel.proveedor),
  getStatsProveedor: vi.fn(async () => panel.stats),
  getCotizacionesDeProveedor: vi.fn(async () => []),
  getProductosDeProveedor: vi.fn(async () => []),
  getFeedbackDeProveedor: vi.fn(async () => null),
}))

import ContactoPage from '@/app/contacto/page'
import DevolucionesPage from '@/app/devoluciones/page'
import TerminosPage from '@/app/terminos/page'
import Footer from '@/components/layout/Footer'
import PerfilComprador from '@/components/marketplace/PerfilComprador'
import PanelProveedorPage from '@/app/(marketplace)/proveedor/page'

const CLAVES_SOPORTE = ['NEXT_PUBLIC_SOPORTE_WHATSAPP', 'NEXT_PUBLIC_SOPORTE_EMAIL'] as const
const originales: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const clave of CLAVES_SOPORTE) {
    originales[clave] = process.env[clave]
    delete process.env[clave]
  }
})

afterEach(() => {
  cleanup()
  for (const clave of CLAVES_SOPORTE) {
    if (originales[clave] === undefined) delete process.env[clave]
    else process.env[clave] = originales[clave]
  }
})

describe('ContactoPage', () => {
  it('muestra los enlaces de soporte configurados', () => {
    process.env.NEXT_PUBLIC_SOPORTE_WHATSAPP = '18095550123'
    process.env.NEXT_PUBLIC_SOPORTE_EMAIL = 'soporte@resuelveloapp.com'

    render(<ContactoPage />)

    expect(screen.getByRole('link', { name: '18095550123' })).toHaveAttribute(
      'href',
      'https://wa.me/18095550123'
    )
    expect(screen.getByRole('link', { name: 'soporte@resuelveloapp.com' })).toHaveAttribute(
      'href',
      'mailto:soporte@resuelveloapp.com'
    )
  })

  it('muestra los textos de ejemplo cuando faltan las variables de soporte', () => {
    const { container } = render(<ContactoPage />)

    expect(screen.getByText('WhatsApp de ejemplo del seed')).toBeInTheDocument()
    expect(screen.getByText('Correo de ejemplo del seed')).toBeInTheDocument()
    expect(screen.getByText('Horario de atención de ejemplo del seed')).toBeInTheDocument()

    const enlaces = Array.from(container.querySelectorAll('a')).map(
      (enlace) => enlace.getAttribute('href') ?? ''
    )
    expect(enlaces.some((href) => href.startsWith('https://wa.me/'))).toBe(false)
    expect(enlaces.some((href) => href.startsWith('mailto:'))).toBe(false)
  })
})

describe('DevolucionesPage', () => {
  it('renderiza la política de devoluciones con plazos, flete y canal de reporte', () => {
    render(<DevolucionesPage />)

    expect(screen.getByText(/48 horas/)).toBeInTheDocument()
    expect(screen.getByText(/proveedor cubre el flete/i)).toBeInTheDocument()
    expect(screen.getByText(/cambio de decisión/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contacto' })).toHaveAttribute('href', '/contacto')
  })
})

describe('TerminosPage', () => {
  it('renderiza los términos comerciales y legales solicitados', () => {
    render(<TerminosPage />)

    expect(screen.getAllByText(/Resuélvelo/).length).toBeGreaterThan(0)
    expect(screen.getByText('[Razón social pendiente]')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /cancelación por el comprador/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /cancelación por el proveedor/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /disputas/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /comisiones/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /protección de datos/i })).toBeInTheDocument()
    expect(screen.getByText(/0 %/)).toBeInTheDocument()
    expect(screen.getByText(/Ley 172-13/)).toBeInTheDocument()
    expect(screen.getAllByText(/motivo/i).length).toBeGreaterThan(0)

    const enlacesContacto = screen.getAllByRole('link', { name: 'Contacto' })
    expect(enlacesContacto.length).toBeGreaterThan(0)
    for (const enlace of enlacesContacto) {
      expect(enlace).toHaveAttribute('href', '/contacto')
    }

    expect(screen.queryByText(/los canales indicados en la plataforma/)).toBeNull()
  })
})

describe('enlaces a contacto', () => {
  it('muestra enlaces a contacto en el footer y los paneles', async () => {
    const footer = render(<Footer />)
    expect(within(footer.container).getByRole('link', { name: 'Contacto' })).toHaveAttribute(
      'href',
      '/contacto'
    )

    const perfil = render(
      <PerfilComprador
        perfil={{
          nombre: 'Ana Pérez',
          razon_social: 'Obras Pérez',
          rnc: '123456789',
          telefono: '8095550101',
        }}
        direcciones={[]}
        errorCargaDirecciones={null}
      />
    )
    expect(within(perfil.container).getByRole('link', { name: 'Contacto' })).toHaveAttribute(
      'href',
      '/contacto'
    )

    const panelProveedor = render(await PanelProveedorPage())
    expect(
      within(panelProveedor.container).getByRole('link', { name: 'Contacto' })
    ).toHaveAttribute('href', '/contacto')
  })
})
