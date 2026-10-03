/**
 * Interfaz de reseñas: la acción solo aparece en cotizaciones recibidas,
 * los errores se leen en español y el envío exitoso reemplaza el formulario.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cotizacion, Feedback, Proveedor } from '@/types'

const COT_RECIBIDA = 'ffffffff-1111-4111-8111-111111111111'
const COT_RECIBIDA_CON_RESENA = 'eeeeeeee-1111-4111-8111-111111111111'
const COT_DESPACHADA = 'dddddddd-1111-4111-8111-111111111111'

const h = vi.hoisted(() => {
  const cotizaciones: Cotizacion[] = []
  const feedback = new Map<string, Feedback | null>()
  return {
    user: { id: 'comprador-1' } as { id: string } | null,
    cotizaciones,
    feedback,
    cotizacionesProveedor: [] as Cotizacion[],
    proveedorUsuario: {
      id: 'prov-1',
      user_id: 'user-prov',
      nombre_empresa: 'Promeria',
      verificado: true,
      created_at: '',
    } as Proveedor | null,
    proveedores: [
      {
        id: 'prov-1',
        user_id: 'user-prov',
        nombre_empresa: 'Promeria',
        descripcion: 'Materiales',
        ciudad: 'Santo Domingo',
        verificado: true,
        created_at: '',
        productos_count: 3,
      },
    ],
    resumen: {
      reseñas: [] as {
        id: string
        proveedor_id: string
        calificacion: number
        comentario?: string | null
        created_at: string
        autor_anonimo: string
        comprador_id?: string
        email?: string
      }[],
      promedio: 0,
      conteo: 0,
    },
    crearFeedback: vi.fn(),
    confirmarRecepcion: vi.fn(),
  }
})

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`)
  },
  notFound: () => {
    throw new Error('NOT_FOUND')
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: h.user } }),
    },
  })),
}))

vi.mock('@/lib/data', () => ({
  getCotizacionesDelComprador: vi.fn(async () => h.cotizaciones),
  getFeedbackPorCotizacion: vi.fn(async (id: string) => h.feedback.get(id) ?? null),
  getProveedores: vi.fn(async () => h.proveedores),
  getFeedbackDeProveedor: vi.fn(async () => h.resumen),
  getProveedorDelUsuario: vi.fn(async () => h.proveedorUsuario),
  getStatsProveedor: vi.fn(async () => ({
    productosActivos: 1,
    cotizacionesPendientes: 0,
    sinStock: 0,
  })),
  getCotizacionesDeProveedor: vi.fn(async () => h.cotizacionesProveedor),
  getProductosDeProveedor: vi.fn(async () => []),
}))

vi.mock('@/app/(marketplace)/cotizaciones/actions', () => ({
  crearFeedback: h.crearFeedback,
  confirmarRecepcion: h.confirmarRecepcion,
  responderCotizacion: vi.fn(),
}))

import FormularioFeedback from '@/components/marketplace/FormularioFeedback'
import MisCotizacionesPage from '@/app/(marketplace)/mis-cotizaciones/page'
import ProveedorPublicoPage from '@/app/(marketplace)/proveedores/[id]/page'
import PedidosPage from '@/app/(marketplace)/proveedor/pedidos/page'
import PanelProveedorPage from '@/app/(marketplace)/proveedor/page'

const BADGES: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  respondida: 'bg-blue-100 text-blue-700',
  aceptada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
  despachada: 'bg-purple-100 text-purple-700',
  recibida: 'bg-teal-100 text-teal-700',
  cancelada: 'bg-gray-200 text-gray-600',
}

function cotizacion(estado: Cotizacion['estado'], id: string): Cotizacion {
  return {
    id,
    comprador_id: 'comprador-1',
    proveedor_id: 'prov-1',
    estado,
    created_at: '2026-03-15T15:00:00.000Z',
    items: [],
  }
}

function resena(overrides: Partial<Feedback> = {}): Feedback {
  return {
    id: 'fb-1',
    cotizacion_id: COT_RECIBIDA_CON_RESENA,
    proveedor_id: 'prov-1',
    calificacion: 5,
    comentario: 'Muy buen servicio',
    created_at: '2026-03-01T12:00:00.000Z',
    autor_anonimo: 'Comprador verificado',
    ...overrides,
  }
}

function tarjeta(prefijo: string) {
  const titulo = screen.getByText(`Cotización #${prefijo}`)
  const contenedor = titulo.closest('.rounded-2xl')
  if (!contenedor) throw new Error(`Sin tarjeta para ${prefijo}`)
  return contenedor as HTMLElement
}

beforeEach(() => {
  h.user = { id: 'comprador-1' }
  h.cotizaciones.length = 0
  h.cotizacionesProveedor.length = 0
  h.feedback.clear()
  h.proveedorUsuario = {
    id: 'prov-1',
    user_id: 'user-prov',
    nombre_empresa: 'Promeria',
    verificado: true,
    created_at: '',
  }
  h.resumen = { reseñas: [], promedio: 0, conteo: 0 }
  h.crearFeedback.mockReset()
  h.confirmarRecepcion.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('FormularioFeedback', () => {
  it('muestra el formulario cuando todavía no hay reseña', () => {
    render(<FormularioFeedback cotizacionId={COT_RECIBIDA} feedback={null} />)

    expect(screen.getByRole('form', { name: 'Dejar reseña del proveedor' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Calificación' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Comentario opcional (hasta 1000 caracteres)…')).toHaveProperty(
      'maxLength',
      1000
    )
    expect(screen.getByRole('button', { name: 'Enviar reseña' })).toBeDisabled()
  })

  it('valida en español si se envía sin calificación', () => {
    render(<FormularioFeedback cotizacionId={COT_RECIBIDA} feedback={null} />)

    fireEvent.submit(screen.getByRole('form', { name: 'Dejar reseña del proveedor' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Selecciona una calificación de 1 a 5 estrellas.')
    expect(h.crearFeedback).not.toHaveBeenCalled()
  })

  it.each([
    ['FEEDBACK_NO_AUTENTICADO', 'Debes iniciar sesión para dejar tu reseña.'],
    ['FEEDBACK_NO_ELEGIBLE', 'Solo puedes reseñar cotizaciones que confirmaste como recibidas.'],
    ['FEEDBACK_DUPLICADO', 'Esta cotización ya tiene una reseña guardada.'],
    [
      'FEEDBACK_VALIDACION',
      'Revisa tu reseña: la calificación debe ser de 1 a 5 y el comentario no puede superar los 1000 caracteres.',
    ],
    ['FEEDBACK_ERROR', 'No se pudo guardar tu reseña. Intenta de nuevo.'],
    ['CODIGO_DESCONOCIDO', 'No se pudo guardar tu reseña. Intenta de nuevo.'],
  ])('traduce %s al español', async (code, texto) => {
    h.crearFeedback.mockResolvedValue({ error: code })
    render(<FormularioFeedback cotizacionId={COT_RECIBIDA} feedback={null} />)

    fireEvent.click(screen.getByRole('radio', { name: '4 estrellas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(texto)
    expect(screen.getByRole('button', { name: 'Enviar reseña' })).toBeEnabled()
  })

  it('envía calificación y comentario opcional', async () => {
    h.crearFeedback.mockResolvedValue({ data: { id: 'fb-nueva' } })
    render(<FormularioFeedback cotizacionId={COT_RECIBIDA} feedback={null} />)

    fireEvent.click(screen.getByRole('radio', { name: '4 estrellas' }))
    fireEvent.change(screen.getByPlaceholderText('Comentario opcional (hasta 1000 caracteres)…'), {
      target: { value: '  Llegó completo  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reseña' }))

    await waitFor(() => {
      expect(h.crearFeedback).toHaveBeenCalledWith({
        cotizacionId: COT_RECIBIDA,
        calificacion: 4,
        comentario: 'Llegó completo',
      })
    })
  })

  it('omite el comentario cuando queda vacío', async () => {
    h.crearFeedback.mockResolvedValue({ data: { id: 'fb-nueva' } })
    render(<FormularioFeedback cotizacionId={COT_RECIBIDA} feedback={null} />)

    fireEvent.click(screen.getByRole('radio', { name: '1 estrella' }))
    fireEvent.change(screen.getByPlaceholderText('Comentario opcional (hasta 1000 caracteres)…'), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reseña' }))

    await waitFor(() => {
      expect(h.crearFeedback).toHaveBeenCalledWith({
        cotizacionId: COT_RECIBIDA,
        calificacion: 1,
        comentario: undefined,
      })
    })
  })

  it('tras el éxito muestra la reseña y no permite otro envío', async () => {
    let resolver: (value: { data: { id: string } }) => void = () => {}
    h.crearFeedback.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolver = resolve
        })
    )
    render(<FormularioFeedback cotizacionId={COT_RECIBIDA} feedback={null} />)

    fireEvent.click(screen.getByRole('radio', { name: '5 estrellas' }))
    fireEvent.change(screen.getByPlaceholderText('Comentario opcional (hasta 1000 caracteres)…'), {
      target: { value: 'Excelente' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reseña' }))

    const guardando = await screen.findByRole('button', { name: 'Guardando…' })
    expect(guardando).toBeDisabled()
    fireEvent.click(guardando)
    fireEvent.submit(screen.getByRole('form', { name: 'Dejar reseña del proveedor' }))
    expect(h.crearFeedback).toHaveBeenCalledTimes(1)

    resolver({ data: { id: 'fb-nueva' } })

    expect(await screen.findByText('Tu reseña')).toBeInTheDocument()
    expect(screen.getByText('Excelente')).toBeInTheDocument()
    expect(screen.getByText('5 de 5 estrellas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar reseña' })).not.toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Dejar reseña del proveedor' })).not.toBeInTheDocument()
    expect(h.crearFeedback).toHaveBeenCalledTimes(1)
  })

  it('representa una reseña ya guardada y oculta el formulario', () => {
    render(<FormularioFeedback cotizacionId={COT_RECIBIDA_CON_RESENA} feedback={resena()} />)

    expect(screen.getByText('Tu reseña')).toBeInTheDocument()
    expect(screen.getByText('Muy buen servicio')).toBeInTheDocument()
    expect(screen.getByText('5 de 5 estrellas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar reseña' })).not.toBeInTheDocument()
  })
})

describe('Mis cotizaciones — acción solo en elegibles', () => {
  it('muestra badges, confirmación solo si está despachada y reseña solo si está recibida', async () => {
    const estados: Cotizacion['estado'][] = [
      'pendiente',
      'respondida',
      'aceptada',
      'rechazada',
      'despachada',
      'cancelada',
    ]
    estados.forEach((estado, indice) => {
      const digito = String(indice + 1)
      h.cotizaciones.push(
        cotizacion(estado, `${digito.repeat(8)}-1111-4111-8111-111111111111`)
      )
    })
    h.cotizaciones.push(cotizacion('recibida', COT_RECIBIDA))
    h.cotizaciones.push(cotizacion('recibida', COT_RECIBIDA_CON_RESENA))
    h.feedback.set(COT_RECIBIDA_CON_RESENA, resena())

    const ui = await MisCotizacionesPage({ searchParams: Promise.resolve({}) })
    render(ui)

    for (const [estado, clases] of Object.entries(BADGES)) {
      const etiqueta = estado.charAt(0).toUpperCase() + estado.slice(1)
      const badge = screen.getAllByText(etiqueta)[0]
      for (const clase of clases.split(' ')) {
        expect(badge.className).toContain(clase)
      }
    }

    expect(screen.getAllByRole('button', { name: 'Confirmar recepción' })).toHaveLength(1)
    expect(tarjeta('55555555')).toHaveTextContent('Confirmar recepción')
    expect(within(tarjeta('FFFFFFFF')).getByRole('form', { name: 'Dejar reseña del proveedor' })).toBeInTheDocument()
    expect(within(tarjeta('EEEEEEEE')).getByText('Tu reseña')).toBeInTheDocument()
    expect(within(tarjeta('EEEEEEEE')).queryByRole('button', { name: 'Enviar reseña' })).not.toBeInTheDocument()

    for (const prefijo of ['11111111', '22222222', '33333333', '44444444', '55555555', '66666666']) {
      expect(within(tarjeta(prefijo)).queryByRole('form', { name: 'Dejar reseña del proveedor' })).not.toBeInTheDocument()
      expect(within(tarjeta(prefijo)).queryByText('Tu reseña')).not.toBeInTheDocument()
    }
    expect(within(tarjeta('FFFFFFFF')).queryByRole('button', { name: 'Confirmar recepción' })).not.toBeInTheDocument()
  })

  it('redirige al anónimo antes de mostrar cotizaciones', async () => {
    h.user = null
    await expect(MisCotizacionesPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('REDIRECT /login')
  })
})

describe('Perfil público y bandejas — badges sin acción de reseña', () => {
  it('muestra promedio, conteo y autor anonimizado', async () => {
    h.resumen = {
      promedio: 4.5,
      conteo: 2,
      reseñas: [
        {
          id: 'fb-1',
          proveedor_id: 'prov-1',
          calificacion: 5,
          comentario: 'Entrega a tiempo',
          created_at: '2026-03-01T12:00:00.000Z',
          autor_anonimo: 'Comprador verificado',
          comprador_id: 'usuario-secreto-99',
          email: 'secreto@correo.com',
        },
        {
          id: 'fb-2',
          proveedor_id: 'prov-1',
          calificacion: 4,
          comentario: null,
          created_at: '2026-02-01T12:00:00.000Z',
          autor_anonimo: 'Comprador verificado',
        },
      ],
    }

    const ui = await ProveedorPublicoPage({ params: Promise.resolve({ id: 'prov-1' }) })
    render(ui)

    const seccion = screen.getByRole('region', { name: 'Reseñas del proveedor' })
    expect(seccion).toHaveTextContent('4.50')
    expect(seccion).toHaveTextContent('(2 reseñas)')
    expect(seccion).toHaveTextContent('Comprador verificado')
    expect(seccion).toHaveTextContent('Entrega a tiempo')
    expect(seccion).toHaveTextContent('5 de 5 estrellas')
    expect(seccion).not.toHaveTextContent('usuario-secreto-99')
    expect(seccion).not.toHaveTextContent('secreto@correo.com')
    expect(screen.queryByRole('button', { name: 'Enviar reseña' })).not.toBeInTheDocument()
  })

  it('explica el vacío cuando el proveedor no tiene reseñas', async () => {
    const ui = await ProveedorPublicoPage({ params: Promise.resolve({ id: 'prov-1' }) })
    render(ui)

    expect(screen.getByText('Este proveedor aún no tiene reseñas.')).toBeInTheDocument()
    expect(screen.queryByText(/reseñas\)/)).not.toBeInTheDocument()
  })

  it('la bandeja del proveedor muestra el badge y no la acción de reseña', async () => {
    h.cotizacionesProveedor.push(cotizacion('recibida', COT_RECIBIDA))
    h.cotizacionesProveedor.push(cotizacion('pendiente', '11111111-1111-4111-8111-111111111111'))
    h.cotizacionesProveedor.push(cotizacion('aceptada', '33333333-1111-4111-8111-111111111111'))

    const ui = await PedidosPage()
    render(ui)

    expect(screen.getByText('Recibida').className).toContain('bg-teal-100')
    expect(screen.getByText('Pendiente').className).toContain('bg-yellow-100')
    expect(screen.getByText('Aceptada').className).toContain('bg-green-100')
    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar reseña' })).not.toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Dejar reseña del proveedor' })).not.toBeInTheDocument()
  })

  it('el panel del proveedor conserva el badge de recibida', async () => {
    h.cotizacionesProveedor.push(cotizacion('recibida', COT_RECIBIDA))
    h.cotizacionesProveedor.push(cotizacion('despachada', COT_DESPACHADA))

    const ui = await PanelProveedorPage()
    render(ui)

    expect(screen.getByText('Recibida').className).toContain('text-teal-700')
    expect(screen.getByText('Despachada').className).toContain('text-purple-700')
    expect(screen.queryByRole('button', { name: 'Enviar reseña' })).not.toBeInTheDocument()
  })
})
