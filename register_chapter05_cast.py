from pathlib import Path
from PIL import Image
from bs4 import BeautifulSoup
import json,shutil,sys
root=Path(__file__).parent;folder=root/'art-bible'
atlas=folder/'reference-chapter05-cast.png'
if not atlas.exists():shutil.copyfile(sys.argv[1],atlas)
im=Image.open(atlas);w,h=im.size
ids=['character-023','character-024','character-022','character-026','character-017','character-030','character-029','character-028','character-036','character-031','character-032','character-033','character-034','character-035','character-037','character-038']
locks=['구릿빛 곱슬머리; 황토색 조끼; 아이보리 셔츠와 갈색 바지','짧은 검은 머리; 갈색 모자; 초록 조끼','밝은 갈색 머리; 푸른 조끼; 갈색 작업복','갈색 한 갈래 땋은 머리; 흰 모자와 앞치마; 적갈색 드레스','금발을 땋아 올린 머리; 흰 모자와 앞치마; 초록 드레스','검은 물결머리; 버건디 더블릿과 짧은 어두운 망토','밝은 갈색 머리; 남색 모자와 푸른 더블릿','갈색으로 올린 머리; 짙은 남색 드레스와 흰 칼라; 버건디 리본','짙은 갈색 땋은 머리; 자주색 드레스와 흰 칼라; 초록 리본','중년의 통통한 체격; 검은 콧수염; 갈색 모자와 황갈색 겉옷','마른 노인; 긴 회색 수염; 낡고 해진 회갈색 옷과 지팡이','중년의 풍성한 갈색 수염; 넓은 모자; 청회색 겉옷','정수리의 숱이 적은 중년; 회갈색 수염; 올리브색 겉옷','주름진 노년 여성; 회색 머리와 갈색 머릿수건; 적갈색 옷','다듬은 갈색 수염; 소박한 철제 투구; 버건디 조끼와 갈색 바지','볕에 탄 노인의 얼굴; 흰 머리와 흰 콧수염; 갈색 모자와 올리브 갈색 옷']
p=folder/'reference-index.json';d=json.loads(p.read_text(encoding='utf-8'));blog=BeautifulSoup((folder/'index.html').read_text(encoding='utf-8'),'html.parser')
for i,key in enumerate(ids):
 name=f'{key}-chapter05.webp';box=(round(i%4*w/4)+2,round(i//4*h/4)+2,round((i%4+1)*w/4)-2,round((i//4+1)*h/4)-2)
 if not (folder/name).exists():im.crop(box).save(folder/name,'WEBP',quality=95)
 e=next(x for x in d['entries'] if x['id']==key)
 note='5장 실제 장면 제작을 위한 외형 초안. 복식·머리·색은 시각적 해석이며 원문이 정한 사실이 아님.'
 if key=='character-017':note+=' 이 시트는 하녀 대화의 다른 하녀에만 해당하며 다른 장면의 ANDRE 전체와 동일 인물로 보지 않는다.'
 e.update(image=name,status='draft_visual',chapter05_reference={'image':name,'atlas':'reference-chapter05-cast.png','crop_box':box,'native_grid_size':[w,h],'note':note})
 e['visual_locks']=locks[i].split('; ')
 post=blog.find(id=key)
 if post and not post.find(attrs={'data-variant':'chapter05'}):
  figure=blog.new_tag('figure',attrs={'data-variant':'chapter05'});a=blog.new_tag('a',href=name,target='_blank',rel='noopener');img=blog.new_tag('img',src=name,alt=e['name']+' 5장 시각 참조',loading='lazy');a.append(img);figure.append(a);cap=blog.new_tag('figcaption');cap.string=note;figure.append(cap);post.h2.insert_after(figure)
  post.select_one('.meta').string=f'캐릭터 / {key} / 시각 초안'
 if post:
  detail=post.find('details')
  if detail:
   muted=detail.select_one('.muted')
   if muted:muted.string='원문 사실과 구분되는 이번 장의 연출용 외형 초안입니다.'
   old=detail.find('ul',attrs={'data-locks':'chapter05'})
   if old:old.decompose()
   ul=blog.new_tag('ul',attrs={'data-locks':'chapter05'})
   for text in e['visual_locks']:
    li=blog.new_tag('li');li.string=text;ul.append(li)
   detail.append(ul)
# The opening 'maid' and subsequent 'first maid' are the same local role.
for key,target in [('character-025','character-026')]:
 e=next(x for x in d['entries'] if x['id']==key);ref=next(x for x in d['entries'] if x['id']==target);e['chapter05_reference']={'image':ref['image'],'same_local_role_as':target,'note':'같은 하녀 대화 안에서 첫 번째 하녀에 해당.'}
blog.select_one('.stats').string=f'참조 이미지 {len({i["src"] for i in blog.select("article.post img")})}개 · 기본 배경 공간 23곳 · 장면별 배역·발화 표제 128항목'
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8');(folder/'index.html').write_text(str(blog),encoding='utf-8')
print('16 individual chapter 5 character references saved and indexed')
