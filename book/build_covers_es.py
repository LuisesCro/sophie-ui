#!/usr/bin/env python3
"""Spanish edition covers: eBook JPG (1600x2560), paperback wrap PDF, wrap PNG preview.
Original typographic art only — no trademarks, logos, or photos of real buildings."""
import os
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BOOK="/home/user/sophie-ui/book"
SB="/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SR="/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
SI="/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf"
NB="/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
NAVY_TOP=(14,26,45); NAVY_BOT=(7,13,26); GOLD=(198,161,91); GOLD_LT=(222,194,133); CREAM=(238,234,226); MUTED=(150,165,186)
def lerp(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))
def F(p,s): return ImageFont.truetype(p,s)

# ---------- Spanish strings ----------
EYEBROW="UNA GUÍA INDEPENDIENTE"
T1="MORMONES"
T2a="Los Santos de los Últimos Días"
T2b="Explicados"
SUB1="Una guía clara y ecuánime sobre las creencias,"
SUB2="la historia y la vida cotidiana de los mormones"
HOOK1="¿Los mormones son cristianos? ¿Siguen con la poligamia?"
HOOK2="¿Qué creen en realidad? Respuestas honestas."
AUTHOR="SOPHIE E T"

def fit(draw, text, path, max_w, start):
    s=start
    while s>10:
        f=F(path,s)
        if draw.textlength(text,font=f)<=max_w: return f
        s-=2
    return F(path,10)

# =========================================================
# eBOOK COVER 1600x2560
# =========================================================
W,H=1600,2560
img=Image.new("RGB",(W,H),NAVY_BOT); d=ImageDraw.Draw(img)
for y in range(H): d.line([(0,y),(W,y)],fill=lerp(NAVY_TOP,NAVY_BOT,y/(H-1)))
cx=W//2
def ctr(y,text,font,fill,track=0):
    if track:
        ws=[d.textlength(c,font=font) for c in text]; tot=sum(ws)+track*(len(text)-1); x=cx-tot/2
        for c,w in zip(text,ws): d.text((x,y),c,font=font,fill=fill); x+=w+track
    else:
        w=d.textlength(text,font=font); d.text((cx-w/2,y),text,font=font,fill=fill)
ctr(150,EYEBROW,F(NB,38),MUTED,track=12)
d.line([(cx-300,230),(cx+300,230)],fill=GOLD,width=3)
# spire
def spire(cx,top_y,height,scale):
    nh=int(height*0.18); d.line([(cx,top_y),(cx,top_y+nh)],fill=GOLD,width=max(2,int(3*scale)))
    r=int(9*scale); d.ellipse([cx-r,top_y+nh-r,cx+r,top_y+nh+r],outline=GOLD,width=max(2,int(2*scale)))
    bt=top_y+nh+r+int(8*scale); bb=top_y+height; seg=bb-bt
    for wf,y0f,y1f in [(0.45,0.0,0.30),(0.72,0.30,0.62),(1.0,0.62,1.0)]:
        ww=int(46*scale*wf); y0=bt+int(seg*y0f); y1=bt+int(seg*y1f)
        d.rectangle([cx-ww,y0,cx+ww,y1],outline=GOLD,width=max(2,int(2*scale)))
        for k in (-1,0,1): d.line([(cx+int(k*ww*0.55),y0+int(8*scale)),(cx+int(k*ww*0.55),y1-int(8*scale))],fill=GOLD,width=max(1,int(scale)))
spire(cx,320,560,3.0)
ctr(1000,T1,fit(d,T1,SB,1420,190),GOLD_LT)
d.line([(cx-360,1250),(cx+360,1250)],fill=GOLD,width=2)
ctr(1300,T2a,fit(d,T2a,SB,1440,80),CREAM)
ctr(1400,T2b,F(SB,80),CREAM)
ctr(1590,SUB1,fit(d,SUB1,SI,1420,50),MUTED)
ctr(1655,SUB2,fit(d,SUB2,SI,1420,50),MUTED)
ctr(1870,HOOK1,fit(d,HOOK1,SR,1440,40),CREAM)
ctr(1925,HOOK2,fit(d,HOOK2,SR,1440,40),CREAM)
d.line([(cx-260,2360),(cx+260,2360)],fill=GOLD,width=3)
ctr(2400,AUTHOR,F(NB,52),CREAM,track=10)
img.save(f"{BOOK}/es/ebook-cover-1600x2560.jpg","JPEG",quality=92)
print("saved es/ebook-cover-1600x2560.jpg")

# =========================================================
# PAPERBACK WRAP PDF
# =========================================================
pdfmetrics.registerFont(TTFont("SB",SB)); pdfmetrics.registerFont(TTFont("SR",SR))
pdfmetrics.registerFont(TTFont("SI",SI)); pdfmetrics.registerFont(TTFont("NB",NB))
PAGES=int(os.environ.get("PAGES","190")); PAPER=os.environ.get("PAPER","cream")
factor=0.0025 if PAPER=="cream" else 0.002252
bleed=0.125*inch; trimW,trimH=6*inch,9*inch; spine=PAGES*factor*inch
fullW=2*bleed+2*trimW+spine; fullH=2*bleed+trimH
def rgb(t): return (t[0]/255,t[1]/255,t[2]/255)
out=f"{BOOK}/es/paperback-cover-wrap-{PAGES}pg.pdf"
c=canvas.Canvas(out,pagesize=(fullW,fullH))
for i in range(240):
    c.setFillColorRGB(*rgb(lerp(NAVY_TOP,NAVY_BOT,i/239))); c.rect(0,fullH*i/240,fullW,fullH/240+1,stroke=0,fill=1)
back_x=bleed; spine_x=bleed+trimW; front_x=bleed+trimW+spine
cxf=front_x+trimW/2; cxb=back_x+trimW/2; midY=bleed+trimH/2
def ct(x,y,s,f,size,color): c.setFont(f,size); c.setFillColorRGB(*rgb(color)); c.drawCentredString(x,y,s)
def fitpt(s,f,maxw,start):
    while start>6 and c.stringWidth(s,f,start)>maxw: start-=1
    return start
# FRONT
c.setStrokeColorRGB(*rgb(GOLD)); c.setLineWidth(1.5)
ct(cxf,bleed+trimH-1.05*inch,EYEBROW,"NB",11,MUTED)
c.line(cxf-1.6*inch,bleed+trimH-1.25*inch,cxf+1.6*inch,bleed+trimH-1.25*inch)
sx=cxf; sTop=bleed+trimH-1.7*inch; c.setLineWidth(2)
c.line(sx,sTop,sx,sTop-0.45*inch); c.circle(sx,sTop-0.55*inch,0.06*inch,stroke=1,fill=0)
bt=sTop-0.8*inch
for wf,y0,y1 in [(0.10,0.0,0.30),(0.16,0.30,0.62),(0.22,0.62,1.0)]:
    seg=1.6*inch; c.rect(sx-wf*inch,bt-seg*y1,2*wf*inch,seg*(y1-y0),stroke=1,fill=0)
ct(cxf,midY-0.1*inch,T1,"SB",fitpt(T1,"SB",4.4*inch,58),GOLD_LT)
c.setStrokeColorRGB(*rgb(GOLD)); c.line(cxf-1.9*inch,midY-0.45*inch,cxf+1.9*inch,midY-0.45*inch)
ct(cxf,midY-0.9*inch,T2a,"SB",fitpt(T2a,"SB",4.4*inch,22),CREAM)
ct(cxf,midY-1.2*inch,T2b,"SB",22,CREAM)
ct(cxf,midY-1.8*inch,SUB1,"SI",fitpt(SUB1,"SI",4.4*inch,13),MUTED)
ct(cxf,midY-2.02*inch,SUB2,"SI",fitpt(SUB2,"SI",4.4*inch,13),MUTED)
ct(cxf,bleed+1.15*inch,"¿Los mormones son cristianos? ¿Qué creen en realidad?","SR",fitpt("¿Los mormones son cristianos? ¿Qué creen en realidad?","SR",4.6*inch,12),CREAM)
c.line(cxf-1.4*inch,bleed+0.85*inch,cxf+1.4*inch,bleed+0.85*inch)
ct(cxf,bleed+0.55*inch,AUTHOR,"NB",15,CREAM)
# SPINE
if spine>=0.35*inch:
    c.saveState(); c.translate(spine_x+spine/2,midY); c.rotate(90)
    c.setFont("SB",15); c.setFillColorRGB(*rgb(GOLD_LT)); c.drawCentredString(1.0*inch,-5,"MORMONES")
    c.setFont("SR",10); c.setFillColorRGB(*rgb(CREAM)); c.drawCentredString(-1.4*inch,-4,"Los Santos de los Últimos Días")
    c.setFont("NB",10); c.setFillColorRGB(*rgb(CREAM)); c.drawCentredString(-3.3*inch,-4,AUTHOR)
    c.restoreState()
# BACK
bxl=back_x+0.6*inch; bw=trimW-1.2*inch
ct(cxb,bleed+trimH-0.9*inch,"¿Quiénes son en realidad los Santos de los Últimos Días?","SB",fitpt("¿Quiénes son en realidad los Santos de los Últimos Días?","SB",4.7*inch,15),GOLD_LT)
def wrapd(txt,f,size,color,x,y,w,lh):
    c.setFont(f,size); c.setFillColorRGB(*rgb(color)); line=""
    for wd in txt.split():
        t=(line+" "+wd).strip()
        if c.stringWidth(t,f,size)<=w: line=t
        else: c.drawString(x,y,line); y-=lh; line=wd
    if line: c.drawString(x,y,line); y-=lh
    return y
y=bleed+trimH-1.35*inch
y=wrapd("Últimamente los ves en todas partes: en la televisión, en tu feed, en tu puerta. Y te has preguntado: ¿los mormones son cristianos? ¿Todavía practican la poligamia? ¿Qué hay de los templos, las misiones y la regla del café?","SR",11.5,CREAM,bxl,y,bw,15.5)-6
y=wrapd("Esta es la guía clara, ecuánime y realmente interesante para los curiosos: ni predica ni ataca. En lenguaje sencillo, explica:","SR",11.5,CREAM,bxl,y,bw,15.5)-8
for b in ["Qué creen de verdad los Santos de los Últimos Días, y si son cristianos",
          "La historia real: Joseph Smith, el Libro de Mormón, la travesía al Oeste",
          "La poligamia: la historia verdadera, y por qué los polígamos de hoy no son la Iglesia",
          "La vida diaria: templos, misiones, diezmo, familia y las mujeres de la fe",
          "Las preguntas difíciles: la raza, los miembros LGBTQ+ y por qué algunos se van",
          "Un capítulo de mitos vs. realidad y una guía práctica para el buen vecino"]:
    c.setFont("SR",11); c.setFillColorRGB(*rgb(GOLD)); c.drawString(bxl,y,"•")
    y=wrapd(b,"SR",11,CREAM,bxl+0.18*inch,y,bw-0.18*inch,14)-4
y=wrapd("Entiende las creencias. Conoce la historia. Lee los titulares con criterio. Por fin, la historia real.","SI",11.5,GOLD_LT,bxl,y-4,bw,15)-6
wrapd("Una guía educativa independiente. No está afiliada ni respaldada por La Iglesia de Jesucristo de los Santos de los Últimos Días.","SR",8.5,MUTED,bxl,y,bw,11)
c.showPage(); c.save()
print(f"saved es/paperback-cover-wrap-{PAGES}pg.pdf (spine {spine/inch:.3f}in)")

# =========================================================
# WRAP PNG PREVIEW (Spanish) — reuse eBook front + simple back
# =========================================================
S=150
sp_in=PAGES*factor; fW=int((0.25+12+sp_in)*S); fH=int(9.25*S)
im=Image.new("RGB",(fW,fH),NAVY_BOT); dd=ImageDraw.Draw(im)
for y in range(fH): dd.line([(0,y),(fW,y)],fill=lerp(NAVY_TOP,NAVY_BOT,y/fH))
# paste a scaled eBook front onto the front panel region
front=Image.open(f"{BOOK}/es/ebook-cover-1600x2560.jpg")
fp_w=int(6*S); fp_h=int(9*S); front_r=front.resize((fp_w,fp_h))
im.paste(front_r,(int((0.125+6+sp_in)*S),int(0.125*S)))
im.save(f"{BOOK}/es/paperback-wrap-preview.png"); print("saved es/paperback-wrap-preview.png",im.size)
