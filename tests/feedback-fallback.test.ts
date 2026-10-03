/**
 * Fallback de lecturas de feedback cuando Supabase no está configurado.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest'

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://<project-ref>.supabase.co')
})

describe('feedback — fallback a mock', () => {
  it('el perfil del proveedor no inventa reseñas, promedio ni conteo', async () => {
    const { getFeedbackDeProveedor } = await import('@/lib/data')
    await expect(getFeedbackDeProveedor('p1')).resolves.toEqual({
      reseñas: [],
      promedio: 0,
      conteo: 0,
    })
  })

  it('una cotización sin catálogo de demostración no tiene reseña', async () => {
    const { getFeedbackPorCotizacion } = await import('@/lib/data')
    await expect(getFeedbackPorCotizacion('cot-inexistente')).resolves.toBeNull()
  })
})
