import { describe, expect, it } from 'vitest'
import {
  esFechaISOFuturaEnSantoDomingo,
  hoyISOEnSantoDomingo,
  sumarDiasISOEnSantoDomingo,
} from '@/lib/cotizaciones'

describe('fechas de cotizaciones en Santo Domingo', () => {
  it('hoyISOEnSantoDomingo usa el día local al cruzar medianoche UTC', () => {
    const ahora = new Date('2026-10-08T00:30:00.000Z')

    expect(hoyISOEnSantoDomingo(ahora)).toBe('2026-10-07')
  })

  it('sumarDiasISOEnSantoDomingo suma siete días calendario dominicanos', () => {
    const ahora = new Date('2026-10-08T00:30:00.000Z')

    expect(sumarDiasISOEnSantoDomingo(7, ahora)).toBe('2026-10-14')
  })

  it('esFechaISOFuturaEnSantoDomingo valida el día local y rechaza fechas imposibles', () => {
    const ahora = new Date('2026-10-08T00:30:00.000Z')

    expect(esFechaISOFuturaEnSantoDomingo('2026-10-08', ahora)).toBe(true)
    expect(esFechaISOFuturaEnSantoDomingo('2026-10-07', ahora)).toBe(false)
    expect(esFechaISOFuturaEnSantoDomingo('2026-02-30', ahora)).toBe(false)
  })
})
