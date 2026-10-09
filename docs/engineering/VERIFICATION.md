# Verificación con historial

## Ejecutar controles

Desde la raíz del repositorio:

```sh
npm run verify
npm run verify -- --quick
npm run verify -- --only docs,test
npm run verify -- --history
```

La ejecución completa corre `docs`, `tooling`, `test`, `lint`, `typecheck` y `build`, en ese orden. La rápida omite `build`; `--only` permite elegir controles por esos nombres, manteniendo el orden del inventario. La selección queda registrada: una ejecución parcial no equivale a la completa.

| Control | Comando | Límite de tiempo |
|---|---|---|
| docs | `npm run docs:check` | 30 segundos |
| tooling | `npm run test:tooling` | 60 segundos |
| test | `npm run test` | 120 segundos |
| lint | `npm run lint` | 120 segundos |
| typecheck | `npm run typecheck` | 180 segundos |
| build | `npm run build` | 300 segundos |

También puedes ejecutar esos comandos individualmente; solo el ejecutor `verify` añade su resultado al historial. No reemplaza pruebas de navegador para cambios de interfaz ni valida RLS contra una base remota.

## Resultados y evidencia

Cada ejecución terminada añade una línea JSON a `docs/history/verification.jsonl`: identificador, fecha UTC, equipo, versión de Node/npm, commit, estado de Git, huella SHA-256 de los archivos de entrada, selección, duración y resultado de cada control. Los logs completos quedan en `docs/history/logs/<id>/` y se excluyen de Git; el resumen versionable no incluye su contenido.

- `PASS`: todos los controles seleccionados terminaron con salida cero y las entradas no cambiaron durante la ejecución.
- `FAIL`: un control falló, no pudo iniciarse o agotó su tiempo. Los controles posteriores figuran como `SKIPPED`, nunca como pases.
- `INVALIDATED`: los archivos de entrada cambiaron durante una ejecución que habría pasado; vuelve a ejecutar los controles sobre el estado final.
- Una invocación inválida o bloqueada por otro ejecutor termina con salida no cero antes de empezar; no genera un resultado de controles.

La huella cubre fuentes, activos públicos, pruebas, scripts, guías e instrucciones comunes y configuraciones públicas del proyecto, también en carpetas adicionales que los patrones de TypeScript puedan incluir. Excluye `.next/`, el propio historial, dependencias instaladas, archivos generados y credenciales. El commit por sí solo no identifica cambios sin commit; la huella de contenido sí distingue dos ediciones del mismo archivo. No se reutilizan pases automáticamente y no se leen variables ni archivos de secretos para construir el registro.

## Exclusión y recuperación

El ejecutor usa `docs/history/verify.lock` para impedir dos ejecuciones simultáneas y libera su propio bloqueo al terminar. Esta exclusión solo cubre `verify`: coordina también los comandos individuales, servidores y builds de otros asistentes. Si un proceso se interrumpe abruptamente y deja el bloqueo, confirma que el PID indicado ya no corre antes de retirar ese archivo exacto.

Los controles fallidos imprimen un extracto breve; consulta el log indicado para el detalle. Ningún control de este inventario aplica SQL remoto, crea commits, hace push o despliega. Next.js puede necesitar red para descargar fuentes durante el build; una restricción de red se registra como fallo, no como un pase.

## GitHub Actions

El workflow `CI` corre en todos los pull requests y en los pushes a `dev` y `main`. El job `CI` usa Node 20 con caché de npm y ejecuta, en este orden, `npm ci`, `npm run docs:check`, `npm run test`, `npm run lint`, `npm run typecheck` y `npm run build`.

Los secretos `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son opcionales para este build. Cuando faltan, el workflow utiliza `https://<project-ref>.supabase.co` y `mock-anon-key`. La URL de ejemplo activa el fallback mock de `lib/data.ts`, y las pruebas existentes cubren ese fallback.

El check todavía no es obligatorio. La decisión sobre protección de ramas queda pendiente de Pavel. Esta ejecución no altera el inventario ni el comportamiento de `npm run verify`.

## Mantener la documentación ligera

`npm run docs:check` valida los enlaces de las entradas, las guías operativas y el índice; exige que todos los documentos Markdown bajo `docs/` estén indexados (excepto el índice mismo y logs). Sus presupuestos locales son 120 líneas/8 KB para `AGENTS.md`, 512 bytes para `CLAUDE.md` y 1.5 KB por adaptador de Cursor. Son límites de mantenimiento del proyecto, no una estimación de tokens ni un límite del producto.

Ver también: [guía de ingeniería](PROJECT_GUIDE.md), [índice](../index/MASTER_INDEX.md), [historial](../history/README.md).
