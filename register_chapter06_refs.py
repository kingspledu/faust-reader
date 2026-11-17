from pathlib import Path
from bs4 import BeautifulSoup
import json
root=Path(__file__).parent;p=root/'art-bible/reference-index.json';d=json.loads(p.read_text(encoding='utf-8'));e=next(x for x in d['entries'] if x['id']=='character-008')
e['chapter06_reference']={'image':'character-mephistopheles-scholar.png','state':'떠돌이 학자 차림','visual_locks':['검은 흐트러진 머리·기존 얼굴·붉은 눈 유지','수수한 회갈색 긴 학자 옷·짧은 망토·천 모자·가죽 허리띠','변장 장면에서는 뿔·화려한 금장·보석 장신구를 드러내지 않음'],'canonical_note':'이번 장의 무대지시: fahrender Scholastikus. 구체적 옷의 색·얼굴은 연출용 설정.'}
e=next(x for x in d['entries'] if x['id']=='character-040');e['chapter06_staging_note']='복도 목소리와 환상을 부르는 무리. 개별 얼굴·인간 이름을 임의로 확정하지 않고 흐릿한 기운과 노래가 보여 주는 풍경으로 연출.'
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8');p=root/'art-bible/index.html';s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser');post=s.find(id='character-008')
if not post.find(attrs={'data-variant':'chapter06'}):
 fig=s.new_tag('figure',attrs={'data-variant':'chapter06'});link=s.new_tag('a',href='character-mephistopheles-scholar.png',target='_blank',rel='noopener');img=s.new_tag('img',src='character-mephistopheles-scholar.png',alt='메피스토펠레스 6장 떠돌이 학자 차림',loading='lazy');link.append(img);fig.append(link);caption=s.new_tag('figcaption');caption.string='6장: 떠돌이 학자 차림. 같은 인물의 변장이며 화려한 악마 복식과 구분합니다.';fig.append(caption);post.h2.insert_after(fig)
s.select_one('.stats').string=f'참조 이미지 {len({i["src"] for i in s.select("article.post img")})}개 · 기본 배경 공간 23곳 · 장면별 배역·발화 표제 128항목';p.write_text(str(s),encoding='utf-8');print('Scholar costume variant registered; chorus staging noted')
