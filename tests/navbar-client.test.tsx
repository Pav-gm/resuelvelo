/**
 * Tests de NavbarClient: el carrito debe estar visible en la cabecera móvil.
 * jsdom no aplica el breakpoint `md`, así que este render representa el ancho móvil.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/(auth)/actions', () => ({
  cerrarSesion: vi.fn(),
}))

vi.mock('@/app/(marketplace)/cotizaciones/actions', () => ({
  cotizarDesdeCarrito: vi.fn(),
}))

vi.mock('next/image', () => ({
  default: () => null,
}))

import NavbarClient from '@/components/layout/NavbarClient'
import { useCarritoStore } from '@/lib/store/carrito'
import type { Producto } from '@/types'

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
})

describe('NavbarClient — carrito en móvil', () => {
  it('muestra el botón Carrito en la cabecera móvil y abre el drawer', () => {
    useCarritoStore
      .getState()
      .agregar(producto({ id: 'prod-1', nombre: 'Tubo PVC 4"', precio: 680, stock: 5 }), 2)

    render(<NavbarClient usuario={null} />)

    const boton = screen.getByRole('button', { name: 'Carrito' })
    expect(screen.getAllByRole('button', { name: 'Carrito' })).toHaveLength(1)
    expect(within(boton).getByText('2')).toBeInTheDocument()

    fireEvent.click(boton)

    expect(screen.getByText('Mi carrito')).toBeInTheDocument()
    expect(screen.getByText('Tubo PVC 4"')).toBeInTheDocument()
    expect(screen.getByText('$1,360.00')).toBeInTheDocument()
  })

  it('mantiene en escritorio el carrito delante de los controles de usuario', () => {
    const { container } = render(<NavbarClient usuario={null} />)

    const fila = container.querySelector('header > div') as HTMLElement
    expect(fila.children).toHaveLength(3)

    const grupo = fila.lastElementChild as HTMLElement
    const carrito = screen.getByRole('button', { name: 'Carrito' })
    const ingresar = within(grupo).getByRole('link', { name: /Ingresar/ })

    expect(grupo).toContainElement(carrito)
    expect(
      carrito.compareDocumentPosition(ingresar) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})
