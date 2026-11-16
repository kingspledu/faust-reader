from pathlib import Path
from bs4 import BeautifulSoup
import json
root=Path(__file__).parent
p=root/'art-bible/reference-index.json';data=json.loads(p.read_text(encoding='utf-8'))
variants={'character-010':('character-faust-old.png','회춘 전 노학자: 마른 얼굴·주름·회갈색 머리. 기존 로브 색과 자수 유지.'),'character-011':('reference-earthspirit-wagner-night.png','지령: 불꽃 속 유동적 존재. 시트 왼쪽을 참조한다. 구체적 불꽃 얼굴은 시각적 해석이다.'),'character-012':('reference-earthspirit-wagner-night.png','밤옷 바그너: 시트 오른쪽 참조. 기존 인물의 안경·갈색 머리, 소박한 밤옷·잠모자·등불.')}
for e in data['entries']:
 if e['id'] in variants:
  image,note=variants[e['id']];e['chapter04_reference']={'image':image,'note':note,'status':'draft_visual'}
  if e['id']=='character-011':e.update(image=image,status='draft_visual',visual_locks=['움직이는 붉은 불꽃·금빛 중심','거대한 정령의 위압감','인간 의복·메피스토펠레스 뿔 없음'])
p.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
p=root/'art-bible/index.html';s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser')
for key,(image,note) in variants.items():
 post=s.find(id=key)
 if post.find(attrs={'data-variant':'chapter04'}):continue
 fig=s.new_tag('figure',attrs={'data-variant':'chapter04'});link=s.new_tag('a',href=image,target='_blank',rel='noopener');img=s.new_tag('img',src=image,alt=note,loading='lazy');link.append(img);fig.append(link);caption=s.new_tag('figcaption');caption.string=note;fig.append(caption);post.h2.insert_after(fig)
 if key=='character-011':post.select_one('.meta').string='캐릭터 / character-011 / 시각 초안';post.select_one('.muted').string='불꽃 속 유동적 존재. 구체적 얼굴·색은 연출용 시각 설정이다.'
p.write_text(str(s),encoding='utf-8')
p=root/'chapter-04.html';s=p.read_text(encoding='utf-8').replace('?? ?? ??</a>','장면 제작 계획 / Szenenplan</a>');p.write_text(s,encoding='utf-8')
print('Old Faust, Earth spirit, and night-costume Wagner references registered')
