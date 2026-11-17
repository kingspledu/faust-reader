from pathlib import Path
from PIL import Image
import json,shutil,sys
root=Path(__file__).parent;batch=int(sys.argv[1]);source=Path(sys.argv[2]);assert 1<=batch<=3
target=root/f'source_images/chapter05-dense-{batch:03}.png'
assert not target.exists();shutil.copyfile(source,target)
im=Image.open(target);w,h=im.size
p=root/'dense-scene-plan.json';d=json.loads(p.read_text(encoding='utf-8'));scenes=[e for e in d['scenes'] if e['chapter']==5][(batch-1)*16:batch*16];assert len(scenes)==16
for i,e in enumerate(scenes):
 box=(round(i%4*w/4)+3,round(i//4*h/4)+3,round((i%4+1)*w/4)-3,round((i//4+1)*h/4)-3)
 name=f'illustrations/{e["id"]}.webp';assert not (root/name).exists();im.crop(box).save(root/name,'WEBP',quality=94)
 e.update(image=name,status='generated_draft',source_grid=f'source_images/chapter05-dense-{batch:03}.png',crop_box=box,native_grid_size=[w,h],review_note='4×4 행 우선 분리. 원문·각색 의미 검토 뒤 페이지에 삽입. 세부 구도는 생성 결과를 기준으로 기록.')
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8');print(f'Chapter 5: batch {batch} saved, native {w}x{h}')
