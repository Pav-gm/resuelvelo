/**
 * Tests de NavbarClient: el carrito debe estar visible en la cabecera móvil.
 * jsdom no aplica el breakpoint `md`, así que este render representa el ancho móvil.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Acción de sesión mockeada como no-op para no acoplar la prueba a la autenticación.
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

beforeEach(() => {
  localStorage.clear()
  useCarritoStore.getState().vaciar()
})

afterEach(() => {
  cleanup()
})

describe('NavbarClient — carrito en móvil', () => {
  it('muestra el botón Carrito en la cabecera móvil y abre el drawer', () => {
    render(<NavbarClient usuario={null} />)

    // Una sola instancia del carrito: no se duplica entre móvil y escritorio.
    const botones = screen.getAllByRole('button', { name: 'Carrito' })
    expect(botones).toHaveLength(1)

    const boton = botones[0]
    // No debe quedar oculto en móvil: ningún ancestro con la clase `hidden`.
    for (let ancestro = boton.parentElement; ancestro; ancestro = ancestro.parentElement) {
      expect(ancestro.classList.contains('hidden')).toBe(false)
    }

    fireEvent.click(boton)

    expect(screen.getByText('Mi carrito')).toBeInTheDocument()
  })
})
