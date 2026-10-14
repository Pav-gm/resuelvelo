import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  getProductosActivosPorIds: vi.fn(),
}))

vi.mock('@/lib/data', () => ({ getProductosActivosPorIds: h.getProductosActivosPorIds }))

import { obtenerProductosActivosParaReordenar } from '@/app/(marketplace)/cotizaciones/actions'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('obtenerProductosActivosParaReordenar', () => {
  it('obtenerProductosActivosParaReordenar limpia ids repetidos y vacíos', async () => {
    const producto = { id: 'prod-1', activo: true }
    h.getProductosActivosPorIds.mockResolvedValue([producto])

    await expect(obtenerProductosActivosParaReordenar(['prod-1', '', 'prod-1'])).resolves.toEqual([producto])
    expect(h.getProductosActivosPorIds).toHaveBeenCalledOnce()
    expect(h.getProductosActivosPorIds).toHaveBeenCalledWith(['prod-1'])
  })

  it('obtenerProductosActivosParaReordenar devuelve una lista vacía para entrada inválida', async () => {
    await expect(obtenerProductosActivosParaReordenar(null as unknown as string[])).resolves.toEqual([])
    expect(h.getProductosActivosPorIds).not.toHaveBeenCalled()
  })
})
