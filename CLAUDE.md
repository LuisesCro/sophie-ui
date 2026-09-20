# CLAUDE.md — sophie-ui

## ⛔ REGLA UNO: NO SE DESPLIEGA SIN AUTORIZACIÓN

**Nunca hagas push a `main` sin que Luis lo autorice explícitamente en ese
momento.** No vale una autorización anterior, ni que el cambio sea pequeño, ni
que arregle algo roto, ni que las pruebas estén en verde.

`main` **es producción**: Netlify publica solo, en un minuto, y lo reciben los
estudiantes de Crezcamos Online que están en clase. No hay staging por defecto.

Cómo se trabaja:

1. Todo va a una rama (`claude/<lo-que-sea>`), y ahí se publica cuantas veces
   haga falta.
2. Cuando esté listo, se le cuenta a Luis QUÉ cambia y QUÉ se ve distinto, con
   el SHA.
3. Solo con un "publica" suyo va a `main`.

Por qué está escrito aquí y no solo dicho: en septiembre de 2026 se publicaron
39 commits a producción en dos días dando por hecho que "push a main" era el
acuerdo técnico y por tanto el permiso. No lo era. Los estudiantes recibieron
cada experimento del flujo de Jungle Scout, una alumna reportó un paso que no
llevaba a ningún sitio, y hubo que revertir cuatro repos.

El acuerdo técnico de cómo se publica no es lo mismo que el permiso para
publicar. Si dudas, pregunta: cuesta un mensaje.

### Al revertir, lo que se sirve NO puede encoger
Un HTML antiguo en la caché del navegador puede pedir un archivo nuevo, pero un
HTML nuevo nunca pide uno que ya no existe. Borrar ficheros en una reversión
rompe a quien todavía no ha recargado — justo a quien la reversión venía a
rescatar. Revierte contenido; no quites archivos servidos.

### Y elige bien el punto al que se vuelve
Al revertir, busca el último commit ANTES de que empezara el trabajo que se está
deshaciendo, no el último en que "parecía que iba bien". Compruébalo sobre algo
que el usuario pueda reconocer —un texto de pantalla— y no sobre el diff.

---

## Qué es este repo

Sitio estático en Netlify en **`ui.crezcamosonline.com`**.
La capa compartida: los módulos JS y las hojas de estilo que cargan TODOS
los sitios de la suite. Un fallo aquí sale en los siete módulos a la vez.

- **Deploy:** push a **`main`** → Netlify publica solo (sin build).
- **Pruebas:** `for t in tools/test-*.mjs; do node $t; done` antes de proponer nada.
