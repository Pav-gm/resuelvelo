import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import { actualizarProducto, crearProducto } from '@/app/(marketplace)/proveedor/actions'

function productoFormData(id?: string): FormData {
  const formData = new FormData()
  if (id) formData.set('id', id)
  formData.set('nombre', 'Tubo PVC')
  formData.set('precio', '0')
  formData.set('unidad', 'unidad')
  formData.set('stock', '5')
  formData.set('categoria_id', 'cat-1')
  formData.set('subcategoria_id', 'sub-1')
  return formData
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('acciones de producto', () => {
  it('crearProducto rechaza precio 0 con el mensaje acordado antes de consultar Supabase', async () => {
    await expect(crearProducto(null, productoFormData())).resolves.toEqual({
      error: 'El precio debe ser mayor que cero.',
    })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('actualizarProducto rechaza precio 0 con el mensaje acordado antes de consultar Supabase', async () => {
    await expect(actualizarProducto(null, productoFormData('prod-1'))).resolves.toEqual({
      error: 'El precio debe ser mayor que cero.',
    })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
})
