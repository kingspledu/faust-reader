from pathlib import Path
from PIL import Image
from bs4 import BeautifulSoup
import json,shutil,sys
root=Path(__file__).parent;folder=root/'art-bible'
atlas=folder/'reference-chapter05-cast.png'
if not atlas.exists():shutil.copyfile(sys.argv[1],atlas)
im=Image.open(atlas);w,h=im.size
ids=['character-023','character-024','character-022','character-026','character-017','character-030','character-029','character-028','character-036','character-031','character-032','character-033','character-034','character-035','character-037','character-038']
p=folder/'reference-index.json';d=json.loads(p.read_text(encoding='utf-8'));blog=BeautifulSoup((folder/'index.html').read_text(encoding='utf-8'),'html.parser')
for i,key in enumerate(ids):
 name=f'{key}-chapter05.webp';box=(round(i%4*w/4)+2,round(i//4*h/4)+2,round((i%4+1)*w/4)-2,round((i//4+1)*h/4)-2)
 if not (folder/name).exists():im.crop(box).save(folder/name,'WEBP',quality=95)
 e=next(x for x in d['entries'] if x['id']==key)
 note='5장 실제 장면 제작을 위한 외형 초안. 복식·머리·색은 시각적 해석이며 원문이 정한 사실이 아님.'
 if key=='character-017':note+=' 이 시트는 하녀 대화의 다른 하녀에만 해당하며 다른 장면의 ANDRE 전체와 동일 인물로 보지 않는다.'
 e.update(image=name,status='draft_visual',chapter05_reference={'image':name,'atlas':'reference-chapter05-cast.png','crop_box':box,'native_grid_size':[w,h],'note':note})
 post=blog.find(id=key)
 if post and not post.find(attrs={'data-variant':'chapter05'}):
  figure=blog.new_tag('figure',attrs={'data-variant':'chapter05'});a=blog.new_tag('a',href=name,target='_blank',rel='noopener');img=blog.new_tag('img',src=name,alt=e['name']+' 5장 시각 참조',loading='lazy');a.append(img);figure.append(a);cap=blog.new_tag('figcaption');cap.string=note;figure.append(cap);post.h2.insert_after(figure)
  post.select_one('.meta').string=f'캐릭터 / {key} / 시각 초안'
# The opening 'maid' and subsequent 'first maid' are the same local role.
for key,target in [('character-025','character-026')]:
 e=next(x for x in d['entries'] if x['id']==key);ref=next(x for x in d['entries'] if x['id']==target);e['chapter05_reference']={'image':ref['image'],'same_local_role_as':target,'note':'같은 하녀 대화 안에서 첫 번째 하녀에 해당.'}
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8');(folder/'index.html').write_text(str(blog),encoding='utf-8')
print('16 individual chapter 5 character references saved and indexed')
