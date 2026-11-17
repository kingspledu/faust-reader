from pathlib import Path
from PIL import Image
import shutil,json,sys
r=Path(__file__).parent;b=int(sys.argv[1]);src=Path(sys.argv[2]);target=r/f'source_images/chapter07-dense-{b:03}.png';assert not target.exists();shutil.copyfile(src,target);im=Image.open(target);w,h=im.size;p=r/'dense-scene-plan.json';d=json.loads(p.read_text(encoding='utf-8'));scenes=[e for e in d['scenes'] if e['chapter']==7]
indices=list(range((b-1)*16,b*16)) if b<4 else list(range(48,58))+[57,58,59,60,32,61]
for tile,idx in enumerate(indices):
 e=scenes[idx];alternative=b==4 and tile in (10,14);name=f'illustrations/{e["id"]}'+('-v2' if alternative else '')+'.webp';assert not (r/name).exists();box=(round(tile%4*w/4)+3,round(tile//4*h/4)+3,round((tile%4+1)*w/4)-3,round((tile//4+1)*h/4)-3);im.crop(box).save(r/name,'WEBP',quality=94);asset={'image':name,'source_grid':f'source_images/chapter07-dense-{b:03}.png','crop_box':box,'native_grid_size':[w,h]}
 if alternative:e.setdefault('alternative_images',[]).append(asset)
 else:e.update(**asset,status='generated_draft',review_note='行優先 4×4。장면 의미·복식 상태·문체 대조 후 반영. 실제 원본 칸 해상도 유지.')
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8');print(f'Chapter7 batch{b}:16 crops saved at native {w}x{h}')
