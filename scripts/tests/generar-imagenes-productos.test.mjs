import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SCRIPT = join(RAIZ, 'scripts', 'generar-imagenes-productos.mjs')

function ejecutar(argumentos) {
  return spawnSync(process.execPath, [SCRIPT, ...argumentos], {
    cwd: RAIZ,
    encoding: 'utf8',
    windowsHide: true,
  })
}

test('genera SVGs deterministas de 800 por 600 para productos sin imagen reutilizable', () => {
  const base = mkdtempSync(join(tmpdir(), 'imagenes-productos-'))
  try {
    const datos = join(base, 'filas.json')
    writeFileSync(
      datos,
      JSON.stringify([
        { id: '21', nombre: 'Pintura acrílica interior (cubo 5 galones)', categoria: 'ferreteria' },
        { id: '22', nombre: 'Panel solar monocristalino 550W', categoria: 'electricidad' },
      ]),
      'utf8'
    )
    const salida = join(base, 'salida')
    const argumentos = ['--salida', salida, '--datos', datos]

    const primera = ejecutar(argumentos)
    assert.equal(primera.status, 0, primera.stderr)

    const pintura = readFileSync(join(salida, '21.svg'), 'utf8')
    const electricidad = readFileSync(join(salida, '22.svg'), 'utf8')

    for (const svg of [pintura, electricidad]) {
      assert.ok(svg.includes('width="800"'), 'el SVG mide 800 de ancho')
      assert.ok(svg.includes('height="600"'), 'el SVG mide 600 de alto')
    }
    assert.ok(pintura.includes('Pintura acrílica interior (cubo 5 galones)'), 'incluye el nombre')
    assert.ok(pintura.includes('🔨'), 'incluye el icono de la categoría')
    assert.ok(electricidad.includes('Panel solar monocristalino 550W'), 'incluye el nombre')
    assert.ok(electricidad.includes('⚡'), 'incluye el icono de la categoría')

    const segunda = ejecutar(argumentos)
    assert.equal(segunda.status, 0, segunda.stderr)
    assert.equal(readFileSync(join(salida, '21.svg'), 'utf8'), pintura, 'los bytes no cambian entre ejecuciones')
    assert.equal(readFileSync(join(salida, '22.svg'), 'utf8'), electricidad, 'los bytes no cambian entre ejecuciones')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})
