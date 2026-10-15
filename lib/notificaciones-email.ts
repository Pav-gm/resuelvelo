import { enviarEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'

export type TipoNotificacionEmail =
  | 'nueva_solicitud'
  | 'cotizacion_respondida'
  | 'cotizacion_aceptada'
  | 'cotizacion_rechazada'
  | 'cotizacion_despachada'
  | 'cotizacion_recibida'
  | 'cotizacion_cancelada'

type DatosNotificacion = {
  destinatario_email: string | null
  contraparte_nombre: string | null
  numero: number | string | null
  total_estimado: number | string | null
}

const MENSAJES: Record<TipoNotificacionEmail, { asunto: string; mensaje: string }> = {
  nueva_solicitud: { asunto: 'Nueva solicitud de cotización', mensaje: 'Recibiste una nueva solicitud de cotización.' },
  cotizacion_respondida: { asunto: 'Recibiste una oferta', mensaje: 'El proveedor respondió a tu solicitud con una oferta.' },
  cotizacion_aceptada: { asunto: 'Cotización aceptada', mensaje: 'La cotización fue aceptada.' },
  cotizacion_rechazada: { asunto: 'Cotización rechazada', mensaje: 'La cotización fue rechazada.' },
  cotizacion_despachada: { asunto: 'Pedido despachado', mensaje: 'Tu pedido fue despachado.' },
  cotizacion_recibida: { asunto: 'Recepción confirmada', mensaje: 'El comprador confirmó la recepción del pedido.' },
  cotizacion_cancelada: { asunto: 'Cotización cancelada', mensaje: 'La cotización fue cancelada.' },
}

function escaparHtml(valor: string): string {
  return valor.replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[caracter]!)
}

export async function enviarNotificacionCotizacionEmail(
  cotizacionId: string,
  tipo: TipoNotificacionEmail
): Promise<void> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('datos_email_notificacion_cotizacion', {
      p_cotizacion_id: cotizacionId,
      p_tipo: tipo,
    })

    if (error) {
      console.error('No se pudieron consultar los datos del correo de cotización.', error)
      return
    }

    const fila = (Array.isArray(data) ? data[0] : data) as DatosNotificacion | null
    if (
      !fila ||
      typeof fila.destinatario_email !== 'string' || !fila.destinatario_email.trim() ||
      typeof fila.contraparte_nombre !== 'string' || !fila.contraparte_nombre.trim() ||
      fila.numero === null || fila.numero === undefined || !Number.isFinite(Number(fila.numero)) ||
      (fila.total_estimado !== null && (fila.total_estimado === undefined || !Number.isFinite(Number(fila.total_estimado))))
    ) {
      console.error('Los datos del correo de cotización están incompletos.')
      return
    }

    const numero = escaparHtml(`#COT-${String(fila.numero).padStart(6, '0')}`)
    const contraparte = escaparHtml(fila.contraparte_nombre)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '')
    const enlace = escaparHtml(`${baseUrl || ''}/cotizaciones/${cotizacionId}`)
    const mensaje = MENSAJES[tipo]
    const total = fila.total_estimado === null
      ? ''
      : `<p>Total estimado: ${escaparHtml(String(fila.total_estimado))}</p>`
    const html = `<p>${escaparHtml(mensaje.mensaje)}</p><p>Cotización: ${numero}</p><p>Contraparte: ${contraparte}</p>${total}<p><a href="${enlace}">Ver cotización</a></p>`

    await enviarEmail({
      to: fila.destinatario_email,
      subject: `${mensaje.asunto} ${numero}`,
      html,
    })
  } catch (error) {
    console.error('No se pudo preparar el correo de cotización.', error)
  }
}
