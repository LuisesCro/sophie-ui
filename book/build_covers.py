#!/usr/bin/env python3
"""Generate KDP covers: eBook front (1600x2560 JPG) + paperback full-wrap PDF.
Original typographic art only — no trademarks, logos, or photos of real buildings."""
import os
from PIL import Image, ImageDraw, ImageFont

BOOK = "/home/user/sophie-ui/book"
SERIF_B = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SERIF_R = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
SERIF_I = "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf"
SANS_B  = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

# palette
NAVY_TOP = (14, 26, 45)
NAVY_BOT = (7, 13, 26)
GOLD     = (198, 161, 91)
GOLD_LT  = (222, 194, 133)
CREAM    = (238, 234, 226)
MUTED    = (150, 165, 186)

def lerp(a, b, t): return tuple(int(a[i] + (b[i]-a[i])*t) for i in range(3))

def vgradient(draw, w, h, top, bot, x0=0, y0=0):
    for y in range(h):
        draw.line([(x0, y0+y), (x0+w, y0+y)], fill=lerp(top, bot, y/max(1,h-1)))

def F(path, size): return ImageFont.truetype(path, size)

def center_text(draw, cx, y, text, font, fill, tracking=0):
    if tracking:
        # manual letter spacing
        widths = [draw.textlength(ch, font=font) for ch in text]
        total = sum(widths) + tracking*(len(text)-1)
        x = cx - total/2
        for ch, wch in zip(text, widths):
            draw.text((x, y), ch, font=font, fill=fill)
            x += wch + tracking
        return
    w = draw.textlength(text, font=font)
    draw.text((cx - w/2, y), text, font=font, fill=fill)

def draw_spire(draw, cx, top_y, height, color, scale=1.0):
    """Abstract, original slender spire motif (not a real building)."""
    w_base = int(46*scale)
    # needle
    needle_h = int(height*0.18)
    draw.line([(cx, top_y), (cx, top_y+needle_h)], fill=color, width=max(2,int(3*scale)))
    # small sphere near apex
    r = int(9*scale)
    draw.ellipse([cx-r, top_y+needle_h-r, cx+r, top_y+needle_h+r], outline=color, width=max(2,int(2*scale)))
    body_top = top_y + needle_h + r + int(8*scale)
    body_bot = top_y + height
    # tapered tower with two setbacks
    seg = (body_bot - body_top)
    for i, (wf, y0f, y1f) in enumerate([(0.45,0.0,0.30),(0.72,0.30,0.62),(1.0,0.62,1.0)]):
        ww = int(w_base*wf)
        y0 = body_top + int(seg*y0f); y1 = body_top + int(seg*y1f)
        draw.rectangle([cx-ww, y0, cx+ww, y1], outline=color, width=max(2,int(2*scale)))
        # simple vertical windows
        for k in range(-1,2):
            xx = cx + int(k*ww*0.55)
            draw.line([(xx, y0+int(8*scale)), (xx, y1-int(8*scale))], fill=color, width=max(1,int(1*scale)))

# =========================================================
# 1) eBOOK COVER  1600 x 2560
# =========================================================
W, H = 1600, 2560
img = Image.new("RGB", (W, H), NAVY_BOT)
d = ImageDraw.Draw(img)
vgradient(d, W, H, NAVY_TOP, NAVY_BOT)

cx = W//2
# top eyebrow
center_text(d, cx, 150, "AN INDEPENDENT GUIDE", F(SANS_B, 40), MUTED, tracking=14)
# top gold rule
d.line([(cx-260, 230),(cx+260,230)], fill=GOLD, width=3)

# spire motif
draw_spire(d, cx, 320, 560, GOLD, scale=3.0)

# title
center_text(d, cx, 1000, "MORMONS", F(SERIF_B, 210), GOLD_LT)
# divider
d.line([(cx-360, 1270),(cx+360,1270)], fill=GOLD, width=2)
center_text(d, cx, 1310, "The Latter-day Saints", F(SERIF_B, 96), CREAM)
center_text(d, cx, 1420, "Explained", F(SERIF_B, 96), CREAM)

# subtitle (italic, two lines)
center_text(d, cx, 1600, "A Clear, Fair Guide to Mormon Beliefs,", F(SERIF_I, 54), MUTED)
center_text(d, cx, 1670, "History, and Everyday Life", F(SERIF_I, 54), MUTED)

# question hook
hook = ["Are Mormons Christian?  Do they still practice polygamy?",
        "What do they really believe? Get the honest answers."]
center_text(d, cx, 1880, hook[0], F(SERIF_R, 40), CREAM)
center_text(d, cx, 1935, hook[1], F(SERIF_R, 40), CREAM)

# bottom rule + author
d.line([(cx-260, 2360),(cx+260,2360)], fill=GOLD, width=3)
center_text(d, cx, 2400, "SOPHIE E T", F(SANS_B, 52), CREAM, tracking=10)

img.save(f"{BOOK}/ebook-cover-1600x2560.jpg", "JPEG", quality=92)
print("saved ebook-cover-1600x2560.jpg")

# =========================================================
# 2) PAPERBACK FULL-WRAP  (PDF)  6x9 trim, 0.125" bleed
# =========================================================
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

pdfmetrics.registerFont(TTFont("SerifB", SERIF_B))
pdfmetrics.registerFont(TTFont("SerifR", SERIF_R))
pdfmetrics.registerFont(TTFont("SerifI", SERIF_I))
pdfmetrics.registerFont(TTFont("SansB", SANS_B))

PAGES = int(os.environ.get("PAGES", "176"))   # regenerate with KDP's true count
PAPER = os.environ.get("PAPER", "cream")       # cream=0.0025, white=0.002252
factor = 0.0025 if PAPER == "cream" else 0.002252
bleed = 0.125*inch
trimW, trimH = 6*inch, 9*inch
spine = PAGES*factor*inch
fullW = 2*bleed + 2*trimW + spine
fullH = 2*bleed + trimH

def rgb(t): return (t[0]/255, t[1]/255, t[2]/255)

out = f"{BOOK}/paperback-cover-wrap-{PAGES}pg.pdf"
c = canvas.Canvas(out, pagesize=(fullW, fullH))

# background gradient (horizontal bands)
bands = 240
for i in range(bands):
    t = i/(bands-1)
    c.setFillColorRGB(*rgb(lerp(NAVY_TOP, NAVY_BOT, t)))
    c.rect(0, fullH*i/bands, fullW, fullH/bands+1, stroke=0, fill=1)

back_x = bleed
spine_x = bleed + trimW
front_x = bleed + trimW + spine
cx_front = front_x + trimW/2
cx_back = back_x + trimW/2
midY = bleed + trimH/2

def ctext(x, y, s, font, size, color):
    c.setFont(font, size); c.setFillColorRGB(*rgb(color))
    c.drawCentredString(x, y, s)

# ---- FRONT PANEL ----
c.setStrokeColorRGB(*rgb(GOLD)); c.setLineWidth(1.5)
ctext(cx_front, bleed+trimH-1.05*inch, "AN INDEPENDENT GUIDE", "SansB", 12, MUTED)
c.line(cx_front-1.6*inch, bleed+trimH-1.25*inch, cx_front+1.6*inch, bleed+trimH-1.25*inch)
# spire (reportlab origin bottom-left; draw simple original motif)
sx = cx_front; sTop = bleed+trimH-1.7*inch
c.setStrokeColorRGB(*rgb(GOLD)); c.setLineWidth(2)
c.line(sx, sTop, sx, sTop-0.45*inch)                      # needle
c.circle(sx, sTop-0.55*inch, 0.06*inch, stroke=1, fill=0) # sphere
bt = sTop-0.8*inch
for wf, y0, y1 in [(0.10,0.0,0.30),(0.16,0.30,0.62),(0.22,0.62,1.0)]:
    seg=1.6*inch
    yy0=bt-seg*y0; yy1=bt-seg*y1
    c.rect(sx-wf*inch, yy1, 2*wf*inch, yy0-yy1, stroke=1, fill=0)
# title
ctext(cx_front, midY-0.1*inch, "MORMONS", "SerifB", 62, GOLD_LT)
c.setStrokeColorRGB(*rgb(GOLD)); c.line(cx_front-1.9*inch, midY-0.45*inch, cx_front+1.9*inch, midY-0.45*inch)
ctext(cx_front, midY-0.95*inch, "The Latter-day Saints Explained", "SerifB", 26, CREAM)
ctext(cx_front, midY-1.7*inch, "A Clear, Fair Guide to Mormon Beliefs,", "SerifI", 15, MUTED)
ctext(cx_front, midY-1.95*inch, "History, and Everyday Life", "SerifI", 15, MUTED)
ctext(cx_front, bleed+1.15*inch, "Are Mormons Christian?  What do they really believe?", "SerifR", 12.5, CREAM)
c.line(cx_front-1.4*inch, bleed+0.85*inch, cx_front+1.4*inch, bleed+0.85*inch)
ctext(cx_front, bleed+0.55*inch, "SOPHIE E T", "SansB", 15, CREAM)

# ---- SPINE ---- (KDP allows spine text at >=100 pages)
if spine >= 0.35*inch:
    c.saveState()
    c.translate(spine_x + spine/2, midY)
    c.rotate(90)
    c.setFont("SerifB", 15); c.setFillColorRGB(*rgb(GOLD_LT))
    c.drawCentredString(0.6*inch, -5, "MORMONS")
    c.setFont("SerifR", 11); c.setFillColorRGB(*rgb(CREAM))
    c.drawCentredString(-1.2*inch, -4, "The Latter-day Saints Explained")
    c.setFont("SansB", 10); c.setFillColorRGB(*rgb(CREAM))
    c.drawCentredString(-3.2*inch, -4, "SOPHIE E T")
    c.restoreState()

# ---- BACK PANEL ----
def wrap_draw(x_left, y_top, width, lines_spec):
    y = y_top
    for text, font, size, color, gap in lines_spec:
        c.setFont(font, size); c.setFillColorRGB(*rgb(color))
        # simple word-wrap
        words = text.split(); line=""
        for w in words:
            test=(line+" "+w).strip()
            if c.stringWidth(test, font, size) <= width:
                line=test
            else:
                c.drawString(x_left, y, line); y-=size*1.35; line=w
        if line: c.drawString(x_left, y, line)
        y -= gap
    return y

bx = back_x + 0.6*inch
bw = trimW - 1.2*inch
ctext(cx_back, bleed+trimH-0.9*inch, "Who are the Latter-day Saints, really?", "SerifB", 17, GOLD_LT)
y = bleed+trimH-1.35*inch
y = wrap_draw(bx, y, bw, [
 ("You've seen them everywhere lately — on reality TV, in your feed, at your door. And you've wondered: Are Mormons Christian? Do they still practice polygamy? What's with the temples, the missions, the no-coffee rule?", "SerifR", 11.5, CREAM, 10),
 ("This is the clear, fair, genuinely interesting guide for the curious — neither preaching the faith nor attacking it. In plain language, it explains:", "SerifR", 11.5, CREAM, 12),
])
for b in ["What Latter-day Saints truly believe — and whether they're Christian",
          "The real history: Joseph Smith, the Book of Mormon, the trek west",
          "Polygamy: the true story, and why today's polygamists aren't the church",
          "Everyday life: temples, missions, tithing, family, and the women of the faith",
          "The hard questions: race, LGBTQ+ members, and why people leave",
          "A myth-busting FAQ and a practical good-neighbor's guide"]:
    c.setFont("SerifR", 11); c.setFillColorRGB(*rgb(GOLD))
    c.drawString(bx, y, "•")
    c.setFillColorRGB(*rgb(CREAM))
    y = wrap_draw(bx+0.18*inch, y, bw-0.18*inch, [(b, "SerifR", 11, CREAM, 6)])
y -= 6
wrap_draw(bx, y, bw, [
 ("Understand the beliefs. Know the history. Read the headlines correctly. Finally get the real story.", "SerifI", 11.5, GOLD_LT, 14),
 ("An independent educational guide. Not affiliated with or endorsed by The Church of Jesus Christ of Latter-day Saints.", "SerifR", 8.5, MUTED, 0),
])
# leave lower-right clear for KDP barcode (~2x1.2 in)

c.showPage(); c.save()
print(f"saved paperback-cover-wrap-{PAGES}pg.pdf  (spine {spine/inch:.3f}in for {PAGES} {PAPER} pages)")
print(f"full wrap size: {fullW/inch:.3f} x {fullH/inch:.3f} in (includes 0.125in bleed)")
