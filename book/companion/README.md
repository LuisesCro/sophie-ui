# 100 Questions About Mormonism — Companion (KDP)

Companion volume to *Mormons: The Latter-day Saints Explained*. A standalone Q&A book that answers the 100 questions people most often ask about the Latter-day Saints — engineered to own the question-shaped keyword cluster (*are mormons christian, 40 questions about mormonism, mormon vs christianity*).

## What's here
- `manuscript.md` — full compiled manuscript (~32,600 words, 100 Q&As in 10 sections)
- `01-front-and-intro.md`, `s01`–`s10.md`, `99-backmatter.md` — editable sources
- `KDP-interior-6x9.docx` — **print-ready 6×9″ interior** (eBook + paperback)
- `ebook-cover-1600x2560.jpg` — Kindle cover (series look, giant "100")
- `paperback-cover-wrap-170pg.pdf` — full paperback wrap
- `paperback-wrap-preview.png` — visual preview
- `07-KDP-kit.md` — title, subtitle, 7 keywords, categories, description, pricing

## Positioning
Cheap, high-value companion that cross-promotes the main book. Q&A format drives strong Kindle Unlimited page-reads. Same fair, myth-busting, respectful voice; fully KDP-compliant.

## Two manual steps before publishing
1. **Update the TOC:** open `KDP-interior-6x9.docx` in Word/Docs → Ctrl+A → F9 → save.
2. **Confirm page count → spine:** if KDP's count isn't 170, regenerate: `PAGES=<n> PAPER=cream python3 ../build_cover_companion.py`.

A Spanish twin can be produced the same way (translate the sections, then rerun the build scripts pointed at `companion/es/`).

---
*An independent educational guide. Not affiliated with or endorsed by The Church of Jesus Christ of Latter-day Saints.*
