#!/usr/bin/env python3
"""Deterministic raster exports of the user-selected refined 04 artwork. Pillow required.
No redraw, generative edit, recolor (except Safari's monochrome mask), or font substitution.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import base64, hashlib, io, json
ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'public'; BRAND=PUBLIC/'brand'
MASTER=BRAND/'selected-04-master.png'
SHA='849bb9f3d28e437e17d5588c60855d891f7006a48f05708cb98cdacdc7ca22ad'
assert hashlib.sha256(MASTER.read_bytes()).hexdigest()==SHA, 'Approved master changed'
im=Image.open(MASTER).convert('RGB')
assert im.size==(1774,887)
ivory=im.getpixel((0,0))
wordmark=im.crop((345,125,1465,770))
wordmark.save(BRAND/'wordmark-04.webp',quality=92,method=6)
# Frame only the approved bird and its perch; exclude the lettering beneath it.
box=(1000,140,1320,410)
bird=im.crop(box).convert('RGBA')
mask=Image.new('L',bird.size,0)
ImageDraw.Draw(mask).polygon([(5,0),(320,0),(320,270),(265,270),(220,235),(5,235)],fill=255)
bird.putalpha(mask)
def icon(size,scale=.84):
    out=Image.new('RGB',(size,size),ivory)
    factor=size*scale/max(bird.size)
    mark=bird.resize((round(bird.width*factor),round(bird.height*factor)),Image.Resampling.LANCZOS)
    out.paste(mark,((size-mark.width)//2,(size-mark.height)//2),mark)
    return out

def svg_raster(image,title):
    buff=io.BytesIO();image.save(buff,format='PNG',optimize=True)
    return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 %d %d" role="img"><title>%s</title><image width="%d" height="%d" xlink:href="data:image/png;base64,%s"/></svg>'%(image.width,image.height,title,image.width,image.height,base64.b64encode(buff.getvalue()).decode())
name='文鳥♬文鳥♬文鳥って嬉しいな♪'
for path,size in [('favicon-16.png',16),('favicon-32.png',32),('favicon-48.png',48),('favicon.png',512),('apple-touch-icon.png',180),('icon-192.png',192),('icon-512.png',512)]:
    icon(size).save(PUBLIC/path,optimize=True)
icon(512,.64).save(PUBLIC/'icon-maskable-512.png',optimize=True)
icon(48).save(PUBLIC/'favicon.ico',sizes=[(16,16),(32,32),(48,48)])
(PUBLIC/'favicon.svg').write_text(svg_raster(icon(128),name+' — 採用ロゴの文鳥マーク'),encoding='utf-8')
(PUBLIC/'icon-maskable.svg').write_text(svg_raster(icon(512,.64),name+' — ビットマップのマスク対応アイコン'),encoding='utf-8')
# Safari pinned tabs use a monochrome alpha mask, deterministically derived from the raster.
small=icon(128).convert('RGB');alpha=small.convert('L').point(lambda p:255 if p<180 else 0)
runs=[]
for y in range(128):
    x=0
    while x<128:
        if alpha.getpixel((x,y))==0:
            x+=1;continue
        start=x
        while x<128 and alpha.getpixel((x,y))>0:x+=1
        runs.append(f'M{start} {y}h{x-start}v1H{start}z')
(PUBLIC/'safari-pinned-tab.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><title>'+name+' — 元ビットマップから作成したモノクロマスク</title><path d="'+''.join(runs)+'"/></svg>',encoding='utf-8')
og=Image.new('RGB',(1200,630),ivory)
fit=wordmark.copy();fit.thumbnail((1100,590),Image.Resampling.LANCZOS)
og.paste(fit,((1200-fit.width)//2,(630-fit.height)//2))
# Quantization is a deterministic distribution export; exact unquantized master remains intact.
og=og.quantize(colors=256,method=Image.Quantize.FASTOCTREE)
og.save(PUBLIC/'ogp.png',optimize=True)
(PUBLIC/'ogp.svg').write_text(svg_raster(og,name+' — 採用済みビットマップロゴ'),encoding='utf-8')
paths=[MASTER,BRAND/'wordmark-04.webp']+list(PUBLIC.glob('favicon*'))+[PUBLIC/x for x in ['apple-touch-icon.png','icon-192.png','icon-512.png','icon-maskable-512.png','icon-maskable.svg','safari-pinned-tab.svg','ogp.png','ogp.svg']]
manifest={'version':1,'approvedMasterSHA256':SHA,'masterSize':[1774,887],'wordmarkCrop':[345,125,1465,770],'birdFrame':list(box),'rasterArtwork':True,'files':{str(p.relative_to(ROOT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(paths)}}
(BRAND/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'wordmarkBytes':(BRAND/'wordmark-04.webp').stat().st_size,'ogpBytes':(PUBLIC/'ogp.png').stat().st_size,'files':len(paths)},indent=2))
