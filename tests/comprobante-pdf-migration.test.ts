import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migracion = readFileSync(join(process.cwd(), 'supabase/migrations/20261011000100_datos_comerciales_comprobante.sql'), 'utf8')
const rollback = readFileSync(join(process.cwd(), 'supabase/rollbacks/20261011000100_datos_comerciales_comprobante.sql'), 'utf8')
const anterior = readFileSync(join(process.cwd(), 'supabase/migrations/20261010000209_decision_oferta_comprador.sql'), 'utf8')

function definicion(sql: string): string {
  const inicio = sql.indexOf('create or replace function public.get_cotizacion_detalle(p_cotizacion_id uuid)')
  const fin = sql.indexOf('\nrevoke execute on function public.get_cotizacion_detalle(uuid)', inicio)
  return sql.slice(inicio, fin).trim()
}

describe('migración de datos comerciales del comprobante', () => {
  it('la migración agrega datos comerciales a la RPC autorizada y el rollback restaura su definición', () => {
    expect(migracion).toContain("'rnc', p.rnc")
    expect(migracion).toContain("'direccion', p.direccion")
    expect(migracion).toContain("'telefono', p.telefono")
    expect(migracion).toContain("'razon_social', comprador.razon_social")
    expect(migracion).toContain("'rnc', comprador.rnc")
    expect(migracion).toContain("'itbis_incluido', producto.itbis_incluido")
    expect(migracion).toMatch(/c\.comprador_id = auth\.uid\(\) or p\.user_id = auth\.uid\(\)/i)
    expect(migracion).toMatch(/revoke execute on function public\.get_cotizacion_detalle\(uuid\) from public, anon/i)
    expect(migracion).toMatch(/grant execute on function public\.get_cotizacion_detalle\(uuid\) to authenticated/i)
    expect(definicion(rollback)).toBe(definicion(anterior))
    expect(rollback).not.toContain("'rnc', p.rnc")
    expect(rollback).not.toContain("'razon_social', comprador.razon_social")
    expect(rollback).not.toContain("'itbis_incluido', producto.itbis_incluido")
    expect(rollback).toMatch(/revoke execute on function public\.get_cotizacion_detalle\(uuid\) from public, anon/i)
    expect(rollback).toMatch(/grant execute on function public\.get_cotizacion_detalle\(uuid\) to authenticated/i)
  })
})
