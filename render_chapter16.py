from pathlib import Path
from bs4 import BeautifulSoup
import json
r=Path(__file__).parent
t=json.loads((r/'translations/chapter-16.ko.json').read_text(encoding='utf-8'))
a=json.loads((r/'adaptations/chapter-16.json').read_text(encoding='utf-8'))
pp=r/'dense-scene-plan.json';plan=json.loads(pp.read_text(encoding='utf-8'))
all_scenes=[e for e in plan['scenes'] if e['chapter']==16]
n=0
for e,b in zip(all_scenes,a['scenes']):
 if not e.get('image') or not (r/e['image']).is_file():break
 assert e['id']==b['id'];n+=1
assert n>0
p=r/'chapter-16.html';s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser')
de=''.join(x.get_text() for x in s.select('article pre[lang="de"]'))
assert de==''.join(u['source'] for u in t['segments'])
for node in s.select('article > details.source-fold,article > .illustrated-scene,article > .translation-note'):node.decompose()
nav=s.select_one('article > nav');placed=set()
def fold(u,parent=None):
 d=s.new_tag('details',attrs={'class':'source-fold','data-translation':u['id']})
 z=s.new_tag('summary');z.string='독일어 원문 · 한국어 번역 펼치기';d.append(z)
 z=s.new_tag('pre',lang='de');z.string=u['source'];d.append(z)
 z=s.new_tag('div',attrs={'class':'ko-translation','lang':'ko'});z.string=u['ko'];d.append(z)
 if parent is None:nav.insert_before(d)
 else:parent.append(d)
 placed.add(u['id'])
for e,b in zip(all_scenes[:n],a['scenes'][:n]):
 sec=s.new_tag('section',attrs={'class':'illustrated-scene','id':e['id'],'data-scene':e['id']})
 fig=s.new_tag('figure');link=s.new_tag('a',href=e['image'],target='_blank',rel='noopener');im=s.new_tag('img',src=e['image'],alt=b['narration'].split('.')[0],loading='lazy',decoding='async');link.append(im);fig.append(link);sec.append(fig)
 prose=s.new_tag('section',attrs={'class':'adaptation-prose','lang':'ko'})
 for text in b['narration'].split('\n'):
  z=s.new_tag('p');z.string=text;prose.append(z)
 aside=s.new_tag('aside',attrs={'class':'inner-voice'});z=s.new_tag('p',attrs={'class':'voice-label'});z.string=f'[독백: {b["speaker"]}]';aside.append(z);z=s.new_tag('p');z.string='‘'+b['monologue']+'’';aside.append(z);prose.append(aside);sec.append(prose)
 for u in t['segments']:
  if e['source_start']<=u['source_start']<e['source_end']:fold(u,sec)
 nav.insert_before(sec)
 e.update(status='illustrated_adapted',adaptation='adaptations/chapter-16.json',reference_ids=['character-010','character-008','character-053','character-054','location-012'],review_note='정원의 작은 집. 그레트헨의 장난과 상호 입맞춤, 메피스토펠레스의 노크, 작별과 혼자 남은 생각. 어머니의 현장 등장·발각·처벌은 없음. 공간 배치는 연출용.')
for u in t['segments']:
 if u['id'] not in placed:fold(u)
old=s.find(id='chapter16-adaptation-style')
if old:old.decompose()
style=s.new_tag('style',id='chapter16-adaptation-style');style.string=BeautifulSoup((r/'chapter-04.html').read_text(encoding='utf-8'),'html.parser').find(id='chapter04-adaptation-style').get_text();s.append(style)
assert ''.join(x.get_text() for x in s.select('article pre[lang="de"]'))==de
assert [x.get_text() for x in s.select('article .ko-translation')]==[u['ko'] for u in t['segments']]
assert len(s.select('details.source-fold'))==3 and not s.select('details[open]')
p.write_text(str(s),encoding='utf-8');pp.write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
mp=r/'scene-manifest.json';m=json.loads(mp.read_text(encoding='utf-8'));m['scenes']=[e for e in m['scenes'] if e.get('chapter')!=16]+[{**e,'char_offset':e['source_start'],'anchor':e['source_text'].strip()[:100]} for e in all_scenes[:n]];m['scope']='Chapters 1-16 illustrated and adapted; later chapters pending.' if n==6 else f'Chapters 1-15 complete; chapter16 first {n}/6 scenes illustrated and adapted; later work pending.';mp.write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Chapter16 {n}/6 scenes inserted; all 3 bilingual units preserved and closed')
