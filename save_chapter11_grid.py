from pathlib import Path
from PIL import Image
import json,shutil,sys
r=Path(__file__).parent;batch=int(sys.argv[1]);assert batch in (1,2);target=r/f'source_images/chapter11-dense-{batch:03}.png';assert not target.exists();shutil.copyfile(sys.argv[2],target)
im=Image.open(target);w,h=im.size;p=r/'dense-scene-plan.json';d=json.loads(p.read_text(encoding='utf-8'));es=[e for e in d['scenes'] if e['chapter']==11][(batch-1)*16:batch*16];mapping=[]
for i in range(16):
 box=(round(i%4*w/4)+3,round(i//4*h/4)+3,round((i%4+1)*w/4)-3,round((i//4+1)*h/4)-3)
 name=f'illustrations/{es[i]["id"]}.webp' if i<len(es) else f'illustrations/c11-alternative-{i-len(es)+1:02}.webp';assert not (r/name).exists();im.crop(box).save(r/name,'WEBP',quality=94)
 entry=dict(image=name,source_grid=f'source_images/chapter11-dense-{batch:03}.png',crop_box=box,native_grid_size=[w,h],status='generated_draft')
 if i<len(es):es[i].update(entry)
 mapping.append(dict(tile=i+1,scene_id=es[i]['id'] if i<len(es) else None,**entry))
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8');(r/f'chapter11-grid{batch:03}-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2),encoding='utf-8');print(f'Chapter11 batch{batch}: {len(es)} scenes saved')
