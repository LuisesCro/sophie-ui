#!/usr/bin/env python3
"""Build a self-contained Artifact preview page (design + launch) with embedded images."""
import base64, io
from PIL import Image
BOOK="/home/user/sophie-ui/book"

def b64_jpeg(path, width, q=85):
    im=Image.open(path).convert("RGB")
    if im.width>width:
        im=im.resize((width,int(im.height*width/im.width)))
    buf=io.BytesIO(); im.save(buf,"JPEG",quality=q)
    return "data:image/jpeg;base64,"+base64.b64encode(buf.getvalue()).decode()

cover=b64_jpeg(f"{BOOK}/ebook-cover-1600x2560.jpg",760,88)
wrap =b64_jpeg(f"{BOOK}/paperback-wrap-preview.png",1500,85)

HTML=f"""<style>
:root{{
  --ground:#0d1626; --panel:#132038; --panel2:#0f1a2e; --ink:#eef0f4; --muted:#9fb0c6;
  --gold:#c9a35c; --gold-lt:#e0c488; --line:rgba(201,163,92,.28); --hair:rgba(159,176,198,.16);
  --shadow:0 18px 50px rgba(0,0,0,.45);
}}
@media (prefers-color-scheme: light){{
  :root{{ --ground:#f3efe6; --panel:#fbf8f1; --panel2:#f7f2e7; --ink:#1c2536; --muted:#5c6980;
    --gold:#9c7a34; --gold-lt:#b9923f; --line:rgba(156,122,52,.30); --hair:rgba(28,37,54,.12);
    --shadow:0 16px 40px rgba(40,44,60,.16); }}
}}
:root[data-theme="dark"]{{ --ground:#0d1626; --panel:#132038; --panel2:#0f1a2e; --ink:#eef0f4; --muted:#9fb0c6;
  --gold:#c9a35c; --gold-lt:#e0c488; --line:rgba(201,163,92,.28); --hair:rgba(159,176,198,.16); --shadow:0 18px 50px rgba(0,0,0,.45); }}
:root[data-theme="light"]{{ --ground:#f3efe6; --panel:#fbf8f1; --panel2:#f7f2e7; --ink:#1c2536; --muted:#5c6980;
  --gold:#9c7a34; --gold-lt:#b9923f; --line:rgba(156,122,52,.30); --hair:rgba(28,37,54,.12); --shadow:0 16px 40px rgba(40,44,60,.16); }}

*{{box-sizing:border-box}}
body{{margin:0;background:var(--ground);color:var(--ink);
  font-family:Georgia,'Iowan Old Style','Times New Roman',serif;line-height:1.6;
  -webkit-font-smoothing:antialiased;}}
.wrap{{max-width:1060px;margin:0 auto;padding:clamp(24px,5vw,64px) clamp(18px,4vw,40px);}}
.eyebrow{{font-family:'Helvetica Neue',Arial,sans-serif;text-transform:uppercase;letter-spacing:.24em;
  font-size:12px;font-weight:700;color:var(--gold);margin:0 0 10px;}}
h1{{font-size:clamp(30px,5vw,50px);line-height:1.08;margin:.1em 0 .2em;text-wrap:balance;font-weight:700;}}
h2{{font-size:clamp(21px,3vw,28px);margin:0 0 .5em;text-wrap:balance;}}
h3{{font-size:18px;margin:0 0 .3em;}}
p{{margin:.5em 0;}}
.lead{{color:var(--muted);font-size:clamp(15px,1.9vw,18px);max-width:60ch;}}
.rule{{height:1px;background:var(--line);border:0;margin:0;}}
section{{margin-top:clamp(40px,6vw,72px);}}
.sanslabel{{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;letter-spacing:.18em;
  text-transform:uppercase;color:var(--muted);font-weight:700;}}

.hero{{display:grid;grid-template-columns:300px 1fr;gap:clamp(24px,4vw,48px);align-items:center;margin-top:28px;}}
.hero img{{width:100%;border-radius:6px;box-shadow:var(--shadow);display:block;}}
@media(max-width:720px){{.hero{{grid-template-columns:1fr;justify-items:center;text-align:left;}}
  .hero img{{max-width:260px;}}}}

.chips{{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0;padding:0;list-style:none;}}
.chip{{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12.5px;padding:6px 11px;border-radius:999px;
  border:1px solid var(--line);color:var(--ink);background:var(--panel);}}
.chip .ok{{color:var(--gold-lt);font-weight:700;}}

.grid2{{display:grid;grid-template-columns:1fr 1fr;gap:clamp(18px,3vw,28px);}}
@media(max-width:720px){{.grid2{{grid-template-columns:1fr;}}}}
.card{{background:var(--panel);border:1px solid var(--hair);border-radius:12px;padding:22px 24px;box-shadow:var(--shadow);}}
.card.tight{{padding:18px 20px;}}

/* Amazon listing mockup */
.listing{{display:grid;grid-template-columns:120px 1fr;gap:20px;align-items:start;}}
.listing img{{width:120px;border-radius:4px;box-shadow:var(--shadow);}}
.stars{{color:var(--gold);letter-spacing:2px;font-size:15px;}}
.price{{font-size:26px;color:var(--ink);font-weight:700;}}
.price small{{font-size:14px;color:var(--muted);font-weight:400;}}
.rank{{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12.5px;color:var(--muted);}}
.rank b{{color:var(--gold-lt);}}

.kw{{display:flex;flex-wrap:wrap;gap:7px;list-style:none;padding:0;margin:8px 0 0;}}
.kw li{{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12.5px;padding:5px 10px;border-radius:6px;
  background:var(--panel2);border:1px solid var(--hair);color:var(--muted);}}
dl{{margin:0;display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:15px;}}
dt{{color:var(--muted);font-family:'Helvetica Neue',Arial,sans-serif;font-size:12.5px;letter-spacing:.06em;text-transform:uppercase;padding-top:3px;}}
dd{{margin:0;}}

.wrapimg{{width:100%;border-radius:10px;box-shadow:var(--shadow);display:block;border:1px solid var(--hair);}}
.cap{{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12.5px;color:var(--muted);margin-top:10px;text-align:center;}}

/* interior sample page */
.page{{background:var(--panel);border:1px solid var(--hair);border-radius:6px;box-shadow:var(--shadow);
  padding:clamp(26px,4vw,46px);max-width:56ch;margin:0 auto;}}
.page .ch{{text-align:center;font-size:20px;font-weight:700;margin:0 0 4px;}}
.page .cn{{text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;letter-spacing:.2em;
  text-transform:uppercase;color:var(--gold);margin:0 0 22px;}}
.page p{{font-size:15px;line-height:1.72;margin:0;text-indent:0;}}
.page p+p{{text-indent:1.3em;}}
.pgno{{text-align:center;color:var(--muted);font-size:12px;margin-top:22px;}}

ol.steps{{counter-reset:s;list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;}}
ol.steps li{{position:relative;padding-left:44px;}}
ol.steps li::before{{counter-increment:s;content:counter(s);position:absolute;left:0;top:-2px;width:30px;height:30px;
  border-radius:50%;background:var(--gold);color:#0d1626;font-family:'Helvetica Neue',Arial,sans-serif;font-weight:700;
  display:flex;align-items:center;justify-content:center;font-size:14px;}}
.you{{list-style:none;padding:0;margin:8px 0 0;display:flex;flex-direction:column;gap:8px;}}
.you li{{padding-left:24px;position:relative;color:var(--ink);}}
.you li::before{{content:"→";position:absolute;left:0;color:var(--gold);font-weight:700;}}
.files{{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;}}
.files li{{font-family:'Helvetica Neue',Arial,sans-serif;font-size:13.5px;padding:8px 0;border-bottom:1px solid var(--hair);}}
.files code{{color:var(--gold-lt);font-family:'SF Mono',Menlo,Consolas,monospace;font-size:12.5px;}}
@media(max-width:640px){{.files{{grid-template-columns:1fr;}}.listing{{grid-template-columns:90px 1fr;}}.listing img{{width:90px;}}}}
.foot{{margin-top:56px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:13px;font-style:italic;}}
</style>

<div class="wrap">

  <p class="eyebrow">Design &amp; Launch Preview · Amazon KDP</p>
  <h1>Mormons: The Latter-day Saints Explained</h1>
  <p class="lead">Everything that was built for this book — cover, interior, and full sales listing — in one place, ready to upload. This is a preview of the design and the fast path to publishing.</p>

  <div class="hero">
    <img src="{cover}" alt="eBook cover: Mormons, The Latter-day Saints Explained">
    <div>
      <h2 style="margin-bottom:.15em;">The eBook cover</h2>
      <p style="color:var(--muted);margin-top:0;">Original typographic art — deep navy, gold accents, an abstract spire motif. No trademarks, logos, or photos of real buildings, so it passes KDP review cleanly.</p>
      <ul class="chips">
        <li class="chip"><span class="ok">✓</span> Manuscript · 40,003 words · 24 chapters</li>
        <li class="chip"><span class="ok">✓</span> Interior · print-ready 6×9″ DOCX</li>
        <li class="chip"><span class="ok">✓</span> Covers · eBook + paperback wrap</li>
        <li class="chip"><span class="ok">✓</span> Listing · SEO title, keywords, categories</li>
        <li class="chip"><span class="ok">✓</span> KDP policy · compliant</li>
      </ul>
    </div>
  </div>

  <section>
    <p class="eyebrow">How it will look on Amazon</p>
    <h2>The storefront listing</h2>
    <div class="card">
      <div class="listing">
        <img src="{cover}" alt="cover thumbnail">
        <div>
          <h3 style="margin-bottom:2px;">Mormons: The Latter-day Saints Explained</h3>
          <p style="margin:0 0 6px;color:var(--muted);font-size:14px;">A Clear, Fair Guide to Mormon Beliefs, History, and Everyday Life</p>
          <p style="margin:0 0 8px;font-size:13px;">by <b>Sophie E T</b></p>
          <p style="margin:0 0 10px;"><span class="stars">★★★★★</span> <span class="rank">(honest reviews from launch week)</span></p>
          <p class="price">$6.99 <small>Kindle</small> &nbsp;·&nbsp; <small>$14.99 Paperback</small></p>
          <p class="rank" style="margin-top:10px;">Target: <b>#1 New Release</b> in Books › Religion › Mormonism</p>
        </div>
      </div>
    </div>
  </section>

  <section>
    <p class="eyebrow">Print edition</p>
    <h2>The paperback cover (full wrap)</h2>
    <img class="wrapimg" src="{wrap}" alt="Full paperback wrap: back cover, spine, front cover">
    <p class="cap">Back cover (blurb + highlights) · spine (title &amp; author) · front cover — with print bleed. Spine width is calculated from the KDP formula; confirm the exact page count in KDP's previewer and regenerate if needed.</p>
  </section>

  <section>
    <p class="eyebrow">The SEO listing (built from Helium 10 data)</p>
    <h2>Metadata, ready to paste into KDP</h2>
    <div class="grid2">
      <div class="card">
        <dl>
          <dt>Title</dt><dd>Mormons: The Latter-day Saints Explained</dd>
          <dt>Subtitle</dt><dd>A Clear, Fair Guide to Mormon Beliefs, History, and Everyday Life — Are Mormons Christian, Who They Really Are, and What They Believe</dd>
          <dt>Price</dt><dd>$6.99 eBook · ~$14.99 paperback</dd>
          <dt>Categories</dt><dd>Mormonism · LDS · Comparative Religion</dd>
        </dl>
      </div>
      <div class="card">
        <h3 class="sanslabel" style="color:var(--gold);">7 backend keywords</h3>
        <ul class="kw">
          <li>lds books for curious beginners</li>
          <li>book of mormon explained</li>
          <li>how to leave the church / ex-mormon</li>
          <li>mormon vs christianity</li>
          <li>polygamy &amp; FLDS explained</li>
          <li>temples · missions · tithing</li>
          <li>understanding mormonism</li>
        </ul>
        <p style="font-size:13px;color:var(--muted);margin-top:14px;">Chosen for real search demand at near-zero title competition — the gap the bestsellers ignore.</p>
      </div>
    </div>
  </section>

  <section>
    <p class="eyebrow">The reading experience</p>
    <h2>Inside the book</h2>
    <div class="page">
      <p class="cn">Introduction</p>
      <p class="ch">The Mormon Moment</p>
      <p>Sometime in the last few years, you started noticing them.</p>
      <p>Maybe it was a reality show about a group of glossy, feuding young wives in Utah whose religion turned out to be the least conventional thing about them. Maybe it was the young woman on your social feed baking sourdough in a linen dress on a picture-perfect farm. Maybe it was a coworker who politely declined the office coffee run every single morning, or a pair of impossibly wholesome young men in white shirts at your door.</p>
      <p>Whatever it was, the question formed: <em>Wait — what exactly is the deal with Mormons?</em></p>
      <p>You are not alone, and you are not imagining the surge. This book is an attempt to close the gap between how much we see them and how little we understand them.</p>
      <p class="pgno">· 1 ·</p>
    </div>
    <p class="cap">Typeset at 6×9″ with mirror margins, a clickable table of contents, and page numbers — the same DOCX uploads for both Kindle and paperback.</p>
  </section>

  <section>
    <p class="eyebrow">Fastest path to sale</p>
    <h2>Publish the eBook first (≈1–2 hrs of work)</h2>
    <div class="grid2">
      <div class="card">
        <ol class="steps">
          <li><b>Set up KDP</b> — account + tax &amp; bank details (the real first-timer bottleneck).</li>
          <li><b>Update the TOC</b> in the DOCX (open in Word, select all, press F9, save).</li>
          <li><b>Create the Kindle eBook</b> — paste the title, subtitle, description, 7 keywords, and categories.</li>
          <li><b>Upload two files</b> — the interior DOCX and the eBook cover JPG.</li>
          <li><b>Preview → price $6.99 → Publish.</b> Live in ~24–72 h. Paperback follows the same day.</li>
        </ol>
      </div>
      <div class="card tight">
        <h3 class="sanslabel" style="color:var(--gold);">Only you can do these</h3>
        <ul class="you">
          <li>Create the KDP account &amp; enter tax/bank info</li>
          <li>Update the Table-of-Contents field (needs Word/Docs)</li>
          <li>Press “Publish” (I can’t access your KDP account)</li>
        </ul>
        <h3 class="sanslabel" style="color:var(--gold);margin-top:18px;">Launch-week lever</h3>
        <p style="font-size:14px;color:var(--muted);margin:6px 0 0;">Line up 10–20 ARC readers to post honest reviews in week one — enough early velocity to seize the “#1 New Release” banner in the small Mormonism category. Email templates (EN + ES) are in the package.</p>
      </div>
    </div>
  </section>

  <section>
    <p class="eyebrow">Where everything lives</p>
    <h2>The files (branch: claude/mormon-book-amazon-kdp-p9ldev)</h2>
    <ul class="files">
      <li><code>KDP-interior-6x9.docx</code> — print-ready interior</li>
      <li><code>ebook-cover-1600x2560.jpg</code> — Kindle cover</li>
      <li><code>paperback-cover-wrap-176pg.pdf</code> — paperback wrap</li>
      <li><code>manuscript.md</code> — full manuscript (40k words)</li>
      <li><code>07-KDP-publishing-kit.md</code> — SEO listing &amp; metadata</li>
      <li><code>09-launch-checklist.md</code> — printable checklist</li>
      <li><code>10-ARC-reader-template.md</code> — ARC emails (EN/ES)</li>
      <li><code>08-design-and-upload-spec.md</code> — upload walkthrough</li>
    </ul>
  </section>

  <p class="foot">An independent educational guide. Not affiliated with or endorsed by The Church of Jesus Christ of Latter-day Saints. Cover and interior art are original; no trademarks or third-party images are used.</p>

</div>
"""
open(f"{BOOK}/design-preview.html","w",encoding="utf-8").write(HTML)
print("saved design-preview.html", len(HTML), "bytes")
