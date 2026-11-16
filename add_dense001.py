from pathlib import Path
import json,re,html,shutil,sys
from PIL import Image
root=Path(__file__).parent
source_file=Path(sys.argv[1]);d=json.loads((root/'dense-scene-plan.json').read_text(encoding='utf-8'));batch=d['scenes'][:16];chapter=2
(root/'source_images').mkdir(exist_ok=True);shutil.copyfile(source_file,root/'source_images/dense-batch-001.png');im=Image.open(source_file);w,h=im.size
for e in batch:
 r,c=e['tile_row'],e['tile_column'];box=(round(c*w/4)+3,round(r*h/4)+3,round((c+1)*w/4)-3,round((r+1)*h/4)-3);path=f'illustrations/{e["id"]}.webp';im.crop(box).save(root/path,'WEBP',quality=94);e.update(image=path,status='published',source_grid='source_images/dense-batch-001.png',native_grid_size=[w,h],crop_box=box)
(root/'dense-scene-plan.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
exec((root/'build.py').read_text(encoding='utf-8-sig').split("page='''")[0]);original=chapters[1]['text']
m=json.loads((root/'scene-manifest.json').read_text(encoding='utf-8'));cutoff=batch[-1]['source_end'];items=[{'id':e['id'],'char_offset':e['source_start'],'title':e['shot_ko'],'image':e['image']} for e in batch]
items += [e for e in m['scenes'] if e['chapter']==2 and e.get('status')=='published' and e['char_offset']>=cutoff]
items.sort(key=lambda e:e['char_offset'])
for directory in [root,root/'dist']:
 f=directory/'chapter-02.html';s=f.read_text(encoding='utf-8');start=s.index('<pre lang="de">') if '<pre lang="de">' in s else -1
 # Existing figures begin before first pre for opening image: use region after article heading.
 heading=s.index('</h1>',s.index('<article>'))+len('</h1>');end=s.index('<nav>',heading)
 cursor=0;parts=[]
 for e in items:
  pos=e['char_offset'];parts.append('<pre lang="de">'+html.escape(original[cursor:pos])+'</pre>');path=e['image'] if directory==root else '../'+e['image'];parts.append(f'<figure id="{e["id"]}" style="margin:32px 0"><a href="{path}" target="_blank" rel="noopener"><img loading="lazy" src="{path}" alt="{html.escape(e["title"])}" style="width:100%;height:auto"></a></figure>');cursor=pos
 parts.append('<pre lang="de">'+html.escape(original[cursor:])+'</pre>');s=s[:heading]+''.join(parts)+s[end:];assert ''.join(html.unescape(x) for x in re.findall(r'<pre lang="de">(.*?)</pre>',s,re.S))==original;f.write_text(s,encoding='utf-8')
print('16 dense images inserted; later illustrations preserved; source verified; native',w,h)
