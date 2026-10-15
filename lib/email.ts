type EmailInput = { to: string; subject: string; html: string }

let avisoClaveAusenteRegistrado = false

export async function enviarEmail({ to, subject, html }: EmailInput): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    if (!avisoClaveAusenteRegistrado) {
      console.info('BREVO_API_KEY no está configurada; se omiten los correos transaccionales.')
      avisoClaveAusenteRegistrado = true
    }
    return
  }

  const remitente = process.env.EMAIL_FROM
  if (!remitente) {
    console.error('EMAIL_FROM no está configurado; no se pudo enviar el correo.')
    return
  }

  const coincidencia = /^\s*(.*?)\s*<\s*([^<>\s]+)\s*>\s*$/.exec(remitente)
  if (!coincidencia || !coincidencia[1].trim() || !coincidencia[2].trim()) {
    console.error('EMAIL_FROM debe tener el formato Nombre <correo>.')
    return
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: coincidencia[1].trim(), email: coincidencia[2].trim() },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    })

    if (!response.ok) {
      console.error(`Brevo rechazó el correo (HTTP ${response.status}).`)
    }
  } catch (error) {
    console.error('No se pudo enviar el correo a Brevo.', error)
  }
}
