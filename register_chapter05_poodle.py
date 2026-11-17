from pathlib import Path
from bs4 import BeautifulSoup
import json,shutil,sys
root=Path(__file__).parent;folder=root/'art-bible';name='character-black-poodle.png'
if not (folder/name).exists():shutil.copyfile(sys.argv[1],folder/name)
p=folder/'reference-index.json';d=json.loads(p.read_text(encoding='utf-8'));e=next(e for e in d['entries'] if e['id']=='character-122')
e.update(image=name,status='draft_visual',visual_locks=['검은 곱슬털·늘어진 귀·길쭉한 주둥이','자연스러운 개의 몸과 행동; 뿔·붉은 눈·의복·현대식 장식 없음'],variants_note='메피스토펠레스의 푸들 형태. 새 독립 인간 인물로 세지 않는다. 크기·털 모양은 시각적 해석이며 원문 확정값이 아님.')
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
p=folder/'index.html';s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser');post=s.find(id='character-122')
if not post.figure:
 fig=s.new_tag('figure');a=s.new_tag('a',href=name,target='_blank',rel='noopener');img=s.new_tag('img',src=name,alt='검은 푸들 전신·표정·동작 설정',loading='lazy');a.append(img);fig.append(a);post.h2.insert_after(fig)
post.select_one('.meta').string='형태 / character-122 / 시각 초안';p.write_text(str(s),encoding='utf-8')
print('Black poodle form reference saved and registered')
