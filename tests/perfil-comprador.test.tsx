/**
 * Tests de PerfilComprador: datos de empresa y contacto editables, guardado y
 * flujo completo de direcciones de obra con Server Actions simuladas.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  guardarPerfil: vi.fn(),
  crearDireccionObra: vi.fn(),
  actualizarDireccionObra: vi.fn(),
  eliminarDireccionObra: vi.fn(),
}))

vi.mock('@/app/(marketplace)/perfil/actions', () => ({
  guardarPerfil: h.guardarPerfil,
  crearDireccionObra: h.crearDireccionObra,
  actualizarDireccionObra: h.actualizarDireccionObra,
  eliminarDireccionObra: h.eliminarDireccionObra,
}))

import PerfilComprador from '@/components/marketplace/PerfilComprador'

const PERFIL = {
  nombre: 'Ana Pérez',
  razon_social: 'Obras Pérez',
  rnc: '123456789',
  telefono: '8095550101',
}

const DIRECCION = {
  id: 'dir-1',
  etiqueta: 'Obra Centro',
  direccion: 'Calle 1 #2',
  provincia: 'Santiago',
  municipio: 'Santiago de los Caballeros',
  referencia: null,
  es_principal: false,
}

beforeEach(() => {
  h.guardarPerfil.mockReset()
  h.guardarPerfil.mockResolvedValue({ error: null, success: true })
  h.crearDireccionObra.mockReset()
  h.crearDireccionObra.mockResolvedValue({ error: null, success: true })
  h.actualizarDireccionObra.mockReset()
  h.actualizarDireccionObra.mockResolvedValue({ error: null, success: true })
  h.eliminarDireccionObra.mockReset()
  h.eliminarDireccionObra.mockResolvedValue({ error: null, success: true })
})

afterEach(() => {
  cleanup()
})

describe('PerfilComprador', () => {
  it('muestra los datos editables y la dirección de obra cargada', () => {
    render(
      <PerfilComprador perfil={PERFIL} direcciones={[DIRECCION]} errorCargaDirecciones={null} />
    )

    expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument()

    const nombre = screen.getByLabelText('Nombre')
    const razonSocial = screen.getByLabelText('Razón social')
    const rnc = screen.getByLabelText('RNC')
    const telefono = screen.getByLabelText('Teléfono')

    expect(nombre).toHaveValue('Ana Pérez')
    expect(razonSocial).toHaveValue('Obras Pérez')
    expect(rnc).toHaveValue('123456789')
    expect(telefono).toHaveValue('8095550101')
    expect(nombre).not.toBeDisabled()
    expect(razonSocial).not.toBeDisabled()
    expect(rnc).not.toBeDisabled()
    expect(telefono).not.toBeDisabled()

    expect(screen.getByText('Obra Centro')).toBeInTheDocument()
    expect(screen.getByText('Calle 1 #2')).toBeInTheDocument()
    expect(screen.getByText('Santiago de los Caballeros, Santiago')).toBeInTheDocument()
  })

  it('guarda el perfil y muestra confirmación en español', async () => {
    render(
      <PerfilComprador
        perfil={{ nombre: 'Otro', razon_social: null, rnc: null, telefono: null }}
        direcciones={[]}
        errorCargaDirecciones={null}
      />
    )

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana Pérez' } })
    fireEvent.change(screen.getByLabelText('Razón social'), { target: { value: 'Obras Pérez' } })
    fireEvent.change(screen.getByLabelText('RNC'), { target: { value: '123456789' } })
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '8095550101' } })

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(h.guardarPerfil).toHaveBeenCalledWith({
        nombre: 'Ana Pérez',
        razon_social: 'Obras Pérez',
        rnc: '123456789',
        telefono: '8095550101',
      })
    )
    expect(await screen.findByText('Perfil actualizado.')).toBeInTheDocument()
  })

  it('permite añadir una dirección de obra y muestra la nueva dirección', async () => {
    render(<PerfilComprador perfil={PERFIL} direcciones={[]} errorCargaDirecciones={null} />)

    fireEvent.change(screen.getByLabelText('Etiqueta'), { target: { value: 'Obra Norte' } })
    fireEvent.change(screen.getByLabelText('Dirección'), { target: { value: 'Av. 2' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'Puerto Plata' } })
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'Portón azul' } })

    fireEvent.click(screen.getByRole('button', { name: 'Añadir dirección' }))

    await waitFor(() =>
      expect(h.crearDireccionObra).toHaveBeenCalledWith({
        etiqueta: 'Obra Norte',
        direccion: 'Av. 2',
        provincia: 'Puerto Plata',
        municipio: '',
        referencia: 'Portón azul',
        es_principal: false,
      })
    )
    expect(await screen.findByText('Dirección añadida.')).toBeInTheDocument()
    expect(screen.getByText('Obra Norte')).toBeInTheDocument()
    expect(screen.getByText('Av. 2')).toBeInTheDocument()
  })

  it('permite editar y quitar una dirección de obra', async () => {
    render(
      <PerfilComprador perfil={PERFIL} direcciones={[DIRECCION]} errorCargaDirecciones={null} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Editar Obra Centro' }))

    fireEvent.change(screen.getByLabelText('Etiqueta'), { target: { value: 'Obra Norte' } })
    fireEvent.change(screen.getByLabelText('Dirección'), { target: { value: 'Av. 2' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'Puerto Plata' } })
    fireEvent.change(screen.getByLabelText('Municipio'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: '' } })

    fireEvent.click(screen.getByRole('button', { name: 'Guardar dirección' }))

    await waitFor(() =>
      expect(h.actualizarDireccionObra).toHaveBeenCalledWith('dir-1', {
        etiqueta: 'Obra Norte',
        direccion: 'Av. 2',
        provincia: 'Puerto Plata',
        municipio: '',
        referencia: '',
        es_principal: false,
      })
    )

    fireEvent.click(screen.getByRole('button', { name: 'Quitar Obra Norte' }))

    await waitFor(() => expect(h.eliminarDireccionObra).toHaveBeenCalledWith('dir-1'))
    expect(await screen.findByText('Dirección eliminada.')).toBeInTheDocument()
    expect(screen.queryByText('Obra Norte')).toBeNull()
  })
})
