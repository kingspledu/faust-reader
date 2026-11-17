from pathlib import Path
from PIL import Image
import json,shutil,sys
r=Path(__file__).parent;batch=int(sys.argv[1]);assert batch in (1,2)
target=r/f'source_images/chapter17-dense-{batch:03}.png';assert not target.exists();shutil.copyfile(Path(sys.argv[2]),target)
im=Image.open(target);w,h=im.size;p=r/'dense-scene-plan.json';d=json.loads(p.read_text(encoding='utf-8'));scenes=[e for e in d['scenes'] if e['chapter']==17];assert len(scenes)==21
offset=0 if batch==1 else 16;count=16 if batch==1 else 5;mapping=[]
for i in range(16):
 box=(round(i%4*w/4)+3,round(i//4*h/4)+3,round((i%4+1)*w/4)-3,round((i//4+1)*h/4)-3)
 name=f'illustrations/{scenes[offset+i]["id"]}.webp' if i<count else f'illustrations/c17-final-alternative-{i-count+1:02}.webp'
 assert not (r/name).exists();im.crop(box).save(r/name,'WEBP',quality=94)
 entry=dict(image=name,source_grid=str(target.relative_to(r)).replace('\\','/'),crop_box=box,native_grid_size=[w,h],status='generated_draft')
 if i<count:scenes[offset+i].update(entry)
 mapping.append(dict(tile=i+1,scene_id=scenes[offset+i]['id'] if i<count else None,purpose='reader_scene' if i<count else 'unused_alternative',**entry))
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
(r/f'chapter17-grid-{batch:03}-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Grid {batch}: {count} scenes, {16-count} unused alternatives, native {w}x{h}')
