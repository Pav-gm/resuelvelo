/**
 * Filtros de URL, orden y paginación de las dos bandejas de cotizaciones, y
 * «Volver a pedir»: agrega cantidades de productos activos, avisa las líneas
 * ausentes y emite el evento que abre el carrito.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { Cotizacion, ItemCotizacion, Producto } from '@/types'
import { useCarritoStore } from '@/lib/store/carrito'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getCotizacionesDelComprador: vi.fn(),
  getFeedbackPorCotizacion: vi.fn(),
  getProveedorDelUsuario: vi.fn(),
  getCotizacionesDeProveedor: vi.fn(),
  obtenerProductosActivosParaReordenar: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}))

vi.mock('@/lib/data', () => ({
  getCotizacionesDelComprador: mocks.getCotizacionesDelComprador,
  getFeedbackPorCotizacion: mocks.getFeedbackPorCotizacion,
  getProveedorDelUsuario: mocks.getProveedorDelUsuario,
  getCotizacionesDeProveedor: mocks.getCotizacionesDeProveedor,
}))

vi.mock('@/app/(marketplace)/cotizaciones/actions', () => ({
  obtenerProductosActivosParaReordenar: mocks.obtenerProductosActivosParaReordenar,
  responderCotizacion: vi.fn(),
  cancelarVenta: vi.fn(),
  confirmarRecepcion: vi.fn(),
  crearFeedback: vi.fn(),
  aceptarOfertaCotizacion: vi.fn(),
  rechazarOfertaCotizacion: vi.fn(),
  solicitarNuevaOferta: vi.fn(),
  cotizarDesdeCarrito: vi.fn(),
}))

vi.mock('@/app/(marketplace)/proveedor/actions', () => ({
  despacharCotizacion: vi.fn(),
  aceptarCotizacionConCantidades: vi.fn(),
  ofertarCotizacion: vi.fn(),
  rechazarCotizacionConMotivo: vi.fn(),
  toggleProducto: vi.fn(),
  eliminarProducto: vi.fn(),
  archivarOEliminarProducto: vi.fn(),
  restaurarProducto: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
  notFound: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('next/link', async () => {
  const { createElement } = await import('react')
  return {
    default: ({ href, children }: { href: string; children: ReactNode }) =>
      createElement('a', { href }, children),
  }
})

import MisCotizacionesPage from '@/app/(marketplace)/mis-cotizaciones/page'
import PedidosPage from '@/app/(marketplace)/proveedor/pedidos/page'
import VolverAPedirButton from '@/components/marketplace/VolverAPedirButton'

const USER = { id: 'comprador-1' }
const PROVEEDOR = {
  id: 'prov-1',
  user_id: 'user-prov',
  nombre_empresa: 'Ferretería Norte',
  verificado: true,
  created_at: '',
}

function cot(
  datos: Pick<Cotizacion, 'id' | 'numero' | 'estado' | 'created_at'> & Partial<Cotizacion>
): Cotizacion {
  return { comprador_id: 'comprador-1', proveedor_id: 'prov-1', ...datos } as Cotizacion
}

beforeEach(() => {
  mocks.getUser.mockResolvedValue({ data: { user: USER } })
  mocks.getCotizacionesDelComprador.mockResolvedValue([])
  mocks.getFeedbackPorCotizacion.mockResolvedValue(null)
  mocks.getProveedorDelUsuario.mockResolvedValue(PROVEEDOR)
  mocks.getCotizacionesDeProveedor.mockResolvedValue([])
  mocks.obtenerProductosActivosParaReordenar.mockResolvedValue([])
  useCarritoStore.setState({ items: [] })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  useCarritoStore.setState({ items: [] })
})

describe('Mis cotizaciones — filtros, orden y paginación', () => {
  it('Mis cotizaciones filtra por proveedor y número y ordena las coincidencias por fecha', async () => {
    mocks.getCotizacionesDelComprador.mockResolvedValue([
      cot({
        id: 'cot-42',
        numero: 42,
        estado: 'pendiente',
        created_at: '2026-10-01T12:00:00.000Z',
        proveedor_id: 'prov-1',
        proveedor: { nombre_empresa: 'Ferretería Norte' },
        items: [],
      }),
      cot({
        id: 'cot-43',
        numero: 43,
        estado: 'pendiente',
        created_at: '2026-10-03T12:00:00.000Z',
        proveedor_id: 'prov-1',
        proveedor: { nombre_empresa: 'Ferretería Norte' },
        items: [],
      }),
      cot({
        id: 'cot-44',
        numero: 44,
        estado: 'pendiente',
        created_at: '2026-10-02T12:00:00.000Z',
        proveedor_id: 'prov-2',
        proveedor: { nombre_empresa: 'Construcciones Sur' },
        items: [],
      }),
    ])

    render(
      await MisCotizacionesPage({
        searchParams: Promise.resolve({
          proveedor: 'prov-1',
          busqueda: '#COT-000042',
          orden: 'antiguas',
        }),
      })
    )

    expect(screen.getByText('Cotización #COT-000042')).toBeInTheDocument()
    expect(screen.queryByText('Cotización #COT-000043')).toBeNull()
    expect(screen.queryByText('Cotización #COT-000044')).toBeNull()
  })

  it('Mis cotizaciones pagina de 20 en 20 y conserva filtros en los enlaces', async () => {
    const cotizaciones = Array.from({ length: 21 }, (_, indice) => {
      const numero = indice + 1
      const dia = 22 - numero
      return cot({
        id: `cot-${numero}`,
        numero,
        estado: 'pendiente',
        created_at: `2026-10-${String(dia).padStart(2, '0')}T12:00:00.000Z`,
        items: [],
      })
    })
    mocks.getCotizacionesDelComprador.mockResolvedValue(cotizaciones)

    render(
      await MisCotizacionesPage({
        searchParams: Promise.resolve({ estado: 'pendiente', pagina: '1' }),
      })
    )

    expect(screen.getAllByText(/^Cotización #/)).toHaveLength(20)
    expect(screen.queryByText('Cotización #COT-000021')).toBeNull()
    expect(screen.getByRole('link', { name: 'Siguientes' })).toHaveAttribute(
      'href',
      '/mis-cotizaciones?estado=pendiente&pagina=2'
    )
  })
})

describe('Bandeja del proveedor — filtros, resumen y paginación', () => {
  it('La bandeja del proveedor filtra por estado y fecha antes de paginar', async () => {
    const pendientes = Array.from({ length: 20 }, (_, indice) => {
      const numero = indice + 1
      const dia = numero
      return cot({
        id: `cot-${numero}`,
        numero,
        estado: 'pendiente',
        created_at: `2026-10-${String(dia).padStart(2, '0')}T12:00:00.000Z`,
        items: [],
      })
    })
    const respondida = cot({
      id: 'cot-99',
      numero: 99,
      estado: 'respondida',
      created_at: '2026-10-21T12:00:00.000Z',
      items: [],
    })
    mocks.getCotizacionesDeProveedor.mockResolvedValue([...pendientes, respondida])

    render(
      await PedidosPage({
        searchParams: Promise.resolve({
          estado: 'pendiente',
          desde: '2026-10-01',
          hasta: '2026-10-20',
          pagina: '1',
        }),
      })
    )

    expect(screen.getAllByTestId('order-header')).toHaveLength(20)
    expect(screen.queryByText('Cotización #COT-000099')).toBeNull()
    expect(screen.getByText('Pendientes 20')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Siguientes' })).toBeNull()
  })
})

describe('Volver a pedir', () => {
  it('Volver a pedir agrega cantidades activas, avisa las líneas ausentes y abre el carrito', async () => {
    const items: ItemCotizacion[] = [
      {
        id: 'item-1',
        cotizacion_id: 'cot-1',
        producto_id: 'prod-1',
        descripcion: null,
        cantidad: 3,
        producto: { nombre: 'Tubo PVC' } as Producto,
        sujeta_disponibilidad: false,
        stock_al_cotizar: null,
      },
      {
        id: 'item-2',
        cotizacion_id: 'cot-1',
        producto_id: 'prod-2',
        descripcion: null,
        cantidad: 2,
        producto: { nombre: 'Cable' } as Producto,
        sujeta_disponibilidad: false,
        stock_al_cotizar: null,
      },
    ]
    mocks.obtenerProductosActivosParaReordenar.mockResolvedValue([
      {
        id: 'prod-1',
        proveedor_id: 'prov-1',
        categoria_id: 'cat-1',
        subcategoria_id: null,
        nombre: 'Tubo PVC',
        precio: 100,
        unidad: 'unidad',
        stock: 50,
        activo: true,
        created_at: '2026-01-01T00:00:00.000Z',
        proveedor: {
          id: 'prov-1',
          user_id: 'user-prov',
          nombre_empresa: 'Ferretería Norte',
          verificado: true,
          created_at: '',
        },
      } satisfies Producto,
    ])

    const abrirCarrito = vi.fn()
    window.addEventListener('resuelvelo:abrir-carrito', abrirCarrito)

    render(<VolverAPedirButton items={items} />)
    fireEvent.click(screen.getByRole('button', { name: 'Volver a pedir' }))

    await waitFor(() => expect(useCarritoStore.getState().items).toHaveLength(1))
    const [linea] = useCarritoStore.getState().items
    expect(linea.producto.id).toBe('prod-1')
    expect(linea.cantidad).toBe(3)
    expect(linea.producto.proveedor?.nombre_empresa).toBe('Ferretería Norte')

    expect(
      screen.getByText('Algunas líneas ya no están disponibles y no se agregaron al carrito.')
    ).toBeInTheDocument()
    expect(screen.getByText(/Cable/)).toBeInTheDocument()

    await waitFor(() => expect(abrirCarrito).toHaveBeenCalledTimes(1))

    window.removeEventListener('resuelvelo:abrir-carrito', abrirCarrito)
  })
})
