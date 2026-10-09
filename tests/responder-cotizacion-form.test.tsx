/**
 * Formulario de oferta del proveedor: valores iniciales (precio de catálogo,
 * cantidades sujetas a disponibilidad, validez a siete días), payload enviado,
 * precio de catálogo, validaciones en español, error del servidor y rechazo
 * con motivo obligatorio. Se usa un reloj controlado y acciones simuladas.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ItemCotizacion, Producto } from '@/types'

const h = vi.hoisted(() => ({
  ofertarCotizacion: vi.fn(),
  rechazarCotizacionConMotivo: vi.fn(),
}))

vi.mock('@/app/(marketplace)/proveedor/actions', () => ({
  ofertarCotizacion: h.ofertarCotizacion,
  rechazarCotizacionConMotivo: h.rechazarCotizacionConMotivo,
}))

import ResponderCotizacionButton from '@/components/marketplace/ResponderCotizacionButton'

function item(overrides: Partial<ItemCotizacion> = {}): ItemCotizacion {
  return {
    id: 'item-1',
    cotizacion_id: 'cot-1',
    producto_id: 'prod-1',
    cantidad: 1,
    sujeta_disponibilidad: false,
    stock_al_cotizar: null,
    ...overrides,
  }
}

function producto(nombre: string, precio: number): Producto {
  return { nombre, precio } as Producto
}

beforeEach(() => {
  vi.setSystemTime(new Date('2026-10-08T12:00:00.000Z'))
  h.ofertarCotizacion.mockReset()
  h.rechazarCotizacionConMotivo.mockReset()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('ResponderCotizacionButton — formulario de oferta', () => {
  it('precarga el precio actual y la validez de siete días en el formulario de oferta', () => {
    const items: ItemCotizacion[] = [
      item({ id: 'item-1', cantidad: 3, precio_unitario: 12, producto: producto('Tubo PVC', 15) }),
    ]

    render(<ResponderCotizacionButton cotizacionId="cot-1" items={items} />)
    fireEvent.click(screen.getByRole('button', { name: 'Responder con oferta' }))

    expect(screen.getByLabelText('Precio unitario de Tubo PVC')).toHaveValue(15)
    expect(screen.getByLabelText('Plazo de entrega en días')).toHaveValue(null)
    expect(screen.getByLabelText('Válida hasta')).toHaveValue('2026-10-15')
    expect(screen.getByLabelText('Condiciones')).toHaveValue('')
  })

  it('envía precios y cantidades junto con los términos de la oferta', async () => {
    h.ofertarCotizacion.mockResolvedValue(null)
    const items: ItemCotizacion[] = [
      item({
        id: 'item-1',
        cantidad: 3,
        precio_unitario: 10,
        sujeta_disponibilidad: true,
        stock_al_cotizar: 2,
        producto: producto('Tubo PVC', 15),
      }),
      item({ id: 'item-2', producto_id: 'prod-2', cantidad: 1, producto: producto('Cemento', 8) }),
    ]

    render(<ResponderCotizacionButton cotizacionId="cot-1" items={items} />)
    fireEvent.click(screen.getByRole('button', { name: 'Responder con oferta' }))

    fireEvent.change(screen.getByLabelText('Precio unitario de Tubo PVC'), { target: { value: '14' } })
    fireEvent.change(screen.getByLabelText('Cantidad de Tubo PVC'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Plazo de entrega en días'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Válida hasta'), { target: { value: '2026-10-20' } })
    fireEvent.change(screen.getByLabelText('Condiciones'), { target: { value: 'Entrega en almacén.' } })

    fireEvent.click(screen.getByRole('button', { name: 'Enviar oferta' }))

    await waitFor(() => {
      expect(h.ofertarCotizacion).toHaveBeenCalledWith('cot-1', {
        lineas: [
          { itemId: 'item-1', precioUnitario: 14, cantidadOfertada: 1 },
          { itemId: 'item-2', precioUnitario: 8, cantidadOfertada: null },
        ],
        plazoDias: 5,
        validaHasta: '2026-10-20',
        condiciones: 'Entrega en almacén.',
      })
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('aceptar al precio de catálogo usa los precios actuales y conserva los términos del formulario', async () => {
    h.ofertarCotizacion.mockResolvedValue(null)
    const items: ItemCotizacion[] = [
      item({ id: 'item-1', cantidad: 3, producto: producto('Tubo PVC', 15) }),
    ]

    render(<ResponderCotizacionButton cotizacionId="cot-1" items={items} />)
    fireEvent.click(screen.getByRole('button', { name: 'Responder con oferta' }))

    fireEvent.change(screen.getByLabelText('Precio unitario de Tubo PVC'), { target: { value: '9' } })
    fireEvent.change(screen.getByLabelText('Plazo de entrega en días'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Válida hasta'), { target: { value: '2026-10-20' } })
    fireEvent.change(screen.getByLabelText('Condiciones'), { target: { value: 'Entrega en almacén.' } })

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar al precio de catálogo' }))

    await waitFor(() => {
      expect(h.ofertarCotizacion).toHaveBeenCalledWith('cot-1', {
        lineas: [{ itemId: 'item-1', precioUnitario: 15, cantidadOfertada: null }],
        plazoDias: 5,
        validaHasta: '2026-10-20',
        condiciones: 'Entrega en almacén.',
      })
    })
  })

  it('muestra errores en español para precio, plazo y validez sin enviar la oferta', () => {
    const items: ItemCotizacion[] = [
      item({ id: 'item-1', cantidad: 3, producto: producto('Tubo PVC', 15) }),
    ]

    render(<ResponderCotizacionButton cotizacionId="cot-1" items={items} />)
    fireEvent.click(screen.getByRole('button', { name: 'Responder con oferta' }))

    fireEvent.change(screen.getByLabelText('Precio unitario de Tubo PVC'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Plazo de entrega en días'), { target: { value: '91' } })
    fireEvent.change(screen.getByLabelText('Válida hasta'), { target: { value: '2026-10-08' } })

    fireEvent.click(screen.getByRole('button', { name: 'Enviar oferta' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Indica el precio')

    fireEvent.change(screen.getByLabelText('Precio unitario de Tubo PVC'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar oferta' }))
    expect(screen.getByRole('alert')).toHaveTextContent('El plazo debe estar entre 0 y 90 días.')

    fireEvent.change(screen.getByLabelText('Plazo de entrega en días'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar oferta' }))
    expect(screen.getByRole('alert')).toHaveTextContent('La fecha de validez debe ser futura.')

    expect(h.ofertarCotizacion).not.toHaveBeenCalled()
  })

  it('rechaza una cotización con motivo obligatorio', async () => {
    h.rechazarCotizacionConMotivo.mockResolvedValue(null)
    const items: ItemCotizacion[] = [item({ id: 'item-1', producto: producto('Tubo PVC', 15) })]

    render(<ResponderCotizacionButton cotizacionId="cot-1" items={items} />)
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))

    expect(screen.getByRole('dialog', { name: 'Rechazar cotización' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar rechazo' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Escribe el motivo del rechazo.')
    expect(h.rechazarCotizacionConMotivo).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Motivo del rechazo'), {
      target: { value: 'No puedo abastecer este producto.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar rechazo' }))

    await waitFor(() => {
      expect(h.rechazarCotizacionConMotivo).toHaveBeenCalledWith(
        'cot-1',
        'No puedo abastecer este producto.'
      )
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('muestra el error de cantidad cuando el campo está vacío y no envía la oferta', () => {
    const items: ItemCotizacion[] = [
      item({
        id: 'item-1',
        cantidad: 3,
        sujeta_disponibilidad: true,
        producto: producto('Tubo PVC', 15),
      }),
    ]

    render(<ResponderCotizacionButton cotizacionId="cot-1" items={items} />)
    fireEvent.click(screen.getByRole('button', { name: 'Responder con oferta' }))

    fireEvent.change(screen.getByLabelText('Plazo de entrega en días'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Válida hasta'), { target: { value: '2026-10-20' } })
    fireEvent.change(screen.getByLabelText('Cantidad de Tubo PVC'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar oferta' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Indica cuántas unidades confirmas')
    expect(h.ofertarCotizacion).not.toHaveBeenCalled()
  })

  it('muestra el error de precio cuando el campo está vacío y no envía la oferta', () => {
    const items: ItemCotizacion[] = [
      item({ id: 'item-1', cantidad: 3, producto: producto('Tubo PVC', 15) }),
    ]

    render(<ResponderCotizacionButton cotizacionId="cot-1" items={items} />)
    fireEvent.click(screen.getByRole('button', { name: 'Responder con oferta' }))

    fireEvent.change(screen.getByLabelText('Precio unitario de Tubo PVC'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar oferta' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Indica el precio')
    expect(h.ofertarCotizacion).not.toHaveBeenCalled()
  })

  it('desactiva el envío e indica que se rechace cuando todas las cantidades son cero', () => {
    const items: ItemCotizacion[] = [
      item({
        id: 'item-1',
        cantidad: 3,
        sujeta_disponibilidad: true,
        producto: producto('Tubo PVC', 15),
      }),
    ]

    render(<ResponderCotizacionButton cotizacionId="cot-1" items={items} />)
    fireEvent.click(screen.getByRole('button', { name: 'Responder con oferta' }))

    fireEvent.change(screen.getByLabelText('Cantidad de Tubo PVC'), { target: { value: '0' } })

    expect(
      screen.getByText('Si no puedes servir nada, rechaza la cotización')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar oferta' })).toBeDisabled()
    expect(h.ofertarCotizacion).not.toHaveBeenCalled()
  })

  it('permite cantidad cero en una línea cuando otra conserva unidades', async () => {
    h.ofertarCotizacion.mockResolvedValue(null)
    const items: ItemCotizacion[] = [
      item({
        id: 'item-1',
        cantidad: 3,
        sujeta_disponibilidad: true,
        producto: producto('Tubo PVC', 15),
      }),
      item({
        id: 'item-2',
        producto_id: 'prod-2',
        cantidad: 2,
        sujeta_disponibilidad: true,
        producto: producto('Cemento', 8),
      }),
    ]

    render(<ResponderCotizacionButton cotizacionId="cot-1" items={items} />)
    fireEvent.click(screen.getByRole('button', { name: 'Responder con oferta' }))

    fireEvent.change(screen.getByLabelText('Cantidad de Tubo PVC'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Cantidad de Cemento'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Plazo de entrega en días'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Válida hasta'), { target: { value: '2026-10-20' } })

    expect(screen.getByRole('button', { name: 'Enviar oferta' })).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar oferta' }))

    await waitFor(() => {
      expect(h.ofertarCotizacion).toHaveBeenCalledWith('cot-1', {
        lineas: [
          { itemId: 'item-1', precioUnitario: 15, cantidadOfertada: 0 },
          { itemId: 'item-2', precioUnitario: 8, cantidadOfertada: 1 },
        ],
        plazoDias: 5,
        validaHasta: '2026-10-20',
        condiciones: null,
      })
    })
  })

  it('muestra el error de oferta del servidor y conserva el diálogo abierto', async () => {
    h.ofertarCotizacion.mockResolvedValue({ error: 'La cotización ya no está pendiente.' })
    const items: ItemCotizacion[] = [
      item({ id: 'item-1', cantidad: 3, producto: producto('Tubo PVC', 15) }),
    ]

    render(<ResponderCotizacionButton cotizacionId="cot-1" items={items} />)
    fireEvent.click(screen.getByRole('button', { name: 'Responder con oferta' }))
    fireEvent.change(screen.getByLabelText('Plazo de entrega en días'), { target: { value: '5' } })

    fireEvent.click(screen.getByRole('button', { name: 'Enviar oferta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La cotización ya no está pendiente.'
    )
    expect(screen.getByRole('dialog', { name: 'Responder con oferta' })).toBeInTheDocument()
  })
})
