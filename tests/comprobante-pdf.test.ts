import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import type { DatosComprobante } from '@/lib/comprobante-pdf'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))

import { GET } from '@/app/api/cotizaciones/[id]/pdf/route'
import { lineasComprobante } from '@/lib/comprobante-pdf'

const fixture: DatosComprobante = {
  numero: 42,
  aceptada_at: '2026-10-08T15:00:00.000Z',
  proveedor: {
    nombre_empresa: 'Ferretería Sol',
    rnc: '101234567',
    direccion: 'Calle 1',
    telefono: '8095550100',
  },
  comprador: {
    nombre: 'Ana Pérez',
    razon_social: 'Obras Pérez',
    rnc: '131234567',
    telefono: '8095550101',
  },
  plazo_dias: 5,
  valida_hasta: '2026-10-20',
  condiciones: 'Entrega en almacén',
  items: [{
    cantidad: 2,
    cantidad_confirmada: 2,
    precio_unitario: 118,
    precio_ofertado: null,
    producto: { nombre: 'Tubo PVC' },
    itbis_incluido: true,
  }],
}

function detalle(estado: string) {
  return {
    ...fixture,
    id: 'cot-1',
    estado,
    comprador_id: 'buyer-1',
  }
}

function solicitud() {
  return GET(new Request('http://localhost/api/cotizaciones/cot-1/pdf'), {
    params: Promise.resolve({ id: 'cot-1' }),
  })
}

describe('comprobante PDF de cotización', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      rpc: mocks.rpc,
    })
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'buyer-1' } }, error: null })
    mocks.rpc.mockResolvedValue({ data: detalle('aceptada'), error: null })
  })

  it('lineasComprobante incluye número, líneas, importes y leyenda informativa', () => {
    const lineas = lineasComprobante(fixture)
    const contenido = lineas.join('\n')
    expect(contenido).toContain('Resuélvelo')
    expect(contenido).toContain('Cotización aceptada #COT-000042')
    expect(contenido).toContain('Tubo PVC')
    expect(contenido).toContain('Cantidad: 2')
    expect(contenido).toContain('Subtotal línea: RD$ 236,00')
    expect(contenido).toContain('Subtotal general: RD$ 200,00')
    expect(contenido).toContain('ITBIS (18 %): RD$ 36,00')
    expect(contenido).toContain('Total: RD$ 236,00')
    expect(contenido).toContain('Plazo de entrega: 5 días')
    expect(contenido).toContain('Válida hasta: 20/10/2026')
    expect(contenido).toContain('Condiciones: Entrega en almacén')
    expect(contenido).toContain('Documento informativo. No es un comprobante fiscal (sin NCF) y no sustituye la factura del proveedor.')
  })

  it('GET del comprobante devuelve 401 sin sesión', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const response = await solicitud()
    expect(response.status).toBe(401)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('GET del comprobante devuelve 404 a terceros', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-3' } }, error: null })
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'COTIZACION_NO_AUTORIZADA' } })
    const response = await solicitud()
    expect(response.status).toBe(404)
  })

  it('GET del comprobante devuelve 404 para estados no permitidos', async () => {
    mocks.rpc.mockResolvedValue({ data: detalle('respondida'), error: null })
    const response = await solicitud()
    expect(response.status).toBe(404)
    expect(await response.arrayBuffer()).toHaveProperty('byteLength', 0)
  })

  it('GET del comprobante genera un PDF válido con el número en el título', async () => {
    const response = await solicitud()
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    const bytes = new Uint8Array(await response.arrayBuffer())
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getTitle()).toContain('COT-000042')
  })
})
