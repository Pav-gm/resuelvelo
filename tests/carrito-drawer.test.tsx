/**
 * Tests de CarritoDrawer: tope de stock, aria-labels y envío de cotización.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Producto } from '@/types'
import type { DireccionObraDrawer } from '@/components/marketplace/CarritoDrawer'

const cotizarDesdeCarrito = vi.hoisted(() => vi.fn())

vi.mock('@/app/(marketplace)/cotizaciones/actions', () => ({
  cotizarDesdeCarrito,
}))

import CarritoDrawer from '@/components/marketplace/CarritoDrawer'
import { useCarritoStore } from '@/lib/store/carrito'

const DIRECCIONES: DireccionObraDrawer[] = [
  {
    id: 'dir-1',
    etiqueta: 'Obra principal',
    direccion: 'Av. 27 de Febrero 123',
    provincia: 'Santiago',
    municipio: 'Santiago de los Caballeros',
    referencia: 'Portón azul',
    es_principal: true,
  },
  {
    id: 'dir-2',
    etiqueta: 'Almacén',
    direccion: 'Calle Duarte 45',
    provincia: 'Duarte',
    municipio: null,
    referencia: null,
    es_principal: false,
  },
]

function producto(overrides: Partial<Producto> = {}): Producto {
  return {
    id: 'prod-1',
    proveedor_id: 'prov-1',
    categoria_id: 'cat-1',
    subcategoria_id: null,
    nombre: 'Tubo PVC 4"',
    precio: 680,
    unidad: 'unidad',
    stock: 5,
    activo: true,
    created_at: '',
    ...overrides,
  }
}

function abrirCarrito() {
  render(<CarritoDrawer direccionesObra={DIRECCIONES} />)
  fireEvent.click(screen.getByRole('button', { name: 'Carrito' }))
}

beforeEach(() => {
  localStorage.clear()
  useCarritoStore.getState().vaciar()
  cotizarDesdeCarrito.mockReset()
  cotizarDesdeCarrito.mockResolvedValue(null)
})

afterEach(() => {
  cleanup()
})

describe('CarritoDrawer — controles y stock', () => {
  it('expone los aria-label exactos de aumentar, disminuir y quitar', () => {
    useCarritoStore.getState().agregar(producto({ stock: 5 }), 1)
    abrirCarrito()

    expect(screen.getByRole('button', { name: 'Aumentar cantidad' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Disminuir cantidad' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Quitar producto' })).toBeEnabled()
  })

  it('deshabilita aumentar al alcanzar el stock y no pasa del tope', () => {
    useCarritoStore.getState().agregar(producto({ stock: 2 }), 1)
    abrirCarrito()

    const aumentar = () => screen.getByRole('button', { name: 'Aumentar cantidad' })
    expect(aumentar()).toBeEnabled()

    fireEvent.click(aumentar())
    expect(useCarritoStore.getState().items[0].cantidad).toBe(2)
    expect(aumentar()).toBeDisabled()

    fireEvent.click(aumentar())
    expect(useCarritoStore.getState().items[0].cantidad).toBe(2)
  })

  it('deshabilita aumentar cuando el stock del producto no es positivo', () => {
    useCarritoStore.setState({
      items: [{ producto: producto({ stock: 0 }), cantidad: 1 }],
    })
    abrirCarrito()

    expect(screen.getByRole('button', { name: 'Aumentar cantidad' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Disminuir cantidad' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Quitar producto' })).toBeEnabled()
  })

  it('deshabilita solo el producto que ya llegó a su stock', () => {
    useCarritoStore.getState().agregar(producto({ id: 'a', nombre: 'Arena', stock: 1 }), 1)
    useCarritoStore.getState().agregar(producto({ id: 'b', nombre: 'Cemento', stock: 4 }), 1)
    abrirCarrito()

    const botones = screen.getAllByRole('button', { name: 'Aumentar cantidad' })
    expect(botones).toHaveLength(2)
    expect(botones[0]).toBeDisabled()
    expect(botones[1]).toBeEnabled()
    expect(screen.getAllByRole('button', { name: 'Disminuir cantidad' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Quitar producto' })).toHaveLength(2)
  })

  it('disminuir baja la cantidad y quita el producto al llegar a cero', () => {
    useCarritoStore.getState().agregar(producto({ stock: 4 }), 2)
    abrirCarrito()

    fireEvent.click(screen.getByRole('button', { name: 'Disminuir cantidad' }))
    expect(useCarritoStore.getState().items[0].cantidad).toBe(1)
    expect(screen.getByRole('button', { name: 'Aumentar cantidad' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Disminuir cantidad' }))
    expect(useCarritoStore.getState().items).toHaveLength(0)
    expect(screen.getByText('El carrito está vacío.')).toBeInTheDocument()
  })

  it('quitar producto elimina la línea', () => {
    useCarritoStore.getState().agregar(producto({ id: 'a', nombre: 'Arena' }), 1)
    useCarritoStore.getState().agregar(producto({ id: 'b', nombre: 'Cemento' }), 1)
    abrirCarrito()

    fireEvent.click(screen.getAllByRole('button', { name: 'Quitar producto' })[0])

    expect(useCarritoStore.getState().items.map((i) => i.producto.id)).toEqual(['b'])
    expect(screen.queryByText('Arena')).not.toBeInTheDocument()
    expect(screen.getByText('Cemento')).toBeInTheDocument()
  })

  it('con el carrito vacío no muestra los controles de cantidad', () => {
    abrirCarrito()

    expect(screen.getByText('El carrito está vacío.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aumentar cantidad' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Disminuir cantidad' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Quitar producto' })).not.toBeInTheDocument()
  })

  it('muestra Máximo en carrito con la cifra disponible al alcanzar el tope', () => {
    useCarritoStore
      .getState()
      .agregar(producto({ stock: 299, stock_reservado: 213 }), 86)
    abrirCarrito()

    expect(screen.getByText('Máximo en carrito: 86')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aumentar cantidad' })).toBeDisabled()
  })

  it('el carrito muestra precio unitario y total en pesos dominicanos', () => {
    useCarritoStore
      .getState()
      .agregar(producto({ precio: 1234.5, unidad: 'unidad' }), 2)
    abrirCarrito()

    expect(screen.getByText('RD$ 1,234.50 / unidad')).toBeInTheDocument()
    expect(screen.getByText('RD$ 2,469.00')).toBeInTheDocument()
  })
})

describe('CarritoDrawer — envío de cotización', () => {
  it('envía los ítems actuales y muestra el { error } devuelto', async () => {
    cotizarDesdeCarrito.mockResolvedValue({
      error: 'No hay stock suficiente para Tubo PVC (disponible: 1, solicitado: 2).',
    })
    const actual = producto({ id: 'prod-9', nombre: 'Tubo PVC', stock: 5 })
    useCarritoStore.getState().agregar(actual, 2)
    abrirCarrito()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Solicitar cotización' }))
    })

    expect(screen.getByText(
      'No hay stock suficiente para Tubo PVC (disponible: 1, solicitado: 2).'
    )).toBeInTheDocument()
    expect(cotizarDesdeCarrito).toHaveBeenCalledTimes(1)
    expect(cotizarDesdeCarrito.mock.calls[0][0]).toBeNull()

    const form = cotizarDesdeCarrito.mock.calls[0][1] as FormData
    const items = JSON.parse(String(form.get('items')))
    expect(items).toHaveLength(1)
    expect(items[0].producto.id).toBe('prod-9')
    expect(items[0].cantidad).toBe(2)
  })

  it('un resultado válido no muestra error', async () => {
    cotizarDesdeCarrito.mockResolvedValue(null)
    useCarritoStore.getState().agregar(producto({ stock: 3 }), 1)
    abrirCarrito()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Solicitar cotización' }))
    })

    expect(cotizarDesdeCarrito).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/No hay stock suficiente/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Solicitar cotización' })).toBeEnabled()
  })

  it('envía una sola vez la mezcla de productos no disponibles y válidos', async () => {
    cotizarDesdeCarrito.mockResolvedValue(null)
    useCarritoStore.getState().agregar(producto({ id: '1', nombre: 'Tubo PVC' }), 1)
    useCarritoStore.getState().agregar(producto({ id: 'prod-real', nombre: 'Cemento' }), 2)
    abrirCarrito()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Solicitar cotización' }))
    })

    expect(cotizarDesdeCarrito).toHaveBeenCalledTimes(1)

    const form = cotizarDesdeCarrito.mock.calls[0][1] as FormData
    const items = JSON.parse(String(form.get('items')))
    expect(items).toHaveLength(2)
    expect(items.map((i: { producto: { id: string } }) => i.producto.id)).toEqual(['1', 'prod-real'])
    expect(items.map((i: { cantidad: number }) => i.cantidad)).toEqual([1, 2])
  })

  it('quita los ids no disponibles y conserva las líneas válidas', async () => {
    cotizarDesdeCarrito.mockResolvedValue({
      error: 'Estos productos ya no están disponibles: Tubo PVC. Los quitamos del carrito.',
      noDisponibles: ['1'],
    })
    useCarritoStore.getState().agregar(producto({ id: '1', nombre: 'Tubo PVC' }), 1)
    useCarritoStore.getState().agregar(producto({ id: 'prod-real', nombre: 'Cemento' }), 1)
    abrirCarrito()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Solicitar cotización' }))
    })

    expect(screen.getByText(
      'Estos productos ya no están disponibles: Tubo PVC. Los quitamos del carrito.'
    )).toBeInTheDocument()
    expect(useCarritoStore.getState().items.map((i) => i.producto.id)).toEqual(['prod-real'])
    expect(screen.getByText('Cemento')).toBeInTheDocument()
  })

  it('si todos los productos dejaron de estar disponibles, el aviso se ve con el carrito vacío', async () => {
    cotizarDesdeCarrito.mockResolvedValue({
      error: 'Estos productos ya no están disponibles: Tubo PVC. Los quitamos del carrito.',
      noDisponibles: ['1'],
    })
    useCarritoStore.getState().agregar(producto({ id: '1', nombre: 'Tubo PVC' }), 1)
    abrirCarrito()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Solicitar cotización' }))
    })

    expect(useCarritoStore.getState().items).toHaveLength(0)
    expect(screen.getByText('El carrito está vacío.')).toBeInTheDocument()
    expect(screen.getByText(
      'Estos productos ya no están disponibles: Tubo PVC. Los quitamos del carrito.'
    )).toBeInTheDocument()
  })

  it('el selector de dirección ofrece sin dirección y las direcciones guardadas', () => {
    useCarritoStore.getState().agregar(producto(), 1)
    abrirCarrito()

    const selector = screen.getByLabelText('Dirección de obra') as HTMLSelectElement
    const opciones = within(selector)
      .getAllByRole('option')
      .map((opcion) => opcion.textContent)
    expect(opciones).toEqual([
      'Sin dirección',
      'Obra principal — Av. 27 de Febrero 123, Santiago de los Caballeros, Santiago',
      'Almacén — Calle Duarte 45, Duarte',
    ])
    expect(selector.value).toBe('')
    expect(screen.getByLabelText('Fecha requerida (opcional)')).toHaveAttribute('type', 'date')
  })

  it('el campo de fecha requerida limita la selección a hoy en Santo Domingo', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-08T00:30:00.000Z'))
    try {
      useCarritoStore.getState().agregar(producto(), 1)
      abrirCarrito()

      const campo = screen.getByLabelText('Fecha requerida (opcional)')
      expect(campo).toHaveAttribute('type', 'date')
      expect(campo).toHaveAttribute('min', '2026-10-07')
    } finally {
      vi.useRealTimers()
    }
  })

  it('envía la dirección elegida y la fecha requerida en el FormData', async () => {
    useCarritoStore.getState().agregar(producto(), 1)
    abrirCarrito()

    fireEvent.change(screen.getByLabelText('Dirección de obra'), {
      target: { value: 'dir-1' },
    })
    fireEvent.change(screen.getByLabelText('Fecha requerida (opcional)'), {
      target: { value: '2026-11-03' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Solicitar cotización' }))
    })

    const form = cotizarDesdeCarrito.mock.calls[0][1] as FormData
    expect(form.get('direccion_obra_id')).toBe('dir-1')
    expect(form.get('fecha_requerida')).toBe('2026-11-03')
  })

  it('sin dirección ni fecha no envía esos campos', async () => {
    useCarritoStore.getState().agregar(producto(), 1)
    abrirCarrito()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Solicitar cotización' }))
    })

    const form = cotizarDesdeCarrito.mock.calls[0][1] as FormData
    expect(form.has('direccion_obra_id')).toBe(false)
    expect(form.has('fecha_requerida')).toBe(false)
  })
})

describe('CarritoDrawer — enlace multiproveedor', () => {
  it('el enlace multiproveedor cierra el cajón del carrito al navegar', () => {
    useCarritoStore.getState().agregar(producto(), 1)
    abrirCarrito()

    expect(screen.getByText('Mi carrito')).toBeInTheDocument()
    const enlace = screen.getByRole('link', { name: 'Enviar el carrito a varios proveedores' })
    expect(enlace).toHaveAttribute('href', '/solicitudes/nueva?desde=carrito')

    fireEvent.click(enlace)

    expect(screen.queryByText('Mi carrito')).not.toBeInTheDocument()
    expect(enlace).toHaveAttribute('href', '/solicitudes/nueva?desde=carrito')
  })
})
