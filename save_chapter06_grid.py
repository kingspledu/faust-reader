from pathlib import Path
from PIL import Image
import json,shutil,sys
root=Path(__file__).parent;batch=int(sys.argv[1]);src=Path(sys.argv[2]);target=root/f'source_images/chapter06-dense-{batch:03}.png'
assert not target.exists();shutil.copyfile(src,target)
im=Image.open(target);w,h=im.size;p=root/'dense-scene-plan.json';plan=json.loads(p.read_text(encoding='utf-8'));scenes=[e for e in plan['scenes'] if e['chapter']==6]
indices=list(range((batch-1)*16,min(batch*16,43)))
if batch==3:indices+=list(range(5))
for tile,idx in enumerate(indices):
 e=scenes[idx];variation=batch==3 and tile>=11;name=f'illustrations/{e["id"]}'+('-v2' if variation else '')+'.webp';assert not (root/name).exists()
 box=(round(tile%4*w/4)+3,round(tile//4*h/4)+3,round((tile%4+1)*w/4)-3,round((tile//4+1)*h/4)-3);im.crop(box).save(root/name,'WEBP',quality=94)
 asset={'image':name,'source_grid':f'source_images/chapter06-dense-{batch:03}.png','crop_box':box,'native_grid_size':[w,h]}
 if variation:e.setdefault('alternative_images',[]).append(asset)
 else:e.update(**asset,status='generated_draft',review_note='4×4 행 우선 분리. 실제 원본 칸 해상도 유지. 최종 의미 대조 전 초안.')
p.write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8');print(f'Chapter 6 batch {batch}: {len(indices)} assets saved; grid {w}x{h}')
