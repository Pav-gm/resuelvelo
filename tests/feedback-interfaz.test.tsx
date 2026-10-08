/**
 * Interfaz de reseñas: la acción solo aparece en cotizaciones recibidas,
 * los errores se leen en español y el envío exitoso reemplaza el formulario.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cotizacion, Feedback, ItemCotizacion, Producto, Proveedor } from '@/types'
import { formatNumeroCotizacion } from '@/lib/cotizaciones'

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
    cancelarVenta: vi.fn(),
    despacharCotizacion: vi.fn(),
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
  cancelarVenta: h.cancelarVenta,
  responderCotizacion: vi.fn(),
}))

vi.mock('@/app/(marketplace)/proveedor/actions', () => ({
  despacharCotizacion: h.despacharCotizacion,
  toggleProducto: vi.fn(),
  eliminarProducto: vi.fn(),
  crearProducto: vi.fn(),
  actualizarProducto: vi.fn(),
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

const DESPACHADA_AT = '2026-04-02T18:00:00.000Z'

function fechaDespacho(iso: string) {
  return new Date(iso).toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Número estable y distinto por UUID para los fixtures que no fijan uno explícito. */
function numeroDeId(id: string): number {
  return Number.parseInt(id.replace(/-/g, '').slice(0, 8), 16)
}

function cotizacion(
  estado: Cotizacion['estado'],
  id: string,
  extra: Partial<Cotizacion> = {}
): Cotizacion {
  return {
    id,
    comprador_id: 'comprador-1',
    proveedor_id: 'prov-1',
    estado,
    created_at: '2026-03-15T15:00:00.000Z',
    items: [],
    ...extra,
    numero: extra.numero ?? numeroDeId(id),
  }
}

function pasoSeguimiento(scope: HTMLElement, numero: number, etiqueta: string) {
  const marca = `${numero} · ${etiqueta}`
  return within(scope).getByText((_, element) => {
    if (!element || element.tagName !== 'SPAN') return false
    if (element.getAttribute('aria-hidden') === 'true') return false
    const texto = element.textContent ?? ''
    return texto === marca || texto.startsWith(marca)
  })
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

function item(overrides: Partial<ItemCotizacion> = {}): ItemCotizacion {
  return {
    id: 'item-1',
    cotizacion_id: 'cot-1',
    producto_id: 'prod-1',
    cantidad: 1,
    sujeta_disponibilidad: false,
    stock_al_cotizar: null,
    ...overrides,
  }
}

function productoNombre(nombre: string): Producto {
  return { nombre } as Producto
}

function tarjeta(prefijo: string) {
  const cot = [...h.cotizaciones, ...h.cotizacionesProveedor].find((c) =>
    c.id.toLowerCase().startsWith(prefijo.toLowerCase())
  )
  if (!cot) throw new Error(`Sin cotización para el prefijo ${prefijo}`)
  const titulo = screen.getByText(`Cotización #${formatNumeroCotizacion(cot.numero)}`)
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
  h.cancelarVenta.mockReset()
  h.despacharCotizacion.mockReset()
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

    expect(within(tarjeta('33333333')).getByText('El proveedor aceptó; falta que despache.')).toBeInTheDocument()
    expect(within(tarjeta('33333333')).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(within(tarjeta('33333333')).queryByRole('dialog')).not.toBeInTheDocument()
    for (const prefijo of ['11111111', '22222222', '44444444', '55555555', '66666666', 'FFFFFFFF', 'EEEEEEEE']) {
      expect(within(tarjeta(prefijo)).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    }
    for (const prefijo of ['33333333', '55555555', '66666666', 'FFFFFFFF', 'EEEEEEEE']) {
      expect(within(tarjeta(prefijo)).getByRole('region', { name: 'Seguimiento de la cotización' })).toBeInTheDocument()
    }
    for (const prefijo of ['11111111', '22222222', '44444444']) {
      expect(within(tarjeta(prefijo)).queryByRole('region', { name: 'Seguimiento de la cotización' })).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: 'Marcar como despachada' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar venta' })).not.toBeInTheDocument()
  })

  it('muestra el nombre de un producto inactivo en la lista y nunca el id interno', async () => {
    const PRODUCTO_ID = 'dff6e49e-1111-4111-8111-111111111111'
    h.cotizaciones.push(
      cotizacion('pendiente', '11111111-1111-4111-8111-111111111111', {
        items: [
          item({
            id: 'it-inactivo',
            cotizacion_id: '11111111-1111-4111-8111-111111111111',
            producto_id: PRODUCTO_ID,
            cantidad: 2,
            producto: productoNombre('Cable THHN 12 AWG'),
          }),
        ],
      })
    )

    const ui = await MisCotizacionesPage({ searchParams: Promise.resolve({}) })
    render(ui)

    const card = tarjeta('11111111')
    expect(within(card).getByText('Cable THHN 12 AWG')).toBeInTheDocument()
    expect(card).not.toHaveTextContent(PRODUCTO_ID)
  })

  it('muestra Producto no disponible cuando la línea no tiene producto relacionado', async () => {
    const PRODUCTO_ID = 'dff6e49e-1111-4111-8111-111111111111'
    h.cotizaciones.push(
      cotizacion('pendiente', '11111111-1111-4111-8111-111111111111', {
        items: [
          item({
            id: 'it-sin-producto',
            cotizacion_id: '11111111-1111-4111-8111-111111111111',
            producto_id: PRODUCTO_ID,
            cantidad: 2,
            producto: null as unknown as Producto,
          }),
        ],
      })
    )

    const ui = await MisCotizacionesPage({ searchParams: Promise.resolve({}) })
    render(ui)

    const card = tarjeta('11111111')
    expect(within(card).getByText('Producto no disponible')).toBeInTheDocument()
    expect(card).not.toHaveTextContent(PRODUCTO_ID)
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
    expect(screen.queryByRole('button', { name: 'Marcar como despachada' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar venta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmar recepción' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Seguimiento de la cotización' })).not.toBeInTheDocument()
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
    h.cotizacionesProveedor.push(cotizacion('aceptada', '33333333-1111-4111-8111-111111111111'))

    const ui = await PanelProveedorPage()
    render(ui)

    expect(screen.getByText('Recibida').className).toContain('text-teal-700')
    expect(screen.getByText('Despachada').className).toContain('text-purple-700')
    expect(screen.queryByRole('button', { name: 'Enviar reseña' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marcar como despachada' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar venta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmar recepción' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    expect(screen.queryByText('El proveedor aceptó; falta que despache.')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Seguimiento de la cotización' })).not.toBeInTheDocument()
  })
})

describe('Mis cotizaciones — seguimiento, fecha y cancelación', () => {
  it('en aceptada pide motivo antes de cancelar y cerrar no cambia nada', async () => {
    const id = '33333333-1111-4111-8111-111111111111'
    h.cancelarVenta.mockResolvedValue({
      error: 'Solo puedes cancelar antes de que el proveedor despache.',
    })
    h.cotizaciones.push(cotizacion('aceptada', id))

    const ui = await MisCotizacionesPage({ searchParams: Promise.resolve({}) })
    render(ui)

    const card = tarjeta('33333333')
    const linea = within(card).getByRole('region', { name: 'Seguimiento de la cotización' })
    expect(pasoSeguimiento(linea, 1, 'Aceptada').className).toContain('font-medium')
    expect(pasoSeguimiento(linea, 2, 'Despachada').className).toContain('text-gray-400')
    expect(pasoSeguimiento(linea, 3, 'Recibida').className).toContain('text-gray-400')

    fireEvent.click(within(card).getByRole('button', { name: 'Cancelar' }))

    const dialogo = within(card).getByRole('dialog', { name: 'Motivo de cancelación' })
    expect(h.cancelarVenta).not.toHaveBeenCalled()

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Volver' }))
    expect(within(card).queryByRole('dialog', { name: 'Motivo de cancelación' })).not.toBeInTheDocument()
    expect(h.cancelarVenta).not.toHaveBeenCalled()

    fireEvent.click(within(card).getByRole('button', { name: 'Cancelar' }))
    const dialogo2 = within(card).getByRole('dialog', { name: 'Motivo de cancelación' })
    const confirmar = within(dialogo2).getByRole('button', { name: 'Confirmar cancelación' })
    expect(confirmar).toBeDisabled()

    fireEvent.change(within(dialogo2).getByRole('combobox', { name: 'Motivo de cancelación' }), {
      target: { value: 'Encontré mejor precio' },
    })
    expect(confirmar).toBeEnabled()

    fireEvent.click(confirmar)

    await waitFor(() => {
      expect(h.cancelarVenta).toHaveBeenCalledWith(id, { opcion: 'Encontré mejor precio' })
    })
    expect(h.cancelarVenta).toHaveBeenCalledTimes(1)
    expect(await within(card).findByRole('alert')).toHaveTextContent(
      'Solo puedes cancelar antes de que el proveedor despache.'
    )
  })

  it('en despachada muestra la fecha y solo la confirmación de recepción', async () => {
    h.cotizaciones.push(
      cotizacion('despachada', COT_DESPACHADA, { despachada_at: DESPACHADA_AT })
    )

    const ui = await MisCotizacionesPage({ searchParams: Promise.resolve({}) })
    render(ui)

    const card = tarjeta('DDDDDDDD')
    const linea = within(card).getByRole('region', { name: 'Seguimiento de la cotización' })
    expect(linea).toHaveTextContent(fechaDespacho(DESPACHADA_AT))
    expect(pasoSeguimiento(linea, 2, 'Despachada').className).toContain('font-medium')
    expect(pasoSeguimiento(linea, 3, 'Recibida').className).toContain('text-gray-400')
    expect(within(card).getByRole('button', { name: 'Confirmar recepción' })).toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    expect(within(card).queryByRole('form', { name: 'Dejar reseña del proveedor' })).not.toBeInTheDocument()
  })

  it('en recibida completa el seguimiento y conserva el formulario de reseña', async () => {
    h.cotizaciones.push(
      cotizacion('recibida', COT_RECIBIDA, { despachada_at: DESPACHADA_AT })
    )

    const ui = await MisCotizacionesPage({ searchParams: Promise.resolve({}) })
    render(ui)

    const card = tarjeta('FFFFFFFF')
    const linea = within(card).getByRole('region', { name: 'Seguimiento de la cotización' })
    expect(linea).toHaveTextContent(fechaDespacho(DESPACHADA_AT))
    expect(pasoSeguimiento(linea, 3, 'Recibida').className).toContain('font-medium')
    expect(within(card).getByRole('form', { name: 'Dejar reseña del proveedor' })).toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'Confirmar recepción' })).not.toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
  })

  it('en cancelada nombra al comprador y no marca Recibida como completada', async () => {
    h.cotizaciones.push(
      cotizacion('cancelada', '66666666-1111-4111-8111-111111111111', {
        cancelada_por: 'comprador',
      })
    )

    const ui = await MisCotizacionesPage({ searchParams: Promise.resolve({}) })
    render(ui)

    const card = tarjeta('66666666')
    const linea = within(card).getByRole('region', { name: 'Seguimiento de la cotización' })
    expect(within(linea).getByRole('status')).toHaveTextContent('Cancelada por el comprador.')
    expect(pasoSeguimiento(linea, 2, 'Despachada').className).toContain('text-gray-400')
    expect(pasoSeguimiento(linea, 3, 'Recibida').className).toContain('text-gray-400')
    expect(within(card).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    expect(within(card).queryByRole('form', { name: 'Dejar reseña del proveedor' })).not.toBeInTheDocument()
  })

  it('en cancelada muestra actor fecha motivo y paso cancelado en ambos lados', async () => {
    const canceladaAt = '2026-03-16T15:00:00.000Z'
    const motivo = 'Encontré mejor precio'
    h.cotizaciones.push(
      cotizacion('cancelada', '66666666-1111-4111-8111-111111111111', {
        cancelada_por: 'comprador',
        cancelada_at: canceladaAt,
        cancelada_motivo: motivo,
      })
    )
    h.cotizacionesProveedor.push(
      cotizacion('cancelada', 'bbbbbbbb-1111-4111-8111-111111111111', {
        cancelada_por: 'proveedor',
        cancelada_at: canceladaAt,
        cancelada_motivo: motivo,
      })
    )

    render(await MisCotizacionesPage({ searchParams: Promise.resolve({}) }))
    render(await PedidosPage())

    const fecha = fechaDespacho(canceladaAt)
    const cardComprador = tarjeta('66666666')
    const cardProveedor = tarjeta('BBBBBBBB')
    const lineaComprador = within(cardComprador).getByRole('region', {
      name: 'Seguimiento de la cotización',
    })
    const lineaProveedor = within(cardProveedor).getByRole('region', {
      name: 'Seguimiento de la cotización',
    })

    expect(within(lineaComprador).getByRole('status')).toHaveTextContent(
      `Cancelada por el comprador el ${fecha}: ${motivo}`
    )
    expect(within(lineaProveedor).getByRole('status')).toHaveTextContent(
      `Cancelada por el proveedor el ${fecha}: ${motivo}`
    )
    expect(lineaComprador).toHaveTextContent(fecha)
    expect(lineaProveedor).toHaveTextContent(fecha)
    expect(pasoSeguimiento(lineaComprador, 4, 'Cancelada').className).toContain('font-medium')
    expect(pasoSeguimiento(lineaProveedor, 4, 'Cancelada').className).toContain('font-medium')
    expect(pasoSeguimiento(lineaComprador, 3, 'Recibida').className).toContain('text-gray-400')
    expect(pasoSeguimiento(lineaProveedor, 3, 'Recibida').className).toContain('text-gray-400')
    expect(within(cardComprador).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    expect(within(cardProveedor).queryByRole('button', { name: 'Cancelar venta' })).not.toBeInTheDocument()
  })
})

describe('Bandeja del proveedor — despacho, cancelación y seguimiento', () => {
  it.each([
    ['pendiente', false, false],
    ['respondida', false, false],
    ['aceptada', true, true],
    ['rechazada', false, false],
    ['despachada', false, true],
    ['recibida', false, false],
    ['cancelada', false, false],
  ] as const)(
    'en %s ofrece despacho=%s y cancelación=%s',
    async (estado, puedeDespachar, puedeCancelar) => {
      h.cotizacionesProveedor.push(
        cotizacion(estado, 'aaaaaaaa-1111-4111-8111-111111111111')
      )

      const ui = await PedidosPage()
      render(ui)

      const card = tarjeta('AAAAAAAA')
      const despacho = within(card).queryByRole('button', { name: 'Marcar como despachada' })
      const cancelacion = within(card).queryByRole('button', { name: 'Cancelar venta' })
      if (puedeDespachar) expect(despacho).toBeInTheDocument()
      else expect(despacho).not.toBeInTheDocument()
      if (puedeCancelar) expect(cancelacion).toBeInTheDocument()
      else expect(cancelacion).not.toBeInTheDocument()

      const conSeguimiento = estado === 'aceptada' || estado === 'despachada' || estado === 'recibida' || estado === 'cancelada'
      const linea = within(card).queryByRole('region', { name: 'Seguimiento de la cotización' })
      if (conSeguimiento) expect(linea).toBeInTheDocument()
      else expect(linea).not.toBeInTheDocument()

      expect(within(card).queryByRole('button', { name: 'Confirmar recepción' })).not.toBeInTheDocument()
      expect(within(card).queryByRole('form', { name: 'Dejar reseña del proveedor' })).not.toBeInTheDocument()
    }
  )

  it('exige confirmación antes de despachar y muestra el error del RPC', async () => {
    const id = '33333333-1111-4111-8111-111111111111'
    h.despacharCotizacion.mockResolvedValue({
      error: 'Solo puedes despachar una venta aceptada.',
    })
    h.cotizacionesProveedor.push(cotizacion('aceptada', id))

    const ui = await PedidosPage()
    render(ui)

    const card = tarjeta('33333333')
    fireEvent.click(within(card).getByRole('button', { name: 'Marcar como despachada' }))
    expect(h.despacharCotizacion).not.toHaveBeenCalled()

    const dialogo = within(card).getByRole('dialog', { name: 'Confirmar despacho' })
    expect(dialogo).toHaveTextContent('¿Confirmas que esta venta fue despachada?')
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Volver' }))
    expect(within(card).queryByRole('dialog', { name: 'Confirmar despacho' })).not.toBeInTheDocument()
    expect(h.despacharCotizacion).not.toHaveBeenCalled()

    fireEvent.click(within(card).getByRole('button', { name: 'Marcar como despachada' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, marcar como despachada' }))

    expect(await within(card).findByRole('alert')).toHaveTextContent(
      'Solo puedes despachar una venta aceptada.'
    )
    expect(h.despacharCotizacion).toHaveBeenCalledTimes(1)
    expect(h.despacharCotizacion).toHaveBeenCalledWith(id)
    expect(within(card).queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('deshabilita los controles mientras el despacho está en curso', async () => {
    let resolver: (value: null) => void = () => {}
    h.despacharCotizacion.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolver = resolve
        })
    )
    h.cotizacionesProveedor.push(
      cotizacion('aceptada', '33333333-1111-4111-8111-111111111111')
    )

    const ui = await PedidosPage()
    render(ui)

    fireEvent.click(screen.getByRole('button', { name: 'Marcar como despachada' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, marcar como despachada' }))

    const despachando = await screen.findByRole('button', { name: 'Despachando…' })
    expect(despachando).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Marcar como despachada' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar venta' })).toBeDisabled()
    fireEvent.click(despachando)
    expect(h.despacharCotizacion).toHaveBeenCalledTimes(1)

    resolver(null)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Marcar como despachada' })).toBeEnabled()
  })

  it('en despachada proveedor exige motivo Otro y conserva error RPC', async () => {
    const id = COT_DESPACHADA
    h.cancelarVenta.mockResolvedValue({ error: 'Esta venta ya no se puede cancelar.' })
    h.cotizacionesProveedor.push(
      cotizacion('despachada', id, { despachada_at: DESPACHADA_AT })
    )

    const ui = await PedidosPage()
    render(ui)

    const card = tarjeta('DDDDDDDD')
    const linea = within(card).getByRole('region', { name: 'Seguimiento de la cotización' })
    expect(linea).toHaveTextContent(fechaDespacho(DESPACHADA_AT))
    expect(pasoSeguimiento(linea, 2, 'Despachada').className).toContain('font-medium')
    expect(pasoSeguimiento(linea, 3, 'Recibida').className).toContain('text-gray-400')
    expect(within(card).queryByRole('button', { name: 'Marcar como despachada' })).not.toBeInTheDocument()

    fireEvent.click(within(card).getByRole('button', { name: 'Cancelar venta' }))
    expect(h.cancelarVenta).not.toHaveBeenCalled()

    const dialogo = within(card).getByRole('dialog', { name: 'Motivo de cancelación' })
    const confirmar = within(dialogo).getByRole('button', { name: 'Confirmar cancelación' })
    expect(confirmar).toBeDisabled()

    fireEvent.change(within(dialogo).getByRole('combobox', { name: 'Motivo de cancelación' }), {
      target: { value: 'Otro' },
    })
    expect(confirmar).toBeDisabled()

    const detalle = within(dialogo).getByLabelText('Describe el motivo')
    expect(detalle).toHaveProperty('maxLength', 500)
    fireEvent.click(confirmar)
    expect(h.cancelarVenta).not.toHaveBeenCalled()

    fireEvent.change(detalle, { target: { value: 'Sin unidades de reemplazo' } })
    expect(confirmar).toBeEnabled()
    fireEvent.click(confirmar)

    await waitFor(() => {
      expect(h.cancelarVenta).toHaveBeenCalledWith(id, {
        opcion: 'Otro',
        detalle: 'Sin unidades de reemplazo',
      })
    })
    expect(h.cancelarVenta).toHaveBeenCalledTimes(1)
    expect(await within(card).findByRole('alert')).toHaveTextContent('Esta venta ya no se puede cancelar.')
    expect(within(card).queryByRole('dialog', { name: 'Motivo de cancelación' })).not.toBeInTheDocument()
  })

  it('en cancelada nombra al proveedor y no ofrece acciones de venta', async () => {
    h.cotizacionesProveedor.push(
      cotizacion('cancelada', '66666666-1111-4111-8111-111111111111', {
        despachada_at: DESPACHADA_AT,
        cancelada_por: 'proveedor',
      })
    )

    const ui = await PedidosPage()
    render(ui)

    const card = tarjeta('66666666')
    const linea = within(card).getByRole('region', { name: 'Seguimiento de la cotización' })
    expect(linea).toHaveTextContent(fechaDespacho(DESPACHADA_AT))
    expect(within(linea).getByRole('status')).toHaveTextContent('Cancelada por el proveedor.')
    expect(pasoSeguimiento(linea, 2, 'Despachada').className).toContain('font-medium')
    expect(pasoSeguimiento(linea, 3, 'Recibida').className).toContain('text-gray-400')
    expect(within(card).queryByRole('button', { name: 'Marcar como despachada' })).not.toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'Cancelar venta' })).not.toBeInTheDocument()
  })
})

describe('Número uniforme de cotización', () => {
  it('muestra números distintos y con formato uniforme para cotizaciones con el mismo prefijo de UUID en las tres pantallas', async () => {
    const ID_1 = 'e0000000-0000-0000-0000-000000000001'
    const ID_2 = 'e0000000-0000-0000-0000-000000000002'
    const cotizaciones = [
      cotizacion('rechazada', ID_1, { numero: 123 }),
      cotizacion('respondida', ID_2, { numero: 124 }),
    ]
    h.cotizaciones.push(...cotizaciones)
    h.cotizacionesProveedor.push(...cotizaciones)

    const pantallas: (() => Promise<ReturnType<typeof render>>)[] = [
      async () => render(await MisCotizacionesPage({ searchParams: Promise.resolve({}) })),
      async () => render(await PedidosPage()),
      async () => render(await PanelProveedorPage()),
    ]

    for (const renderizar of pantallas) {
      const { unmount } = await renderizar()
      expect(screen.getAllByText('Cotización #COT-000123')).toHaveLength(1)
      expect(screen.getAllByText('Cotización #COT-000124')).toHaveLength(1)
      expect(screen.queryByText('Cotización #E0000000')).not.toBeInTheDocument()
      expect(screen.queryByText('Cotización #e0000000')).not.toBeInTheDocument()
      unmount()
    }
  })
})

describe('Disponibilidad al cotizar', () => {
  const COT_DISPONIBILIDAD = '1a2b3c4d-1111-4111-8111-111111111111'

  function itemsConDisponibilidad(): ItemCotizacion[] {
    return [
      item({
        id: 'it-marcada',
        cotizacion_id: COT_DISPONIBILIDAD,
        producto_id: 'prod-tubo',
        cantidad: 6,
        sujeta_disponibilidad: true,
        stock_al_cotizar: 3,
        producto: productoNombre('Tubo PVC'),
      }),
      item({
        id: 'it-normal',
        cotizacion_id: COT_DISPONIBILIDAD,
        producto_id: 'prod-cemento',
        cantidad: 1,
        sujeta_disponibilidad: false,
        stock_al_cotizar: 8,
        producto: productoNombre('Cemento'),
      }),
    ]
  }

  it('muestra la disponibilidad guardada en Mis cotizaciones', async () => {
    h.cotizaciones.push(
      cotizacion('pendiente', COT_DISPONIBILIDAD, { items: itemsConDisponibilidad() })
    )

    const ui = await MisCotizacionesPage({ searchParams: Promise.resolve({}) })
    render(ui)

    const card = tarjeta('1A2B3C4D')
    expect(
      within(card).getAllByText('Sujeta a disponibilidad: pediste 6, hay 3')
    ).toHaveLength(1)
    expect(within(card).queryByText(/Sujeta a disponibilidad: pediste 1/)).not.toBeInTheDocument()
  })

  it('muestra la disponibilidad guardada en la bandeja del proveedor', async () => {
    h.cotizacionesProveedor.push(
      cotizacion('pendiente', COT_DISPONIBILIDAD, { items: itemsConDisponibilidad() })
    )

    const ui = await PedidosPage()
    render(ui)

    const card = tarjeta('1A2B3C4D')
    expect(
      within(card).getAllByText('Sujeta a disponibilidad: pediste 6, hay 3')
    ).toHaveLength(1)
    expect(within(card).queryByText(/Sujeta a disponibilidad: pediste 1/)).not.toBeInTheDocument()
  })
})
