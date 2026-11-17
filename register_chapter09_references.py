from pathlib import Path
from bs4 import BeautifulSoup
import json,shutil
r=Path(__file__).parent;b=r/'art-bible'
for name,source in [('character-monkey-male.png','exec-7d08e1ee-4c08-4f13-898f-807803e483b1.png'),('character-monkey-female-young.png','exec-525396da-f8a9-4166-bee0-6f8cf38051bd.png')]:
 dest=b/name;assert not dest.exists();shutil.copyfile(Path('C:/Users/고보민/.codex/generated_images/01a1e3cb-ba49-76b0-8e1f-666ca1459747')/source,dest)
p=b/'reference-index.json';d=json.loads(p.read_text(encoding='utf-8'))
for e in d['entries']:
 if e['id']=='character-050':e.update(image='character-monkey-male.png',status='draft_visual',visual_locks=['회올리브색 털·크림색 볼 털·짙은 얼굴·긴 꼬리','황토색 조끼·버건디 허리끈은 연출용 의상','체·속 빈 점토 공·털이개'],canonical_note='9장 Meerkater. 원문 Affe와 Meerkatze 문맥에 따라 수컷 원숭이. 고양이·미어캣이 아님.',unresolved=['외형·의상·구멍 있는 공은 시각화 선택이며 원문 사실로 확정하지 않음.'])
 if e['id']=='character-123':e.update(image='character-monkey-female-young.png',status='draft_visual',visual_locks=['암컷: 적갈색 털·크림색 볼 털·짙은 얼굴·긴 꼬리','이끼 녹색 조끼·갈색 끈은 연출용 의상','거품 걷는 국자·새끼는 작은 밝은 갈색 원숭이'],canonical_note='9장 무대지시의 암컷 원숭이와 새끼들. 시트의 두 새끼는 연출 예시이며 원문은 수를 확정하지 않음.',unresolved=['개체 외형·옷·새끼 수는 시각화 설정. 공동 발화와 별도 인물로 중복 계산하지 않음.'])
 if e['id'] in ('character-049','character-051'):e['reference_ids']=['character-050','character-123'];e['canonical_note']='9장 원숭이들의 집단 또는 공동 발화. 개별 시각 참조는 character-050과 character-123을 사용. 독립적인 새 개체가 아님.'
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
p=b/'index.html';s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser')
for eid in ('character-050','character-123'):
 e=next(e for e in d['entries'] if e['id']==eid);post=s.find(id=eid);assert post
 for old in post.select('.pending'):old.decompose()
 fig=s.new_tag('figure');a=s.new_tag('a',href=e['image'],target='_blank',rel='noopener');im=s.new_tag('img',src=e['image'],alt=e['name']+' 시각화 참조',loading='lazy');a.append(im);fig.append(a);caption=s.new_tag('figcaption');caption.string='시각화 초안 · 그림을 누르면 원본을 크게 볼 수 있습니다.';fig.append(caption);post.find('h2').insert_after(fig)
 para=s.new_tag('p');para.string=e['canonical_note']+' 외형과 의상은 제작상 선택입니다.';fig.insert_after(para)
stats=s.select_one('.stats');stats.string=stats.get_text().replace('64개','66개')
p.write_text(str(s),encoding='utf-8');print('Two on-demand monkey references registered in machine index and blog')
