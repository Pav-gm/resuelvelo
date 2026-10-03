/**
 * Página «¿Cómo funciona?»: los dos botones del cierre deben ser legibles sin pasar el cursor.
 * Regresión: «Soy proveedor» usaba la variante outline (fondo blanco) con texto blanco, así que solo se veía en hover.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ComoFunciona from '@/app/como-funciona/page'

afterEach(cleanup)

describe('Cómo funciona — llamada a la acción', () => {
  it('«Soy proveedor» no tiene fondo claro con texto blanco', () => {
    render(<ComoFunciona />)
    const boton = screen.getByRole('link', { name: /Soy proveedor/ }).querySelector('button')!

    expect(boton).toBeTruthy()
    const clases = boton.className.split(/\s+/)
    expect(clases).toContain('text-white')
    expect(clases).toContain('bg-transparent')
    expect(clases).not.toContain('bg-background')
    // En hover el texto sigue siendo blanco (la variante outline lo pasa a «foreground»).
    expect(clases).toContain('hover:text-white')
    expect(clases).not.toContain('hover:text-foreground')
  })

  it('«Soy comprador» sigue siendo blanco con texto naranja', () => {
    render(<ComoFunciona />)
    const boton = screen.getByRole('link', { name: /Soy comprador/ }).querySelector('button')!

    expect(boton.className.split(/\s+/)).toEqual(expect.arrayContaining(['bg-white', 'text-orange-600']))
  })
})
