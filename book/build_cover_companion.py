#!/usr/bin/env python3
"""Covers for the companion '100 Questions About Mormonism': eBook JPG + wrap PDF + wrap PNG.
Series look (navy/gold) with a distinguishing giant '100'. Original art, no trademarks."""
import os
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BOOK="/home/user/sophie-ui/book/companion"
SB="/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SR="/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
SI="/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf"
NB="/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
NAVY_TOP=(14,26,45); NAVY_BOT=(7,13,26); GOLD=(198,161,91); GOLD_LT=(222,194,133); CREAM=(238,234,226); MUTED=(150,165,186)
def lerp(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))
def F(p,s): return ImageFont.truetype(p,s)

AUTHOR="SOPHIE E T"

# ---------------- eBook 1600x2560 ----------------
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
ctr(190,"AN INDEPENDENT GUIDE",F(NB,38),MUTED,track=12)
d.line([(cx-300,270),(cx+300,270)],fill=GOLD,width=3)
# giant 100
ctr(470,"100",F(SB,540),GOLD_LT)
# title
ctr(1180,"QUESTIONS ABOUT",F(SB,104),CREAM)
ctr(1320,"MORMONISM",F(SB,150),GOLD_LT)
d.line([(cx-360,1560),(cx+360,1560)],fill=GOLD,width=2)
ctr(1620,"Clear, Honest Answers About",F(SI,52),MUTED)
ctr(1685,"the Latter-day Saints",F(SI,52),MUTED)
ctr(1900,"Are they Christian? Polygamy? Coffee? The temple?",F(SR,39),CREAM)
ctr(1955,"Straight answers to what everyone asks.",F(SR,39),CREAM)
d.line([(cx-260,2360),(cx+260,2360)],fill=GOLD,width=3)
ctr(2400,AUTHOR,F(NB,52),CREAM,track=10)
img.save(f"{BOOK}/ebook-cover-1600x2560.jpg","JPEG",quality=92)
print("saved companion/ebook-cover-1600x2560.jpg")

# ---------------- Paperback wrap PDF ----------------
pdfmetrics.registerFont(TTFont("SB",SB)); pdfmetrics.registerFont(TTFont("SR",SR))
pdfmetrics.registerFont(TTFont("SI",SI)); pdfmetrics.registerFont(TTFont("NB",NB))
PAGES=int(os.environ.get("PAGES","170")); PAPER=os.environ.get("PAPER","cream")
factor=0.0025 if PAPER=="cream" else 0.002252
bleed=0.125*inch; trimW,trimH=6*inch,9*inch; spine=PAGES*factor*inch
fullW=2*bleed+2*trimW+spine; fullH=2*bleed+trimH
def rgb(t): return (t[0]/255,t[1]/255,t[2]/255)
out=f"{BOOK}/paperback-cover-wrap-{PAGES}pg.pdf"
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
ct(cxf,bleed+trimH-0.9*inch,"AN INDEPENDENT GUIDE","NB",11,MUTED)
c.setStrokeColorRGB(*rgb(GOLD)); c.setLineWidth(1.5); c.line(cxf-1.4*inch,bleed+trimH-1.05*inch,cxf+1.4*inch,bleed+trimH-1.05*inch)
ct(cxf,midY+1.35*inch,"100","SB",150,GOLD_LT)
ct(cxf,midY+0.55*inch,"QUESTIONS ABOUT","SB",30,CREAM)
ct(cxf,midY+0.02*inch,"MORMONISM","SB",fitpt("MORMONISM","SB",4.5*inch,44),GOLD_LT)
c.line(cxf-1.8*inch,midY-0.35*inch,cxf+1.8*inch,midY-0.35*inch)
ct(cxf,midY-0.75*inch,"Clear, Honest Answers About","SI",14,MUTED)
ct(cxf,midY-1.0*inch,"the Latter-day Saints","SI",14,MUTED)
ct(cxf,bleed+1.1*inch,"Are they Christian? Polygamy? Coffee? The temple?","SR",fitpt("Are they Christian? Polygamy? Coffee? The temple?","SR",4.7*inch,12),CREAM)
c.line(cxf-1.3*inch,bleed+0.82*inch,cxf+1.3*inch,bleed+0.82*inch)
ct(cxf,bleed+0.52*inch,AUTHOR,"NB",15,CREAM)
# SPINE
if spine>=0.35*inch:
    c.saveState(); c.translate(spine_x+spine/2,midY); c.rotate(90)
    c.setFont("SB",14); c.setFillColorRGB(*rgb(GOLD_LT)); c.drawCentredString(1.4*inch,-5,"100 Questions About Mormonism")
    c.setFont("NB",10); c.setFillColorRGB(*rgb(CREAM)); c.drawCentredString(-3.3*inch,-4,AUTHOR)
    c.restoreState()
# BACK
bxl=back_x+0.6*inch; bw=trimW-1.2*inch
ct(cxb,bleed+trimH-0.9*inch,"You have questions. This book has 100 answers.","SB",fitpt("You have questions. This book has 100 answers.","SB",4.7*inch,16),GOLD_LT)
def wrapd(txt,f,size,color,x,y,w,lh):
    c.setFont(f,size); c.setFillColorRGB(*rgb(color)); line=""
    for wd in txt.split():
        t=(line+" "+wd).strip()
        if c.stringWidth(t,f,size)<=w: line=t
        else: c.drawString(x,y,line); y-=lh; line=wd
    if line: c.drawString(x,y,line); y-=lh
    return y
y=bleed+trimH-1.35*inch
y=wrapd("Are Mormons Christian? Do they still practice polygamy? What's with the temples, the missions, the garments, and the no-coffee rule? You've wondered — and this book answers, one clear question at a time.","SR",11.5,CREAM,bxl,y,bw,15.5)-8
y=wrapd("The 100 questions people most often ask about the Latter-day Saints, each answered in a page or two of plain, fair, jargon-free English. Ten themed sections cover:","SR",11.5,CREAM,bxl,y,bw,15.5)-10
for b in ["The basics, beliefs, and whether they're Christian",
          "The Book of Mormon, Joseph Smith, and the trek west",
          "Temples, garments, missions, tithing, and daily-life rules",
          "Family, women, and LGBTQ+ questions — fairly handled",
          "The hard history: race, polygamy, and why people leave"]:
    c.setFont("SR",11); c.setFillColorRGB(*rgb(GOLD)); c.drawString(bxl,y,"•")
    y=wrapd(b,"SR",11,CREAM,bxl+0.18*inch,y,bw-0.18*inch,14)-4
y=wrapd("No preaching. No attacking. Just honest answers — and the myths busted along the way.","SI",11.5,GOLD_LT,bxl,y-4,bw,15)-6
wrapd("An independent educational guide. Not affiliated with or endorsed by The Church of Jesus Christ of Latter-day Saints.","SR",8.5,MUTED,bxl,y,bw,11)
c.showPage(); c.save()
print(f"saved companion/paperback-cover-wrap-{PAGES}pg.pdf (spine {spine/inch:.3f}in)")

# ---------------- Wrap PNG preview ----------------
S=150; sp_in=PAGES*factor
fW=int((0.25+12+sp_in)*S); fH=int(9.25*S)
im=Image.new("RGB",(fW,fH),NAVY_BOT); dd=ImageDraw.Draw(im)
for y in range(fH): dd.line([(0,y),(fW,y)],fill=lerp(NAVY_TOP,NAVY_BOT,y/fH))
front=Image.open(f"{BOOK}/ebook-cover-1600x2560.jpg").resize((int(6*S),int(9*S)))
im.paste(front,(int((0.125+6+sp_in)*S),int(0.125*S)))
im.save(f"{BOOK}/paperback-wrap-preview.png"); print("saved companion/paperback-wrap-preview.png",im.size)
