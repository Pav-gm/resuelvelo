/**
 * Tests de las rutas alias de soporte: `/ayuda` y `/soporte` redirigen a
 * `/contacto` invocando `redirect` una sola vez.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { redirect } from 'next/navigation'
import AyudaPage from '@/app/ayuda/page'
import SoportePage from '@/app/soporte/page'

const redirectMock = vi.mocked(redirect)

beforeEach(() => {
  redirectMock.mockReset()
})

afterEach(() => {
  redirectMock.mockReset()
})

describe('rutas de soporte', () => {
  it('redirige ayuda a contacto', () => {
    AyudaPage()

    expect(redirectMock).toHaveBeenCalledTimes(1)
    expect(redirectMock).toHaveBeenCalledWith('/contacto')
  })

  it('redirige soporte a contacto', () => {
    SoportePage()

    expect(redirectMock).toHaveBeenCalledTimes(1)
    expect(redirectMock).toHaveBeenCalledWith('/contacto')
  })
})
