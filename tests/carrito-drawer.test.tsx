/**
 * Tests de CarritoDrawer: tope de stock, aria-labels y envío de cotización.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Producto } from '@/types'

const cotizarDesdeCarrito = vi.hoisted(() => vi.fn())

vi.mock('@/app/(marketplace)/cotizaciones/actions', () => ({
  cotizarDesdeCarrito,
}))

import CarritoDrawer from '@/components/marketplace/CarritoDrawer'
import { useCarritoStore } from '@/lib/store/carrito'

function producto(overrides: Partial<Producto> = {}): Producto {
  return {
    id: 'prod-1',
    proveedor_id: 'prov-1',
    categoria_id: 'cat-1',
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
  render(<CarritoDrawer />)
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
})
