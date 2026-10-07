/**
 * Tests de ProductoCard: «Agregado», «Máximo en carrito» y stock cero.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProductoCard from '@/components/marketplace/ProductoCard'
import { useCarritoStore } from '@/lib/store/carrito'
import type { Producto } from '@/types'

vi.mock('next/image', () => ({
  default: () => null,
}))

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

beforeEach(() => {
  localStorage.clear()
  useCarritoStore.getState().vaciar()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('ProductoCard — diseño responsive', () => {
  it('mantiene el botón Agregar dentro del ancho móvil de la tarjeta', () => {
    render(<ProductoCard producto={producto({ stock: 5 })} />)

    // Ocupa todo el ancho en móvil y vuelve al ancho automático desde `sm`.
    const boton = screen.getByRole('button', { name: 'Agregar' })
    expect(boton).toHaveClass('w-full', 'sm:w-auto')
  })
})

describe('ProductoCard — estados de stock', () => {
  it('muestra Agregar habilitado cuando hay stock y el carrito no llegó al tope', () => {
    render(<ProductoCard producto={producto({ stock: 5 })} />)

    expect(screen.getByRole('button', { name: 'Agregar' })).toBeEnabled()
  })

  it('deshabilita el botón con stock cero y conserva el aviso Sin stock', () => {
    render(<ProductoCard producto={producto({ stock: 0 })} />)

    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled()
    expect(screen.getByText('Sin stock')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Máximo en carrito' })).not.toBeInTheDocument()
  })

  it('mantiene deshabilitado un stock negativo y no agrega el producto', () => {
    render(<ProductoCard producto={producto({ stock: -2 })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled()
    expect(useCarritoStore.getState().items).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Agregado' })).not.toBeInTheDocument()
  })

  it('un clic con stock cero no agrega ni muestra Agregado', () => {
    render(<ProductoCard producto={producto({ stock: 0 })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(useCarritoStore.getState().items).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled()
    expect(screen.queryByText('Agregado')).not.toBeInTheDocument()
  })

  it('muestra Agregado tras una adición efectiva y vuelve a Agregar', () => {
    vi.useFakeTimers()
    render(<ProductoCard producto={producto({ stock: 5 })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(screen.getByRole('button', { name: 'Agregado' })).toBeEnabled()
    expect(useCarritoStore.getState().items[0].cantidad).toBe(1)

    act(() => {
      vi.advanceTimersByTime(1499)
    })
    expect(screen.getByRole('button', { name: 'Agregado' })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Máximo en carrito' })).not.toBeInTheDocument()
  })

  it('al alcanzar el stock muestra Máximo en carrito y deshabilita el botón', () => {
    const actual = producto({ stock: 2 })
    useCarritoStore.getState().agregar(actual, 2)

    render(<ProductoCard producto={actual} />)

    expect(screen.getByRole('button', { name: 'Máximo en carrito' })).toBeDisabled()
    expect(useCarritoStore.getState().items[0].cantidad).toBe(2)
  })

  it('al agregar la última unidad disponible manda Máximo en carrito', () => {
    vi.useFakeTimers()
    render(<ProductoCard producto={producto({ stock: 1 })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(screen.getByRole('button', { name: 'Máximo en carrito' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Agregado' })).not.toBeInTheDocument()
    expect(useCarritoStore.getState().items[0].cantidad).toBe(1)

    act(() => {
      vi.advanceTimersByTime(1500)
    })

    expect(screen.getByRole('button', { name: 'Máximo en carrito' })).toBeDisabled()
  })

  it('no vuelve a mostrar Agregado si el carrito ya está en el stock', () => {
    const actual = producto({ stock: 1 })
    useCarritoStore.getState().agregar(actual, 1)
    render(<ProductoCard producto={actual} />)

    fireEvent.click(screen.getByRole('button', { name: 'Máximo en carrito' }))

    expect(screen.getByRole('button', { name: 'Máximo en carrito' })).toBeDisabled()
    expect(useCarritoStore.getState().items[0].cantidad).toBe(1)
    expect(screen.queryByText('Agregado')).not.toBeInTheDocument()
  })
})
