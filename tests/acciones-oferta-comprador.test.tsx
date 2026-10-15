/**
 * AccionesOfertaComprador: la aceptación pide confirmación con proveedor y
 * total, «Volver» no acepta, «Confirmar aceptación» ejecuta la acción una vez
 * y el rechazo sigue exigiendo un motivo.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const h = vi.hoisted(() => ({
  aceptarOfertaCotizacion: vi.fn(),
  rechazarOfertaCotizacion: vi.fn(),
  solicitarNuevaOferta: vi.fn(),
}))

vi.mock('@/app/(marketplace)/cotizaciones/actions', () => ({
  aceptarOfertaCotizacion: h.aceptarOfertaCotizacion,
  rechazarOfertaCotizacion: h.rechazarOfertaCotizacion,
  solicitarNuevaOferta: h.solicitarNuevaOferta,
}))

import AccionesOfertaComprador from '@/components/marketplace/AccionesOfertaComprador'

const confirmacion = '¿Aceptar la oferta de Promeria por RD$ 46.00?'

beforeEach(() => {
  vi.clearAllMocks()
  h.aceptarOfertaCotizacion.mockResolvedValue({ error: null })
  h.rechazarOfertaCotizacion.mockResolvedValue({ error: null })
  h.solicitarNuevaOferta.mockResolvedValue({ error: null })
})

afterEach(() => {
  cleanup()
})

describe('AccionesOfertaComprador — decisión del comprador', () => {
  it('el comprador confirma o cancela la aceptación desde el detalle', async () => {
    render(
      <AccionesOfertaComprador
        cotizacionId="cot-1"
        proveedorNombre="Promeria"
        totalOfertado={46}
        vencida={false}
      />
    )

    // Aceptar abre la confirmación exacta y no ejecuta la acción todavía.
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar oferta' }))
    expect(screen.getByText(confirmacion)).toBeInTheDocument()
    expect(h.aceptarOfertaCotizacion).not.toHaveBeenCalled()

    // Volver cierra el diálogo sin aceptar ni alterar la oferta.
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.queryByText(confirmacion)).toBeNull()
    expect(h.aceptarOfertaCotizacion).not.toHaveBeenCalled()

    // Confirmar acepta la oferta una única vez.
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar oferta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aceptación' }))
    await waitFor(() => expect(h.aceptarOfertaCotizacion).toHaveBeenCalledWith('cot-1'))
    expect(h.aceptarOfertaCotizacion).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByText(confirmacion)).toBeNull())

    // El rechazo sigue pidiendo motivo y no confirma sin él.
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar oferta' }))
    expect(screen.getByRole('dialog', { name: 'Motivo del rechazo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar rechazo' })).toBeDisabled()
    expect(h.rechazarOfertaCotizacion).not.toHaveBeenCalled()
  })
})
