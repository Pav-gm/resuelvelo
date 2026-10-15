# Pipeline de entrega y lanzamiento a producción

Anexo técnico del informe final de Seminario de Proyecto II (Resuélvelo, 15 de octubre de 2026). El informe resume; este anexo conserva el detalle.

### 12.2 Procedimiento de despliegue reproducible

**Figura 24.** Pipeline de entrega: del backlog a producción.

1. Un job del backlog produce un pull request contra dev. GitHub Actions ejecuta pruebas, lint, tipos y build; el vigilante de migraciones exporta las migraciones nuevas, las ensaya sobre una copia de producción con rollback y publica el resultado como estado «Migraciones» y como comentario en el PR.
2. Con los dos estados en verde y sin migraciones destructivas, el vigilante integra el PR a dev. Vercel despliega dev.
3. El vigilante de QA detecta el nuevo commit desplegado y lanza la ronda de prueba por rol. El veredicto queda como estado «QA bots» del commit.
4. Con «QA bots» y «Migraciones» en verde en el head de dev (los dos checks obligatorios de main), el vigilante toma un respaldo de producción, aplica las migraciones pendientes en orden, ejecuta las comprobaciones de supabase/checks, hace el merge de dev a main y comenta el resultado en el PR de lanzamiento. Si alguna migración es destructiva, se detiene y espera la aprobación explícita del autor (archivo approved.json).
5. Vercel despliega main en producción. Se ejecutan las pruebas posteriores al despliegue.

El procedimiento se puede reproducir a mano: npm run build en verde, aplicar en Supabase las migraciones de supabase/migrations que falten en orden de versión (y sus comprobaciones), merge de dev a main y despliegue en Vercel.

### 12.3 Implementación de la base de datos

El lanzamiento final (commit 2df701b, 15 de octubre de 2026, 05:37 UTC) tomó el respaldo 20261015T053714Z y aplicó en producción 24 migraciones, de 20261008002318\_productos\_ficha a 20261013202000\_solicitudes\_multiproveedor, incluida 20261010000206\_oferta\_cotizacion\_proveedor, que revoca la modificación directa de cotizaciones y fue aprobada manualmente por el autor. Las siete comprobaciones de integridad pasaron en producción. Las diez migraciones anteriores se habían aplicado en los lanzamientos del 1 al 7 de octubre con el mismo procedimiento.
