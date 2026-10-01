# Historial de verificaciones

`verification.jsonl` es un registro acumulativo: una línea JSON por ejecución de `npm run verify`. Conserva los resultados anteriores; consulta las últimas ejecuciones con `npm run verify -- --history`.

Los logs completos se guardan en `logs/<id>/` y el bloqueo activo en `verify.lock`; ambos son locales y están excluidos de Git. El registro empieza con la primera ejecución real, sin resultados inventados ni importados de conversaciones.

La selección de controles y el estado final determinan qué se comprobó. Un `PASS` parcial no es evidencia de una compilación o prueba de navegador que no se ejecutó. Si cambian el código, las dependencias o el entorno, vuelve a verificar.

Ver también: [guía de verificación](../engineering/VERIFICATION.md), [índice](../index/MASTER_INDEX.md).
