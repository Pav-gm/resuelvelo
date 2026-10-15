import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const schema = readFileSync(path.join(process.cwd(), 'supabase/schema.sql'), 'utf8')
const migracion = readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20261008060044_comprador_lee_productos_cotizados.sql'
  ),
  'utf8'
)
const rollback = readFileSync(
  path.join(
    process.cwd(),
    'supabase/rollbacks/20261008060044_comprador_lee_productos_cotizados.sql'
  ),
  'utf8'
)

const nombrePolitica = 'productos: compradores leen productos de sus cotizaciones'

function obtenerPolitica(sql: string): string {
  const inicio = sql.indexOf(`create policy "${nombrePolitica}"`)
  expect(inicio, 'debe declarar la política de lectura de productos cotizados').toBeGreaterThan(-1)
  const fin = sql.indexOf(';', inicio)
  expect(fin, 'la política debe terminar con punto y coma').toBeGreaterThan(inicio)
  return sql.slice(inicio, fin + 1)
}

describe('lectura de productos incluidos en cotizaciones propias', () => {
  it('permite al comprador leer productos inactivos solo cuando aparecen en sus cotizaciones', () => {
    for (const sql of [schema, migracion]) {
      const politica = obtenerPolitica(sql)

      expect(politica).toMatch(/on public\.productos for select/i)
      expect(politica).toMatch(/exists\s*\(/i)
      expect(politica).toMatch(/from public\.items_cotizacion\s+i/i)
      expect(politica).toMatch(
        /join public\.cotizaciones\s+c\s+on\s+c\.id\s*=\s*i\.cotizacion_id/i
      )
      expect(politica).toMatch(/i\.producto_id\s*=\s*productos\.id/i)
      expect(politica).toMatch(/c\.comprador_id\s*=\s*auth\.uid\(\)/i)
      expect(politica).not.toMatch(/using\s*\(\s*true\s*\)/i)
    }
  })

  it('el rollback elimina únicamente la política de lectura de productos cotizados', () => {
    expect(rollback.trim()).toBe(
      `drop policy if exists "${nombrePolitica}" on public.productos;`
    )
  })
})
