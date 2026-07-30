# Mormones: Los Santos de los Últimos Días, Explicados — Edición en español (KDP)

Edición gemela en español del libro, lista para publicar en Amazon KDP (Amazon.es, Amazon.com.mx y Amazon.com). Traducción propia con la terminología oficial SUD.

## Contenido de esta carpeta
- `manuscript.md` — manuscrito completo en español (compilado)
- `01`–`06` `*.md` — el libro por secciones (portada/intro, Partes I–IV, material final)
- `KDP-interior-6x9.docx` — **interior 6×9″ listo para imprimir** (eBook y tapa blanda)
- `ebook-cover-1600x2560.jpg` — portada del eBook
- `paperback-cover-wrap-190pg.pdf` — wrap de tapa blanda (contra + lomo + portada, con sangrado)
- `paperback-wrap-preview.png` — vista previa del wrap
- `07-kit-publicacion-KDP.md` — título, subtítulo, 7 keywords, categorías, descripción, precio y checklist

## Posicionamiento
Nicho más pequeño que en inglés pero **casi sin competencia** (title density 0). Publica en Amazon.es, .com.mx y .com. El público hispano también compra en Amazon.com en español.

## Dos pasos manuales antes de publicar
1. **Actualiza el índice:** abre `KDP-interior-6x9.docx` en Word/Docs y actualiza el campo de índice (Ctrl+A → F9), guarda.
2. **Confirma páginas → lomo:** tras subir el interior, mira el número de páginas real en KDP; si no es 190, regenera el wrap: `PAGES=<n> PAPER=cream python3 ../build_covers_es.py`.

Las plantillas ARC (`../10-ARC-reader-template.md`) ya incluyen versión en español.

---
*Una guía educativa independiente. No está afiliada ni respaldada por La Iglesia de Jesucristo de los Santos de los Últimos Días.*
