import { PDFDocument, StandardFonts } from 'pdf-lib'
import { lineasComprobante, type DatosComprobante } from '@/lib/comprobante-pdf'
import { createClient } from '@/lib/supabase/server'

type DetalleComprobante = Omit<DatosComprobante, 'items'> & {
  id: string
  estado: string
  comprador_id: string
  items: Array<DatosComprobante['items'][number] & {
    producto: ({ nombre: string; itbis_incluido?: boolean | null } | null)
    itbis_incluido?: boolean | null
  }>
}

function respuestaError(status: number): Response {
  return new Response(null, { status })
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return respuestaError(401)

  const { data, error } = await supabase.rpc('get_cotizacion_detalle', {
    p_cotizacion_id: id,
  })

  if (error) {
    if (/COTIZACION_NO_AUTORIZADA/i.test(error.message) || /invalid input syntax for type uuid/i.test(error.message)) {
      return respuestaError(404)
    }
    return respuestaError(500)
  }
  if (!data) return respuestaError(404)

  const detalle = data as DetalleComprobante
  if (!['aceptada', 'despachada', 'recibida'].includes(detalle.estado)) {
    return respuestaError(404)
  }

  const numero = `COT-${String(detalle.numero).padStart(6, '0')}`
  const documento = await PDFDocument.create()
  documento.setTitle(`Cotización aceptada #${numero}`)
  const fuente = await documento.embedFont(StandardFonts.Helvetica)
  const negrita = await documento.embedFont(StandardFonts.HelveticaBold)
  let pagina = documento.addPage([612, 792])
  let y = 744

  const lineas = lineasComprobante({
    ...detalle,
    items: detalle.items.map((item) => ({
      ...item,
      itbis_incluido: item.producto?.itbis_incluido ?? item.itbis_incluido ?? null,
    })),
  })
  for (const linea of lineas.flatMap((texto) => texto.split(/\r\n|\r|\n/))) {
    if (y < 48) {
      pagina = documento.addPage([612, 792])
      y = 744
    }
    const esTitulo = linea.startsWith('Cotización aceptada #')
    const esSeccion = ['Proveedor', 'Comprador', 'Detalle'].includes(linea)
    const texto = linea.replace(/\t/g, ' ') || ' '
    const font = esTitulo || esSeccion ? negrita : fuente
    const caracteres = font.getCharacterSet()
    const size = esTitulo ? 16 : esSeccion ? 12 : 10
    const max = 548
    const textoSeguro = Array.from(texto, (caracter) => {
      const codigo = caracter.codePointAt(0)
      return codigo != null && caracteres.includes(codigo) ? caracter : '?'
    }).join('')
    const palabras = textoSeguro.split(' ')
    let fragmento = ''
    const renglones: string[] = []
    for (const palabra of palabras) {
      const candidato = fragmento ? `${fragmento} ${palabra}` : palabra
      if (fragmento && font.widthOfTextAtSize(candidato, size) > max) {
        renglones.push(fragmento)
        fragmento = palabra
      } else {
        fragmento = candidato
      }
    }
    if (fragmento) renglones.push(fragmento)
    for (const r of renglones) {
      if (y < 48) {
        pagina = documento.addPage([612, 792])
        y = 744
      }
      pagina.drawText(r, { x: 32, y, size, font })
      y -= size + 7
    }
  }

  const bytes = await documento.save()
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="comprobante-${numero}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
