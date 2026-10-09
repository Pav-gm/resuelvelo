/**
 * Tests del perfil editable del proveedor: ruta de edición, enlace desde el
 * panel y presentación pública de tarjetas y ficha.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PerfilProveedor, Proveedor } from '@/types'

const h = vi.hoisted(() => ({
  getUser: vi.fn(),
  getPerfilProveedorDelUsuario: vi.fn(),
  getProveedores: vi.fn(),
  getFeedbackDeProveedor: vi.fn(),
  getProveedorDelUsuario: vi.fn(),
  getStatsProveedor: vi.fn(),
  getCotizacionesDeProveedor: vi.fn(),
  getProductosDeProveedor: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
  guardarPerfilProveedor: vi.fn(),
  solicitarVerificacionProveedor: vi.fn(),
  createBrowserClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: h.getUser } }),
}))
vi.mock('@/lib/supabase/client', () => ({ createClient: h.createBrowserClient }))
vi.mock('next/navigation', () => ({ redirect: h.redirect, notFound: h.notFound }))
vi.mock('@/app/(marketplace)/proveedor/actions', () => ({
  guardarPerfilProveedor: h.guardarPerfilProveedor,
  solicitarVerificacionProveedor: h.solicitarVerificacionProveedor,
  crearProducto: vi.fn(),
  actualizarProducto: vi.fn(),
  toggleProducto: vi.fn(),
  eliminarProducto: vi.fn(),
}))
vi.mock('@/lib/data', () => ({
  getPerfilProveedorDelUsuario: h.getPerfilProveedorDelUsuario,
  getProveedores: h.getProveedores,
  getFeedbackDeProveedor: h.getFeedbackDeProveedor,
  getProveedorDelUsuario: h.getProveedorDelUsuario,
  getStatsProveedor: h.getStatsProveedor,
  getCotizacionesDeProveedor: h.getCotizacionesDeProveedor,
  getProductosDeProveedor: h.getProductosDeProveedor,
}))

import PerfilProveedorPage from '@/app/(marketplace)/proveedor/perfil/page'
import PanelProveedorPage from '@/app/(marketplace)/proveedor/page'
import ProveedoresPage from '@/app/(marketplace)/proveedores/page'
import ProveedorPage from '@/app/(marketplace)/proveedores/[id]/page'

const LOGO_URL = 'https://storage.example/logos/prov-1/logo.png'

function proveedorBase(overrides: Partial<Proveedor> = {}): Proveedor {
  return {
    id: 'prov-1',
    user_id: 'user-1',
    nombre_empresa: 'Promeria',
    verificado: true,
    created_at: '',
    ...overrides,
  }
}

const PERFIL: PerfilProveedor = {
  ...proveedorBase({ ciudad: 'Santiago', logo_url: LOGO_URL }),
  rnc: null,
  telefono: null,
  whatsapp: null,
  horario: null,
  sitio_web: null,
  zonas_cobertura: ['Santiago', 'La Vega'],
}

beforeEach(() => {
  h.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  h.getPerfilProveedorDelUsuario.mockResolvedValue(PERFIL)
  h.getProveedores.mockResolvedValue([])
  h.getFeedbackDeProveedor.mockResolvedValue({ reseñas: [], promedio: 0, conteo: 0 })
  h.getProveedorDelUsuario.mockResolvedValue(proveedorBase())
  h.getStatsProveedor.mockResolvedValue({ productosActivos: 0, cotizacionesPendientes: 0, sinStock: 0 })
  h.getCotizacionesDeProveedor.mockResolvedValue([])
  h.getProductosDeProveedor.mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  Object.values(h).forEach((fn) => fn.mockReset())
})

describe('ruta de edición del perfil', () => {
  it('la ruta de edición muestra los datos actuales, selección múltiple y enlace público', async () => {
    render(await PerfilProveedorPage())

    expect(screen.getByLabelText(/Nombre de empresa/)).toHaveValue('Promeria')
    expect(screen.getByLabelText(/^Ciudad/)).toHaveValue('Santiago')
    expect(screen.getByRole('img', { name: 'Vista previa del logo' })).toHaveAttribute(
      'src',
      LOGO_URL
    )

    const select = screen.getByLabelText(/Zonas de cobertura/) as HTMLSelectElement
    const seleccionadas = within(select)
      .getAllByRole('option')
      .filter((opcion) => (opcion as HTMLOptionElement).selected)
      .map((opcion) => opcion.textContent)
      .sort()
    expect(seleccionadas).toEqual(['La Vega', 'Santiago'])

    expect(screen.getByRole('link', { name: 'Ver mi perfil público' })).toHaveAttribute(
      'href',
      '/proveedores/prov-1'
    )
  })
})

describe('panel del proveedor', () => {
  it('el panel del proveedor enlaza a la edición de empresa', async () => {
    render(await PanelProveedorPage())

    expect(screen.getByRole('link', { name: 'Editar perfil de empresa' })).toHaveAttribute(
      'href',
      '/proveedor/perfil'
    )
  })

  it('el panel muestra cómo solicitar verificación cuando faltan datos del perfil', async () => {
    h.getProveedorDelUsuario.mockResolvedValue(
      proveedorBase({
        verificacion_estado: 'sin_solicitar',
        rnc: null,
        telefono: null,
        verificacion_nota: null,
        verificado_at: null,
      })
    )

    render(await PanelProveedorPage())

    expect(screen.getByText('Verifica tu empresa')).toBeInTheDocument()
    expect(screen.getByText(/completa RNC y teléfono/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar perfil' })).toHaveAttribute(
      'href',
      '/proveedor/perfil'
    )
    expect(screen.queryByRole('button', { name: 'Solicitar verificación' })).toBeNull()
  })

  it('el panel informa que la solicitud está pendiente', async () => {
    h.getProveedorDelUsuario.mockResolvedValue(
      proveedorBase({
        verificacion_estado: 'pendiente',
        rnc: '101234567',
        telefono: '809-555-0100',
        verificacion_solicitada_at: '2026-10-09T12:00:00.000Z',
      })
    )

    render(await PanelProveedorPage())

    expect(screen.getByText('Solicitud pendiente — nuestro equipo está revisando tu empresa.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Solicitar verificación' })).toBeNull()
  })
})

describe('tarjetas públicas de proveedores', () => {
  it('las tarjetas muestran logo, descripción, ciudad, zonas, horario y acciones disponibles', async () => {
    h.getProveedores.mockResolvedValue([
      {
        ...proveedorBase({
          descripcion: 'Materiales',
          ciudad: 'Santiago',
          logo_url: LOGO_URL,
          telefono: '809-555-0100',
          whatsapp: '809 555 0101',
          horario: 'Lun a vie',
        }),
        productos_count: 2,
        zonas_cobertura: ['Santiago', 'La Vega'],
        promedio_feedback: 4.5,
        conteo_feedback: 2,
      },
    ])

    render(await ProveedoresPage())

    expect(screen.getByText('Promeria')).toBeInTheDocument()
    expect(screen.getByText('Materiales')).toBeInTheDocument()
    expect(screen.getByText('Santiago')).toBeInTheDocument()
    expect(screen.getByText('Cobertura:')).toBeInTheDocument()
    expect(screen.getByText(/Santiago, La Vega/)).toBeInTheDocument()
    expect(screen.getByText('Lun a vie')).toBeInTheDocument()
    expect(screen.getByText('4.50')).toBeInTheDocument()
    expect(screen.getByText('(2 reseñas)')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Logo de Promeria' })).toHaveAttribute('src', LOGO_URL)
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/18095550101'
    )
    expect(screen.getByRole('link', { name: 'Llamar' })).toHaveAttribute(
      'href',
      'tel:809-555-0100'
    )
  })

  it('las tarjetas omiten contacto y cobertura ausentes sin romper proveedores antiguos', async () => {
    h.getProveedores.mockResolvedValue([
      {
        ...proveedorBase({ id: 'prov-2', nombre_empresa: 'Ferretería A' }),
        productos_count: 0,
        zonas_cobertura: [],
        promedio_feedback: 0,
        conteo_feedback: 0,
      },
    ])

    render(await ProveedoresPage())

    expect(screen.getByText('Ferretería A')).toBeInTheDocument()
    expect(screen.getByLabelText('Logo de Ferretería A')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'WhatsApp' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Llamar' })).toBeNull()
    expect(screen.queryByText(/Cobertura:/)).toBeNull()
    expect(screen.queryByText('Lun a vie')).toBeNull()
    expect(screen.queryByText('(0 reseñas)')).toBeNull()
    expect(screen.queryByText('0.00')).toBeNull()
  })
})

describe('ficha pública del proveedor', () => {
  it('la ficha pública muestra contacto y horario con enlaces normalizados', async () => {
    h.getProveedores.mockResolvedValue([
      {
        ...proveedorBase({
          whatsapp: '+1 (809) 555-0101',
          telefono: '8095550100',
          horario: 'Lun a vie',
          sitio_web: 'https://promeria.example',
        }),
        productos_count: 0,
        zonas_cobertura: [],
      },
    ])

    render(await ProveedorPage({ params: Promise.resolve({ id: 'prov-1' }) }))

    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/18095550101'
    )
    expect(screen.getByRole('link', { name: 'Llamar' })).toHaveAttribute(
      'href',
      'tel:8095550100'
    )
    expect(screen.getByRole('link', { name: 'https://promeria.example' })).toHaveAttribute(
      'href',
      'https://promeria.example'
    )
    expect(screen.getByText('Lun a vie')).toBeInTheDocument()
  })

  it('la ficha pública enlaza la insignia verificada a los criterios y muestra la fecha', async () => {
    h.getProveedores.mockResolvedValue([
      {
        ...proveedorBase({
          verificacion_estado: 'verificado',
          verificado_at: '2026-01-02T00:00:00.000Z',
        }),
        productos_count: 0,
        zonas_cobertura: [],
      },
    ])

    render(await ProveedorPage({ params: Promise.resolve({ id: 'prov-1' }) }))

    const insignia = screen.getByRole('link', { name: 'Verificado' })
    expect(insignia).toHaveAttribute('href', '/como-funciona#verificacion-proveedores')
    expect(insignia).toHaveAttribute('title', expect.stringContaining('2 de enero de 2026'))
  })
})
