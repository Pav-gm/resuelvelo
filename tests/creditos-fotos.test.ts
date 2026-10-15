import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import creditos from '@/public/productos/creditos.json'
import { creditoFoto } from '@/lib/creditos-fotos'

const ID = 'd0000000-0000-0000-0000-000000000001'

describe('fotos del catálogo', () => {
  it('da el crédito solo cuando la imagen es la foto de catálogo', () => {
    expect(creditoFoto(ID, `/productos/${ID}.jpg`)).toMatchObject({ licencia: 'CC BY 3.0' })
    expect(creditoFoto(ID, 'https://otra.example/foto.jpg')).toBeNull()
    expect(creditoFoto(ID, null)).toBeNull()
    expect(creditoFoto('00000000-0000-0000-0000-000000000000', '/productos/x.jpg')).toBeNull()
  })

  it('acredita la foto también en otro producto que la reutiliza', () => {
    const otroProducto = 'd0000000-0000-0000-0000-000000000091'
    expect(creditoFoto(otroProducto, `/productos/${ID}.jpg`)).toMatchObject({ licencia: 'CC BY 3.0', archivo: `/productos/${ID}.jpg` })
    expect(creditoFoto(otroProducto, `/productos/${otroProducto}.svg`)).toBeNull()
  })

  it('cada crédito apunta a un archivo que existe y la migración asigna los mismos', () => {
    const migraciones = join(process.cwd(), 'supabase/migrations')
    // Por nombre, sin la versión: el servidor puede renumerar la migración.
    const sql = readFileSync(join(migraciones, readdirSync(migraciones).find((f) => f.endsWith('_fotos_productos_seed.sql'))!), 'utf8')
    // `creditos.json` también declara las imágenes de relleno generadas localmente
    // bajo la clave `_generados`: no son fotos con licencia externa ni archivos `.jpg`.
    const fotos = Object.entries(creditos as Record<string, { archivo: string; autor: string }>)
      .filter(([id]) => id.startsWith('d0000000-'))
    for (const [id, c] of fotos) {
      expect(readdirSync(join(process.cwd(), 'public/productos'))).toContain(`${id}.jpg`)
      expect(c.autor.length).toBeGreaterThan(0)
      expect(sql).toContain(`('${id}'::uuid, '/productos/${id}.jpg')`)
    }
  })
})
