import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('fichas del seed', () => {
  it('la migración da SKU y especificaciones a los 20 productos del seed, sin pisar datos propios', () => {
    const dir = join(process.cwd(), 'supabase/migrations')
    // Por nombre, sin la versión: el servidor puede renumerar la migración.
    const sql = readFileSync(join(dir, readdirSync(dir).find((f) => f.endsWith('_fichas_seed_sku_especificaciones.sql'))!), 'utf8')
    for (let n = 1; n <= 20; n++) {
      expect(sql).toContain(`'d0000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}'::uuid`)
    }
    expect(sql).toContain('p.sku is null and p.especificaciones is null')
  })
})
