from pathlib import Path
from PIL import Image
import json,shutil,sys
r=Path(__file__).parent;target=r/'source_images/chapter13-dense-002.png';assert not target.exists();shutil.copyfile(Path(sys.argv[1]),target)
im=Image.open(target);w,h=im.size;p=r/'dense-scene-plan.json';d=json.loads(p.read_text(encoding='utf-8'));scenes=[e for e in d['scenes'] if e['chapter']==13][16:];assert len(scenes)==15
mapping=[]
for i in range(16):
 box=(round(i%4*w/4)+3,round(i//4*h/4)+3,round((i%4+1)*w/4)-3,round((i//4+1)*h/4)-3)
 name=f'illustrations/{scenes[i]["id"]}.webp' if i<15 else f'illustrations/c13-final-alternative-{i-14:02}.webp'
 assert not (r/name).exists();im.crop(box).save(r/name,'WEBP',quality=94)
 entry=dict(image=name,source_grid='source_images/chapter13-dense-002.png',crop_box=box,native_grid_size=[w,h],status='generated_draft')
 if i<15:scenes[i].update(entry)
 mapping.append(dict(tile=i+1,scene_id=scenes[i]['id'] if i<15 else None,purpose='reader_scene' if i<15 else 'unused_alternative',**entry))
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8');(r/'chapter13-final-grid-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2),encoding='utf-8');print('Final grid: 15 scenes and 1 unused alternatives saved')
