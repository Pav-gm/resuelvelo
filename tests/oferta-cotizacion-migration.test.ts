import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const supabaseDir = join(process.cwd(), 'supabase')
const migracionNombre = readdirSync(join(supabaseDir, 'migrations'))
  .find((archivo) => archivo.endsWith('_oferta_cotizacion_proveedor.sql'))
const rollbackNombre = readdirSync(join(supabaseDir, 'rollbacks'))
  .find((archivo) => archivo.endsWith('_oferta_cotizacion_proveedor.sql'))

describe('migración de oferta de cotización', () => {
  it('la migración rechaza una oferta cuyo total de unidades es cero', () => {
    expect(migracionNombre).toBeDefined()
    const sql = readFileSync(join(supabaseDir, 'migrations', migracionNombre!), 'utf8')
    const funcion = sql.slice(sql.indexOf('create or replace function public.responder_cotizacion_con_oferta'))

    expect(funcion).toMatch(/if v_suma_cantidad = 0 then[\s\S]*?raise exception 'La oferta debe incluir al menos una unidad\.';/i)
  })

  it('la migración añade los campos, protege al destinatario y calcula la oferta al responder', () => {
    expect(migracionNombre).toBeDefined()
    const sql = readFileSync(join(supabaseDir, 'migrations', migracionNombre!), 'utf8')

    for (const columna of [
      'precio_ofertado numeric null',
      'cantidad_ofertada integer null',
      'plazo_dias integer null',
      'valida_hasta date null',
      'condiciones text null',
      'respondida_at timestamptz null',
      'total_ofertado numeric null',
      'motivo_rechazo text null',
    ]) {
      expect(sql).toContain(columna)
    }
    expect(sql).toMatch(/create policy "cotizaciones: proveedor actualiza oferta pendiente"[\s\S]*?estado = 'pendiente'[\s\S]*?p\.user_id = auth\.uid\(\)/)
    expect(sql).toMatch(/create policy "items: proveedor actualiza oferta pendiente"[\s\S]*?estado = 'pendiente'[\s\S]*?p\.user_id = auth\.uid\(\)/)
    expect(sql).toMatch(/responder_cotizacion_con_oferta[\s\S]*?p\.user_id = auth\.uid\(\)[\s\S]*?v_estado is distinct from 'pendiente'/)
    expect(sql).toContain("estado = 'respondida'")
    expect(sql).toContain('respondida_at = now()')
    expect(sql).toMatch(/sum\(i\.precio_ofertado \* coalesce\(i\.cantidad_ofertada, i\.cantidad\)\)/i)
    expect(sql).toContain('revoke update on public.cotizaciones from authenticated;')
    expect(sql).toContain('grant update (plazo_dias, valida_hasta, condiciones, respondida_at, total_ofertado) on public.cotizaciones to authenticated;')
    expect(sql).toContain('revoke update on public.items_cotizacion from authenticated;')
    expect(sql).toContain('grant update (precio_ofertado, cantidad_ofertada) on public.items_cotizacion to authenticated;')
  })

  it('el rollback restaura el detalle anterior y revierte los objetos de oferta', () => {
    expect(rollbackNombre).toBeDefined()
    const sql = readFileSync(join(supabaseDir, 'rollbacks', rollbackNombre!), 'utf8')
    const detalle = sql.slice(sql.indexOf('create or replace function public.get_cotizacion_detalle'))

    expect(detalle).toContain("'activo', producto.activo")
    expect(detalle).not.toContain("'precio_ofertado'")
    expect(detalle).not.toContain("'total_ofertado'")
    expect(sql).toContain('drop policy "cotizaciones: proveedor actualiza oferta pendiente"')
    expect(sql).toContain('drop policy "items: proveedor actualiza oferta pendiente"')
    expect(sql).toContain('drop function public.responder_cotizacion_con_oferta')
    expect(sql).toContain('drop function public.rechazar_cotizacion_con_motivo')
    expect(sql).toContain('grant update on public.cotizaciones to authenticated;')
    expect(sql).toContain('grant update on public.items_cotizacion to authenticated;')
    for (const objeto of [
      'drop constraint items_cotizacion_cantidad_ofertada_check',
      'drop column cantidad_ofertada',
      'drop column precio_ofertado',
      'drop column motivo_rechazo',
      'drop column total_ofertado',
      'drop column respondida_at',
      'drop column condiciones',
      'drop column valida_hasta',
      'drop column plazo_dias',
    ]) {
      expect(sql).toContain(objeto)
    }
  })
})
