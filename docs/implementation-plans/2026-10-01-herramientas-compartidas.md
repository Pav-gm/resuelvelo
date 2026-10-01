# Herramientas compartidas de Resuélvelo

Autorización: el usuario pidió «Vale, procede con la instalacion» tras confirmar que faltaban los tres puntos. Alcance: implementación local compartida para Codex, Claude Code y Cursor.

## Diseño y archivos

- `AGENTS.md` será la entrada común; `CLAUDE.md` conservará su importación. Los dos adaptadores de `.cursor/rules/` apuntarán a documentación consultada por demanda, preservando las reglas originales en `docs/engineering/`.
- `docs/index/MASTER_INDEX.md` enlazará las guías, documentación existente y planes. Un control comprobará cobertura, enlaces y presupuestos de tamaño.
- `scripts/verify.mjs` ejecutará un inventario fijo de controles en serie, con selección explícita, exclusión local, logs y un registro JSONL acumulativo. La huella de contenido identificará cambios sin commit.
- `package.json`, `README.md`, `docs/engineering/VERIFICATION.md` y `docs/history/` documentarán los comandos y resultados. Pruebas nativas de Node cubrirán fallos, omisiones, bloqueo, historial y cambios de entradas.

## Criterios de aceptación

1. Codex, Claude y Cursor encuentran los mismos acuerdos e índice sin cargar todo el protocolo en las instrucciones iniciales.
2. Las reglas anteriores de ingeniería y Cursor se conservan; los enlaces e índice pasan su comprobación.
3. La ejecución completa valida documentación, herramientas, aplicación, ESLint, tipos y build, sin paralelizar recursos compartidos.
4. Cada ejecución terminada registra el estado real, los controles seleccionados, duraciones y huella; un fallo, omisión o cambio concurrente no se presenta como pase completo.
5. El ejecutor bloquea una segunda instancia, no reutiliza resultados automáticamente y conserva el historial.
6. Se conservan los cambios preexistentes de `.env.example`, `.gitignore`, `.codex/` y `.mcp.json`; no se alteran hooks globales, aplicación, dependencias declaradas, SQL remoto, commits o despliegues.

## Verificación

Ejecutar las pruebas de herramientas y una pasada completa de `npm run verify`. Revisar el diff, las instrucciones reducidas, el registro generado y los archivos preexistentes. El código de aplicación no cambia, por lo que no hay un flujo nuevo que verificar en navegador. Una limitación del entorno debe quedar registrada y explicada.
