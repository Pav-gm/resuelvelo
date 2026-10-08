/**
 * Contratos de esquema: elegibilidad, unicidad, lectura pública y recepción.
 * La base local no ejecuta Postgres; estas pruebas fijan el SQL que es la autoridad.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const schema = readFileSync(path.join(process.cwd(), 'supabase/schema.sql'), 'utf8')
const migracionCantidadConfirmada = readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20261010000203_cantidad_confirmada_en_transiciones.sql'),
  'utf8'
)
const checkCantidadConfirmada = readFileSync(
  path.join(process.cwd(), 'supabase/checks/cantidad_confirmada_no_supera_solicitada.sql'),
  'utf8'
)
const accion = readFileSync(
  path.join(process.cwd(), 'app/(marketplace)/cotizaciones/actions.ts'),
  'utf8'
)
const accionProveedor = readFileSync(
  path.join(process.cwd(), 'app/(marketplace)/proveedor/actions.ts'),
  'utf8'
)
const formulario = readFileSync(
  path.join(process.cwd(), 'components/marketplace/FormularioFeedback.tsx'),
  'utf8'
)

function bloque(marca: string, fin: string): string {
  const inicio = schema.indexOf(marca)
  expect(inicio, marca).toBeGreaterThan(-1)
  const cierre = schema.indexOf(fin, inicio)
  expect(cierre, fin).toBeGreaterThan(inicio)
  return schema.slice(inicio, cierre)
}

function bloqueFuente(fuente: string, marca: string, fin: string): string {
  const inicio = fuente.indexOf(marca)
  expect(inicio, marca).toBeGreaterThan(-1)
  const cierre = fuente.indexOf(fin, inicio)
  expect(cierre, fin).toBeGreaterThan(inicio)
  return fuente.slice(inicio, cierre)
}

function funcionExportada(fuente: string, nombre: string): string {
  const marca = `export async function ${nombre}`
  const inicio = fuente.indexOf(marca)
  expect(inicio, marca).toBeGreaterThan(-1)
  const siguiente = fuente.indexOf('\nexport ', inicio + marca.length)
  return fuente.slice(inicio, siguiente === -1 ? fuente.length : siguiente)
}

const crearFeedback = bloque('function public.crear_feedback', '$$;')
const confirmar = bloque('function public.confirmar_recepcion', '$$;')
const despachar = bloque('function public.despachar_cotizacion', '$$;')
const cancelar = bloque('function public.cancelar_venta', '$$;')
const cancelarVentaTs = funcionExportada(accion, 'cancelarVenta')
const despacharTs = funcionExportada(accionProveedor, 'despacharCotizacion')
const vista = bloque('view public.feedback_publico', 'revoke all on public.feedback_publico')
const crearFeedbackTs = accion.slice(accion.indexOf('export async function crearFeedback'))

describe('C-ELIGIBILIDAD y C-CREACION en schema.sql', () => {
  it('guarda una reseña por cotización, con calificación 1–5 y comentario de hasta 1000', () => {
    expect(schema).toContain('create table if not exists public.feedback')
    expect(schema).toContain('constraint feedback_cotizacion_id_key unique (cotizacion_id)')
    expect(schema).toContain('calificacion   smallint not null check (calificacion between 1 and 5)')
    expect(schema).toContain('comentario     text check (comentario is null or char_length(comentario) <= 1000)')
    expect(schema).toContain('create index if not exists idx_feedback_proveedor_fecha')
    expect(schema).toContain('create index if not exists idx_feedback_comprador')
  })

  it('solo el comprador autenticado de una cotización recibida puede crear la reseña', () => {
    expect(crearFeedback).toContain("raise exception 'FEEDBACK_NO_AUTENTICADO'")
    expect(crearFeedback).toContain('if auth.uid() is null then')
    expect(crearFeedback).toContain("raise exception 'FEEDBACK_NO_ELEGIBLE'")
    expect(crearFeedback).toContain(
      "v_comprador_id is distinct from auth.uid() or v_estado is distinct from 'recibida'"
    )
    expect(crearFeedback).not.toMatch(/user_id = auth\.uid\(\)/)
    for (const estado of ['pendiente', 'respondida', 'aceptada', 'rechazada', 'despachada', 'cancelada']) {
      expect(crearFeedback).not.toContain(`'${estado}'`)
    }
  })

  it('deriva comprador y proveedor de la cotización y rechaza el duplicado', () => {
    expect(crearFeedback).not.toMatch(/p_comprador_id|p_proveedor_id/)
    expect(crearFeedback).toContain(
      'insert into public.feedback(cotizacion_id, comprador_id, proveedor_id, calificacion, comentario)'
    )
    expect(crearFeedback).toContain(
      'values (p_cotizacion_id, v_comprador_id, v_proveedor_id, p_calificacion, p_comentario)'
    )
    expect(crearFeedback).toContain("raise exception 'FEEDBACK_DUPLICADO'")
    expect(crearFeedback).toContain('when unique_violation then')
    expect(crearFeedback).toContain("raise exception 'FEEDBACK_VALIDACION'")
  })

  it('no ofrece políticas de escritura directa y limita la lectura de la tabla a las columnas públicas', () => {
    expect(schema).toContain('alter table public.feedback enable row level security;')
    expect(schema).toContain('create policy "feedback: lectura publica"')
    expect(schema).not.toContain('create policy "feedback: comprador consulta la suya"')
    expect(schema).not.toMatch(/on public\.feedback for insert/)
    expect(schema).not.toMatch(/on public\.feedback for update/)
    expect(schema).not.toMatch(/on public\.feedback for delete/)
    expect(schema).toContain('revoke all on public.feedback from anon, authenticated;')
    expect(schema).toContain(
      'revoke execute on function public.crear_feedback(uuid, integer, text) from public, anon;'
    )
    expect(schema).toContain(
      'grant execute on function public.crear_feedback(uuid, integer, text) to authenticated;'
    )
  })

  it('la acción de aplicación acepta solo cotizacionId, calificacion y comentario', () => {
    expect(crearFeedbackTs).toContain('cotizacionId: string')
    expect(crearFeedbackTs).toContain('calificacion: number')
    expect(crearFeedbackTs).toContain('comentario?: string')
    expect(crearFeedbackTs).not.toMatch(/comprador_id|proveedor_id/)
    expect(crearFeedbackTs).toContain("return { error: 'FEEDBACK_NO_AUTENTICADO' }")
    expect(crearFeedbackTs).toContain("return { error: 'FEEDBACK_VALIDACION' }")
    expect(crearFeedbackTs).toContain(
      'FEEDBACK_(?:DUPLICADO|NO_ELEGIBLE|VALIDACION|NO_AUTENTICADO)'
    )
  })

  it('los códigos estables del SQL están traducidos en el formulario', () => {
    for (const code of [
      'FEEDBACK_NO_AUTENTICADO',
      'FEEDBACK_NO_ELEGIBLE',
      'FEEDBACK_DUPLICADO',
      'FEEDBACK_VALIDACION',
    ]) {
      expect(crearFeedback).toContain(code)
      expect(crearFeedbackTs).toContain(code.replace("FEEDBACK_", "")) // la acción los reconoce con una regex
      expect(formulario).toContain(code)
    }
    expect(formulario).toContain('FEEDBACK_ERROR')
  })
})

describe('C-LECTURA — superficie pública', () => {
  it('la vista publica solo reseña y autor anonimizado, con los permisos de quien consulta', () => {
    expect(vista).toContain('security_invoker = true')
    expect(vista).toContain('security_barrier = true')
    expect(vista).toContain('id, proveedor_id, calificacion, comentario, created_at')
    expect(vista).toContain("'Comprador verificado'::text as autor_anonimo")
    expect(vista).not.toMatch(/comprador_id|email|telefono|correo/)
    expect(schema).toContain('revoke all on public.feedback_publico from public, anon, authenticated;')
    expect(schema).toContain('grant select on public.feedback_publico to anon, authenticated;')
  })

  it('comprador_id no es legible por ningún rol de la API: solo hay permisos por columna', () => {
    expect(schema).toContain(
      'grant select (id, proveedor_id, calificacion, comentario, created_at) on public.feedback to anon;'
    )
    expect(schema).toContain(
      'grant select (id, proveedor_id, calificacion, comentario, created_at, cotizacion_id) on public.feedback to authenticated;'
    )
    expect(schema).not.toMatch(/grant select on public\.feedback to/)
    expect(schema).not.toMatch(/grant select \([^)]*comprador_id[^)]*\) on public\.feedback/)
    expect(schema).toContain('create policy "feedback: lectura publica"')
  })
})

describe('C-RECEPCION — el estado recibida solo sale del servidor', () => {
  it('no hay política para que el cliente actualice cotizaciones', () => {
    expect(schema).toContain('drop policy if exists "cotizaciones: proveedor actualiza estado"')
    expect(schema).not.toMatch(/create policy "cotizaciones: proveedor actualiza estado"/)
    expect(schema).not.toMatch(/on public\.cotizaciones for update/)
  })

  it('despachar avanza de aceptada a despachada y confirmar solo desde despachada', () => {
    expect(despachar).toContain("set estado = 'despachada'")
    expect(despachar).toContain("and c.estado = 'aceptada'")
    expect(despachar).not.toContain("'recibida'")
    expect(confirmar).toContain("v_estado is distinct from 'despachada'")
    expect(confirmar).toContain("set estado = 'recibida'")
    expect(confirmar).not.toMatch(/p_estado/)
    expect(schema).toMatch(
      /grant execute on function public\.confirmar_recepcion\(uuid\)\s+to authenticated;/
    )
    expect(schema).toMatch(
      /grant execute on function public\.despachar_cotizacion\(uuid\)\s+to authenticated;/
    )
  })
})

describe('C-CANCELACION — RPC cancelar_venta sin UPDATE de la aplicación', () => {
  it('cancelarVenta autentica, llama al RPC con p_cotizacion_id, revalida y propaga el error', () => {
    expect(cancelarVentaTs).toContain("if (!user) redirect('/login')")
    expect(cancelarVentaTs).toContain("supabase.rpc('cancelar_venta'")
    expect(cancelarVentaTs).toContain('p_cotizacion_id: cotizacionId')
    expect(cancelarVentaTs).toContain('return { error: error.message }')
    expect(cancelarVentaTs).toContain("revalidatePath('/proveedor/pedidos')")
    expect(cancelarVentaTs).toContain("revalidatePath('/mis-cotizaciones')")
    expect(cancelarVentaTs).not.toMatch(/\.update\s*\(/)
    expect(cancelarVentaTs).not.toMatch(/\.from\(\s*['"]cotizaciones['"]\s*\)/)
    expect(cancelarVentaTs).not.toMatch(/\.from\(\s*['"]productos['"]\s*\)/)
  })

  it('despacharCotizacion conserva el RPC y propaga el error sin UPDATE directo', () => {
    expect(despacharTs).toContain("supabase.rpc('despachar_cotizacion'")
    expect(despacharTs).toContain('p_cotizacion_id: cotizacionId')
    expect(despacharTs).toContain('return { error: error.message }')
    expect(despacharTs).toContain("revalidatePath('/proveedor/pedidos')")
    expect(despacharTs).toContain("revalidatePath('/mis-cotizaciones')")
    expect(despacharTs).not.toMatch(/\.update\s*\(/)
    expect(despacharTs).not.toMatch(/\.from\(\s*['"]cotizaciones['"]\s*\)/)
    expect(despacharTs).not.toMatch(/\.from\(\s*['"]productos['"]\s*\)/)
  })

  it('el comprador cancela desde aceptada y el proveedor desde aceptada o despachada', () => {
    expect(cancelar).toContain("when p.user_id = auth.uid() then 'proveedor'")
    expect(cancelar).toContain("when c.comprador_id = auth.uid() then 'comprador'")
    expect(cancelar).toContain("v_actor = 'comprador' and v_estado is distinct from 'aceptada'")
    expect(cancelar).toContain("Solo puedes cancelar antes de que el proveedor despache.")
    expect(cancelar).toContain("v_actor = 'proveedor' and v_estado not in ('aceptada', 'despachada')")
    expect(cancelar).toContain('Esta venta ya no se puede cancelar.')
    expect(cancelar).toContain("set estado = 'cancelada'")
    expect(cancelar).toContain('cancelada_por = v_actor')
    expect(cancelar).not.toMatch(/p_estado/)
    expect(schema).not.toMatch(/on public\.cotizaciones for update/)
    expect(schema).toMatch(
      /revoke execute on function public\.cancelar_venta\(uuid\)\s+from public, anon;/
    )
    expect(schema).toMatch(
      /grant execute on function public\.cancelar_venta\(uuid\)\s+to authenticated;/
    )
  })
})

describe('C-CANTIDAD CONFIRMADA — transiciones y detalle', () => {
  it('las transiciones consumen y liberan la cantidad confirmada con fallback a la pedida', () => {
    for (const fuente of [schema, migracionCantidadConfirmada]) {
      const recepcion = bloqueFuente(
        fuente,
        'function public.confirmar_recepcion',
        '$$;'
      )
      const cancelarConMotivo = bloqueFuente(
        fuente,
        'function public.cancelar_venta(p_cotizacion_id uuid, p_cancelada_motivo text)',
        '$$;'
      )
      const cancelarSinMotivo = bloqueFuente(
        fuente,
        'function public.cancelar_venta(p_cotizacion_id uuid)',
        '$$;'
      )

      expect(recepcion).toContain('sum(coalesce(i.cantidad_confirmada, i.cantidad))')
      expect(cancelarConMotivo).toContain('sum(coalesce(i.cantidad_confirmada, i.cantidad))')
      expect(cancelarSinMotivo).toContain("raise exception 'Indica un motivo válido para cancelar.'")
      expect(cancelarSinMotivo).not.toMatch(/stock|productos|set_config/i)
    }
  })

  it('el detalle incluye cantidad_confirmada y el check limita las líneas aceptadas', () => {
    for (const fuente of [schema, migracionCantidadConfirmada]) {
      const detalle = bloqueFuente(
        fuente,
        'function public.get_cotizacion_detalle',
        '$$;'
      )
      expect(detalle).toContain("'cantidad_confirmada', i.cantidad_confirmada")
    }

    expect(checkCantidadConfirmada).toContain(
      "c.estado in ('aceptada', 'despachada', 'recibida')"
    )
    expect(checkCantidadConfirmada).toContain('i.cantidad_confirmada > i.cantidad')
    expect(checkCantidadConfirmada).toContain('raise exception')
  })
})
