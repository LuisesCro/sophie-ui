#!/usr/bin/env python3
"""Render a PNG preview of the paperback full-wrap cover (back + spine + front)."""
import os
from PIL import Image, ImageDraw, ImageFont
BOOK="/home/user/sophie-ui/book"
SB="/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SR="/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
SI="/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf"
NB="/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
NAVY_TOP=(14,26,45); NAVY_BOT=(7,13,26); GOLD=(198,161,91); GOLD_LT=(222,194,133); CREAM=(238,234,226); MUTED=(150,165,186)
def lerp(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))
def F(p,s): return ImageFont.truetype(p,s)
S=170  # px/inch
PAGES=int(os.environ.get("PAGES","176")); spine_in=PAGES*0.0025
bleed=0.125; trim=6.0
fullW=int((2*bleed+2*trim+spine_in)*S); fullH=int((2*bleed+9.0)*S)
img=Image.new("RGB",(fullW,fullH),NAVY_BOT); d=ImageDraw.Draw(img)
for y in range(fullH): d.line([(0,y),(fullW,y)],fill=lerp(NAVY_TOP,NAVY_BOT,y/fullH))
bx=int(bleed*S); spx=int((bleed+trim)*S); fx=int((bleed+trim+spine_in)*S)
tw=int(trim*S); th=int(9.0*S); topb=int(bleed*S)
def ctr(cx,y,s,f,fill,track=0):
    if track:
        ws=[d.textlength(c,font=f) for c in s]; tot=sum(ws)+track*(len(s)-1); x=cx-tot/2
        for c,w in zip(s,ws): d.text((x,y),c,font=f,fill=fill); x+=w+track
    else:
        w=d.textlength(s,font=f); d.text((cx-w/2,y),s,font=f,fill=fill)
# ---- FRONT ----
cf=fx+tw//2
ctr(cf,topb+int(0.5*S),"AN INDEPENDENT GUIDE",F(NB,20),MUTED,track=6)
d.line([(cf-int(1.3*S),topb+int(0.85*S)),(cf+int(1.3*S),topb+int(0.85*S))],fill=GOLD,width=2)
# spire
sx=cf; st=topb+int(1.15*S)
d.line([(sx,st),(sx,st+int(0.35*S))],fill=GOLD,width=3)
r=int(0.06*S); d.ellipse([sx-r,st+int(0.35*S)-r,sx+r,st+int(0.35*S)+r],outline=GOLD,width=2)
bt=st+int(0.55*S)
for wf,y0,y1 in [(0.10,0.0,0.30),(0.16,0.30,0.62),(0.22,0.62,1.0)]:
    seg=int(1.3*S); yy0=bt+int(seg*y0); yy1=bt+int(seg*y1); ww=int(wf*S)
    d.rectangle([sx-ww,yy0,sx+ww,yy1],outline=GOLD,width=2)
    for k in (-1,0,1): d.line([(sx+int(k*ww*0.55),yy0+6),(sx+int(k*ww*0.55),yy1-6)],fill=GOLD,width=1)
midy=topb+th//2
ctr(cf,midy-int(0.4*S),"MORMONS",F(SB,96),GOLD_LT)
d.line([(cf-int(1.9*S),midy+int(0.35*S)),(cf+int(1.9*S),midy+int(0.35*S))],fill=GOLD,width=2)
ctr(cf,midy+int(0.5*S),"The Latter-day Saints Explained",F(SB,40),CREAM)
ctr(cf,midy+int(1.15*S),"A Clear, Fair Guide to Mormon Beliefs,",F(SI,23),MUTED)
ctr(cf,midy+int(1.45*S),"History, and Everyday Life",F(SI,23),MUTED)
ctr(cf,topb+th-int(1.1*S),"Are Mormons Christian?  What do they really believe?",F(SR,19),CREAM)
d.line([(cf-int(1.3*S),topb+th-int(0.75*S)),(cf+int(1.3*S),topb+th-int(0.75*S))],fill=GOLD,width=2)
ctr(cf,topb+th-int(0.55*S),"SOPHIE E T",F(NB,24),CREAM,track=4)
# ---- SPINE ----
sp_w=fx-spx
if sp_w>int(0.34*S):
    spimg=Image.new("RGBA",(th,sp_w),(0,0,0,0)); sd=ImageDraw.Draw(spimg)
    tt=sd.textlength("MORMONS",font=F(SB,26)); sd.text(((th)*0.72-tt/2,sp_w/2-16),"MORMONS",font=F(SB,26),fill=GOLD_LT)
    t2="The Latter-day Saints Explained"; w2=sd.textlength(t2,font=F(SR,18)); sd.text((th*0.42-w2/2,sp_w/2-12),t2,font=F(SR,18),fill=CREAM)
    t3="SOPHIE E T"; w3=sd.textlength(t3,font=F(NB,16)); sd.text((th*0.12-w3/2,sp_w/2-10),t3,font=F(NB,16),fill=CREAM)
    spimg=spimg.rotate(90,expand=True); img.paste(spimg,(spx,topb),spimg)
# ---- BACK ----
cb=bx+tw//2; bxl=bx+int(0.55*S); bw=tw-int(1.1*S)
ctr(cb,topb+int(0.55*S),"Who are the Latter-day Saints, really?",F(SB,28),GOLD_LT)
def wrap(txt,f,fill,x,y,w,lh):
    words=txt.split(); line=""
    for wd in words:
        t=(line+" "+wd).strip()
        if d.textlength(t,font=f)<=w: line=t
        else: d.text((x,y),line,font=f,fill=fill); y+=lh; line=wd
    if line: d.text((x,y),line,font=f,fill=fill); y+=lh
    return y
y=topb+int(1.0*S)
y=wrap("You've seen them everywhere lately - on reality TV, in your feed, at your door. And you've wondered: Are Mormons Christian? Do they still practice polygamy? What's with the temples, the missions, the no-coffee rule?",F(SR,19),CREAM,bxl,y,bw,28)
y+=10
y=wrap("This is the clear, fair, genuinely interesting guide for the curious - neither preaching the faith nor attacking it. In plain language, it explains:",F(SR,19),CREAM,bxl,y,bw,28)
y+=16
for b in ["What Latter-day Saints truly believe - and whether they're Christian",
          "The real history: Joseph Smith, the Book of Mormon, the trek west",
          "Polygamy: the true story - and why today's polygamists aren't the church",
          "Everyday life: temples, missions, tithing, family, and the women of the faith",
          "The hard questions: race, LGBTQ+ members, and why people leave",
          "A myth-busting FAQ and a practical good-neighbor's guide"]:
    d.text((bxl,y),"•",font=F(SR,19),fill=GOLD); y=wrap(b,F(SR,18),CREAM,bxl+int(0.2*S),y,bw-int(0.2*S),25)+6
y+=8
y=wrap("Understand the beliefs. Know the history. Read the headlines correctly. Finally get the real story.",F(SI,19),GOLD_LT,bxl,y,bw,26)
y+=6
wrap("An independent educational guide. Not affiliated with or endorsed by The Church of Jesus Christ of Latter-day Saints.",F(SR,14),MUTED,bxl,y,bw,20)
# barcode zone hint (KDP places it lower-right of the back cover)
d.rectangle([bx+tw-int(2.1*S),topb+th-int(1.5*S),bx+tw-int(0.4*S),topb+th-int(0.4*S)],outline=(90,100,115),width=1)
d.text((bx+tw-int(1.9*S),topb+th-int(1.05*S)),"(barcode: KDP adds)",font=F(SR,13),fill=(90,100,115))
out=f"{BOOK}/paperback-wrap-preview.png"; img.save(out); print("saved",out,img.size)
