from pathlib import Path
from PIL import Image
import json,html,re,shutil
root=Path(__file__).parent;folder=root/'illustrations';folder.mkdir(exist_ok=True);source=root/'source_images';source.mkdir(exist_ok=True)
f=Path('C:/Users/고보민/.codex/generated_images/01a1e3cb-ba49-76b0-8e1f-666ca1459747/exec-23a140ae-f00e-4fe7-b70c-a8c1ba75d036.png');shutil.copyfile(f,source/'batch-002.png');im=Image.open(f);w,h=im.size
manifest=json.loads((root/'scene-manifest.json').read_text(encoding='utf-8'))
for e in [x for x in manifest['scenes'] if x['chapter']==3]:
 r,c=e['tile_row'],e['tile_column'];box=(round(c*w/4)+3,round(r*h/4)+3,round((c+1)*w/4)-3,round((r+1)*h/4)-3);im.crop(box).save(root/e['image'],'WEBP',quality=94);e['status']='published';e['source_grid']='source_images/batch-002.png';e['native_grid_size']=[w,h];e['crop_box']=box
for directory in [root,root/'dist']:
 f=directory/'chapter-03.html';s=f.read_text(encoding='utf-8');m=re.search(r'<pre lang="de">(.*?)</pre>',s,re.S);assert m
 original=html.unescape(m[1]);cursor=0;parts=[]
 for e in [x for x in manifest['scenes'] if x['chapter']==3]:
  pos=original.index(e['anchor']);parts.append('<pre lang="de">'+html.escape(original[cursor:pos])+'</pre>');path=e['image'] if directory==root else '../'+e['image'];parts.append(f'<figure id="{e["id"]}" style="margin:32px 0"><a href="{path}" target="_blank" rel="noopener"><img loading="lazy" src="{path}" alt="{html.escape(e["title"])}" style="width:100%;height:auto"></a><figcaption style="font:13px system-ui;color:#75695f">{html.escape(e["title"])}</figcaption></figure>');cursor=pos
 parts.append('<pre lang="de">'+html.escape(original[cursor:])+'</pre>');s=s[:m.start()]+''.join(parts)+s[m.end():];assert ''.join(html.unescape(x) for x in re.findall(r'<pre lang="de">(.*?)</pre>',s,re.S))==original
 f.write_text(s,encoding='utf-8')
(root/'scene-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8');print('16 crops saved; full original text preservation verified; native grid',w,h)
