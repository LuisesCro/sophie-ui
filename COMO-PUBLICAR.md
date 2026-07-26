# Cómo publicar cambios (sin subir archivos a mano)

Flujo con **VS Code**. Editar y publicar en el mismo programa, con botones, sin
terminal. Al hacer push, **Netlify publica solo** en `ui.crezcamosonline.com`.

## Una sola vez (setup)

1. Instala **VS Code**: https://code.visualstudio.com (gratis).
2. Inicia sesión en GitHub desde VS Code: icono de **Cuentas** (abajo a la
   izquierda) → *Sign in with GitHub* → autoriza.
3. Clona este repo: `Ctrl/Cmd + Shift + P` → escribe **Git: Clone** →
   pega `https://github.com/LuisesCro/sophie-ui` → elige una carpeta.

> Repite el paso 3 para cada repo que quieras manejar así.

## Cada vez que quieras publicar un cambio

1. Abre el archivo (`index.html`, `chat.js`, etc.), edítalo y **guarda**
   (`Ctrl/Cmd + S`).
2. Abre el panel **Source Control** (icono de ramas, barra izquierda).
3. Escribe una línea corta que describa el cambio (ej. "Ajusto umbral de
   precio").
4. Clic en **✓ Commit**.
5. Clic en **Sync Changes** (o **Push**).

Listo. En 1–2 minutos el sitio en vivo se actualiza solo. **No hay que arrastrar
archivos ni tocar Netlify.**

## Nota sobre Netlify

Si alguna vez el sitio no se actualiza solo, revisa en Netlify:
**Site → Deploys → Deploy settings** y confirma que **Auto publishing** esté
ENCENDIDO. Con eso nunca hay que darle "Deploy" a mano.
