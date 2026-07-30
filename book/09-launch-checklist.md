# 🚀 KDP Launch Checklist — Print & Tick

*Fastest path to sale: publish the Kindle eBook first, then the paperback. Tick each box in order.*

---

## PHASE 0 — Account (do this first; it's the real bottleneck)
- [ ] Create/sign in at **kdp.amazon.com**
- [ ] Complete **tax interview** (required to get paid)
- [ ] Add **bank/deposit details** (required to get paid)

## PHASE 1 — Prep the files (≈10 min)
- [ ] Open `KDP-interior-6x9.docx` in Word/Google Docs
- [ ] Update the **Table of Contents** field (Ctrl+A → F9, or right-click TOC → Update entire table) → **Save**
- [ ] Confirm you have `ebook-cover-1600x2560.jpg` ready

## PHASE 2 — Publish the Kindle eBook (≈30–45 min)
- [ ] KDP → **Create** → **Kindle eBook**
- [ ] **Language:** English
- [ ] **Title:** `Mormons: The Latter-day Saints Explained`
- [ ] **Subtitle:** `A Clear, Fair Guide to Mormon Beliefs, History, and Everyday Life — Are Mormons Christian, Who They Really Are, and What They Believe`
- [ ] **Author (pen name):** e.g. `J. R. Hale` (use the same name every time)
- [ ] **Description:** paste the HTML block from `07-KDP-publishing-kit.md` §5
- [ ] **Publishing rights:** "I own the copyright…"
- [ ] **Keywords (7):** paste the 7 phrases from kit §3
- [ ] **Categories:** choose the 3 from kit §4 (Mormonism / LDS / Comparative Religion)
- [ ] **Age range:** leave blank (adult nonfiction)
- [ ] Upload manuscript: `KDP-interior-6x9.docx`
- [ ] Upload cover: `ebook-cover-1600x2560.jpg`
- [ ] Click **Launch Previewer** → check the **clickable Table of Contents** works
- [ ] **KDP Select:** enroll = Yes (for launch; gives Kindle Unlimited page-reads)
- [ ] **Price:** `$6.99` USD, **70%** royalty; let Amazon auto-convert other markets
- [ ] **Publish** → status goes "In Review" (live in ~24–72 h)

## PHASE 3 — Publish the Paperback (same day or next)
- [ ] KDP → on the same title, **Create Paperback Edition**
- [ ] **Trim:** 6 × 9 in · **Paper:** cream · **Ink:** black · **Cover finish:** matte
- [ ] **Bleed:** yes · **ISBN:** use free KDP-assigned ISBN
- [ ] Upload the **same** `KDP-interior-6x9.docx`
- [ ] Open **Print Previewer** → **write down the exact PAGE COUNT:** ______
- [ ] If page count **= 176** → upload `paperback-cover-wrap-176pg.pdf`
- [ ] If page count **≠ 176** → run: `PAGES=<count> PAPER=cream python3 build_covers.py` → upload the new `paperback-cover-wrap-<count>pg.pdf`
- [ ] Clear all previewer errors (margins/bleed are already set correctly)
- [ ] **Price:** ~`$14.99` (previewer shows min price to stay profitable)
- [ ] **Publish**

## PHASE 4 — Launch week (drives ranking)
- [ ] Send the **ARC email** (see `10-ARC-reader-template.md`) to 5–15 people BEFORE launch
- [ ] On launch day, ask ARC readers to buy/borrow **and** leave an honest review
- [ ] Aim to concentrate early sales/reads → grab the **"#1 New Release"** banner in the small *Mormonism* category
- [ ] (Optional) Turn on **Amazon Sponsored Products** ads on: `are mormons christian`, `mormon beliefs`, `lds books`, `how to leave the mormon church` (bids ~$0.30–$1.00)
- [ ] Set up an **Amazon Author Central** page for the pen name

## ❌ Never do (instant KDP problems)
- [ ] ~~Buy or incentivize reviews~~ (ban) · ~~use "bestseller/free/#1" in title~~ · ~~use trademarks/show/celebrity names~~ · ~~mismatch cover text vs metadata~~

---
**Done with Phases 0–2 = your book is on sale.** Everything else is optimization.
