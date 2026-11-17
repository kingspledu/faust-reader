from pathlib import Path
from bs4 import BeautifulSoup
import json
r=Path(__file__).parent;p=r/'art-bible/reference-index.json';d=json.loads(p.read_text(encoding='utf-8'));s=BeautifulSoup((r/'art-bible/index.html').read_text(encoding='utf-8'),'html.parser')
refs=[('character-008','character-mephistopheles-noble.png','7장 귀족복: 붉은 금장 옷·짧은 비단 망토·깃털 모자·칼집 속 긴 칼. 기존 얼굴 유지.'),('character-008','character-mephistopheles-faust-disguise.png','7장 학생을 만날 때: 파우스트에게 빌린 긴 학자 옷과 모자. 젊은 악마의 얼굴이며 파우스트로 회춘·변신한 것이 아님.'),('character-042','character-student07.png','7장에 처음 온 대학생: 갈색 짧은 머리·청록빛 옷·갈색 가방·기념 수첩. 구체적 외형은 시각적 해석이며 5장의 학생들과 다른 배역.')]
for key,image,note in refs:
 e=next(x for x in d['entries'] if x['id']==key);v={'image':image,'note':note,'status':'draft_visual'};e.setdefault('chapter07_references',[])
 if not any(x['image']==image for x in e['chapter07_references']):e['chapter07_references'].append(v)
 if key=='character-042':e.update(image=image,status='draft_visual',visual_locks=['갈색 짧은 머리·안경 없음','청록빛 긴 학생 옷·갈색 가방·기념 수첩'])
 post=s.find(id=key)
 if not post.find('img',src=image):
  fig=s.new_tag('figure');a=s.new_tag('a',href=image,target='_blank',rel='noopener');img=s.new_tag('img',src=image,alt=note,loading='lazy');a.append(img);fig.append(a);cap=s.new_tag('figcaption');cap.string=note;fig.append(cap);post.h2.insert_after(fig)
 if key=='character-042':post.select_one('.meta').string='캐릭터 / character-042 / 시각 초안'
s.select_one('.stats').string=f'참조 이미지 {len({i["src"] for i in s.select("article.post img")})}개 · 기본 배경 공간 23곳 · 장면별 배역·발화 표제 128항목';p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8');(r/'art-bible/index.html').write_text(str(s),encoding='utf-8');print('Chapter7 three character/state references registered')
