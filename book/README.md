# Mormons: The Latter-day Saints Explained — KDP Book Package

A complete, publish-ready Amazon KDP book about the Latter-day Saints (Mormons), built from real market research and optimized for organic sales — manuscript, interior file, covers, and full listing metadata.

## What's here

**The book**
- `manuscript.md` — full compiled manuscript (~40,000 words, 24 chapters + front/back matter)
- `01`–`06` `*.md` — the manuscript in editable sections (front/intro, Parts I–IV, back matter)
- `KDP-interior-6x9.docx` — **print-ready 6×9" interior** (upload this to KDP for both eBook and paperback)

**Covers (original art, no trademarks)**
- `ebook-cover-1600x2560.jpg` — Kindle eBook front cover
- `paperback-cover-wrap-176pg.pdf` — full paperback wrap (back+spine+front, with bleed)

**Strategy & metadata**
- `00-market-research.md` — Helium 10 + web research and the positioning decision
- `07-KDP-publishing-kit.md` — SEO-optimized title, subtitle, 7 keywords, categories, description, pricing, launch plan, compliance
- `08-design-and-upload-spec.md` — interior/cover specs + step-by-step KDP upload guide

**Build scripts (regenerate anytime)**
- `build_interior.py` — rebuilds the DOCX from the markdown
- `build_covers.py` — rebuilds both covers (parametric: `PAGES=<n> PAPER=cream python3 build_covers.py`)

## Positioning (from the research)
A clear, fair, myth-busting explainer for curious outsiders, riding the 2020s "Mormon Moment." Targets high-demand, low-competition (title density 0–1) search terms like *are mormons christian*, *mormon vs christianity*, *how to leave the mormon church*, *lds books*, and *40 questions about mormonism*. Fully KDP-policy compliant: original content, independence disclaimer, no trademarks or real-person hooks.

## Two manual steps before publishing
1. **Update the Table of Contents:** open `KDP-interior-6x9.docx` in Word/Google Docs and update the TOC field so page numbers fill in (needs a word processor; can't be done headlessly).
2. **Confirm page count → spine:** after uploading the interior, read KDP's exact page count; if it isn't 176, regenerate the wrap with `PAGES=<count> PAPER=cream python3 build_covers.py`.

See `08-design-and-upload-spec.md` for the complete upload walkthrough.

## Launch & marketing
- `09-launch-checklist.md` — printable step-by-step KDP launch checklist (eBook-first)
- `10-ARC-reader-template.md` — advance-reader recruitment + review-request emails (EN/ES)
- `11-amazon-ads.md` — Amazon Ads campaign plan, keywords, bids, budgets, negatives (EN + ES)
- `12-publication-sequence.md` — the order to launch all four books for maximum momentum (ES)
- `design-preview.html` — visual design & launch preview page

## 📗 Companion book — see the `companion/` folder
*100 Questions About Mormonism* — a standalone Q&A companion (~32,600 words, 100 answers) built to own the question-keyword cluster and cross-promote this book. Includes its own manuscript, print interior, series covers, and KDP kit. Start with `companion/README.md`.
The companion also has a full **Spanish edition** in `companion/es/` (*100 preguntas sobre el mormonismo*, ~37,900 words).

## 🌎 Spanish edition — see the `es/` folder
A complete twin edition, *Mormones: Los Santos de los Últimos Días, Explicados*:
- `es/manuscript.md` (~45,600 words), `es/KDP-interior-6x9.docx`, `es/ebook-cover-1600x2560.jpg`, `es/paperback-cover-wrap-190pg.pdf`, and `es/07-kit-publicacion-KDP.md` (Spanish keywords/description for Amazon.es, .com.mx, .com). Start with `es/README.md`.

---
*An independent educational guide. Not affiliated with or endorsed by The Church of Jesus Christ of Latter-day Saints.*
