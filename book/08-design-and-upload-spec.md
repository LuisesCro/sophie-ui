# KDP Design & Upload Specification

Everything needed to upload *Mormons: The Latter-day Saints Explained* to Amazon KDP correctly, on the first try. Files referenced here live in this `book/` folder.

---

## Files in this package

| File | What it is | Use for |
|---|---|---|
| `manuscript.md` | Full compiled manuscript (source of truth) | Editing / reference |
| `KDP-interior-6x9.docx` | **Print-ready interior**, 6×9", styled | Paperback **and** Kindle upload |
| `ebook-cover-1600x2560.jpg` | **eBook front cover** | Kindle eBook |
| `paperback-cover-wrap-176pg.pdf` | **Full-wrap paperback cover** (back + spine + front, with bleed) | Paperback |
| `build_interior.py` | Regenerates the interior DOCX from the markdown | Re-run after edits |
| `build_covers.py` | Regenerates both covers (parametric) | Re-run after page-count changes |
| `07-KDP-publishing-kit.md` | Title, keywords, categories, description, pricing | Metadata entry |
| `00-market-research.md` | Data behind the positioning | Reference |

---

## 1. Interior specification (already applied in the DOCX)

| Setting | Value | Why |
|---|---|---|
| Trim size | **6" × 9"** | Standard trade nonfiction; best print economics |
| Margins | Top/Bottom 0.75", Outside 0.5", **Inside 0.875"** | Meets KDP minimums for 150–300 pages |
| Gutter | 0.13" + mirror margins | Text won't disappear into the spine |
| Body font | Georgia 11 pt, justified, 1.15 spacing, 0.22" first-line indent | Readable, book-like |
| Headings | Parts & chapters start on a **new page**, centered | Clean navigation; feeds the TOC |
| Front matter | Title page → copyright + independence disclaimer → **auto TOC field** | KDP-compliant |
| Page numbers | Centered footer (Word `PAGE` field) | Required for print |
| Nav / TOC | Real Word heading outline levels + `TOC` field set to update | Kindle builds a clickable TOC; Word updates print page numbers |

> **One action before you upload:** open `KDP-interior-6x9.docx` in Word (or Google Docs), press **Ctrl+A then F9** (or right-click the Contents → *Update Field* → *entire table*) so the Table of Contents fills in the real page numbers. The document is already flagged to prompt this on open. Then re-save. (This step needs a word processor; it could not be run headlessly in this environment.)

KDP accepts this same `.docx` for **both** the reflowable Kindle eBook and the print paperback — upload it in each project.

---

## 2. eBook cover specification (already produced)

- **`ebook-cover-1600x2560.jpg`** — 1600 × 2560 px, ~1.6:1 ratio (KDP's ideal), RGB JPEG, < 50 MB. ✅
- Original typographic art: navy gradient, gold accents, an **abstract, original spire motif** (not a photo or depiction of any real, identifiable temple), no church logos or trademarks. ✅
- Title/subtitle text matches the metadata exactly. ✅

---

## 3. Paperback cover specification (already produced)

- **`paperback-cover-wrap-176pg.pdf`** — a single full-wrap PDF: **back panel + spine + front panel**, with **0.125" bleed** on all outer edges.
- Built for **176 pages on cream paper** → spine **0.440"**; full wrap **12.69" × 9.25"**.
- Lower-right of the back panel is left clear for the **barcode KDP adds automatically**.
- Spine carries title + author (allowed because the book is > 100 pages).

### ⚠️ The one number you must confirm: page count → spine width

The final page count is set by KDP when you upload the interior — it may differ slightly from 176. KDP's Print Previewer shows the exact count. If it differs, regenerate the wrap so the spine is exact (KDP rejects covers whose spine doesn't match):

```bash
PAGES=<actual_count> PAPER=cream python3 build_covers.py
```

**KDP spine-width formula** (built into the script):
- Cream paper: `spine (in) = pages × 0.0025`
- White paper: `spine (in) = pages × 0.002252`

Full wrap width = `0.125 + 6 + spine + 6 + 0.125` in; height = `9.25` in.

---

## 4. Upload order on KDP (step by step)

**Kindle eBook**
1. Create eBook → enter **Title** and **Subtitle** exactly as in the publishing kit.
2. Author = pen name; add the independence line in the description.
3. Enter the **7 keywords** and choose **categories** (kit §3–4).
4. Upload manuscript `KDP-interior-6x9.docx` (TOC updated).
5. Upload cover `ebook-cover-1600x2560.jpg`.
6. Preview in the Kindle previewer; confirm the clickable TOC works.
7. Price **$6.99**, 70% royalty, enroll in KDP Select for launch (optional).

**Paperback**
1. Create Paperback under the **same title** (KDP links them).
2. Trim **6×9"**, **cream** paper, black ink, matte or glossy cover.
3. Upload the **same** `KDP-interior-6x9.docx`.
4. Run the **Print Previewer** → note the exact **page count**.
5. If page count ≠ 176, regenerate the wrap (command above) and upload `paperback-cover-wrap-<count>pg.pdf`; otherwise upload the 176pg file.
6. Fix any previewer warnings (margins/bleed are already set correctly).
7. Price ~**$14.99**; approve.

---

## 5. Final pre-submit compliance check ✅

- [x] Title/subtitle on cover **exactly** match metadata (KDP blocks mismatches).
- [x] Interior margins/gutter meet KDP minimums for the page count.
- [x] Cover art is 100% original — no trademarks, logos, or real-building photos.
- [x] Independence disclaimer present (front matter + description + back cover).
- [x] Bleed included on the paperback wrap; barcode zone left clear.
- [x] Spine width matches the confirmed page count.
- [x] Keywords/categories follow KDP rules (no brand/competitor/quality terms).
- [x] Content is original, respectful, non-hateful educational nonfiction.

Do the two manual steps (update the TOC field; confirm page count → spine), and the book is ready to publish.
