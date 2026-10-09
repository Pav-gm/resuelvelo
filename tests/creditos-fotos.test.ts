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

  it('cada crédito apunta a un archivo que existe y la migración asigna los mismos', () => {
    const migraciones = join(process.cwd(), 'supabase/migrations')
    // Por nombre, sin la versión: el servidor puede renumerar la migración.
    const sql = readFileSync(join(migraciones, readdirSync(migraciones).find((f) => f.endsWith('_fotos_productos_seed.sql'))!), 'utf8')
    for (const [id, c] of Object.entries(creditos as Record<string, { archivo: string; autor: string }>)) {
      expect(readdirSync(join(process.cwd(), 'public/productos'))).toContain(`${id}.jpg`)
      expect(c.autor.length).toBeGreaterThan(0)
      expect(sql).toContain(`('${id}'::uuid, '/productos/${id}.jpg')`)
    }
  })
})
