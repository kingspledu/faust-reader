from pathlib import Path as _CastPath
import json as _CastJSON
if _CastJSON.loads((_CastPath(__file__).parent/'adaptations/chapter-05.json').read_text(encoding='utf-8')).get('prose_revision')=='dialogue-cast-v3':
 from render_dialogue_script import render
 render(5);raise SystemExit(0)
from pathlib import Path
from bs4 import BeautifulSoup
import json
root=Path(__file__).parent
t=json.loads((root/'translations/chapter-05.ko.json').read_text(encoding='utf-8'))
a=json.loads((root/'adaptations/chapter-05.json').read_text(encoding='utf-8'))
plan=json.loads((root/'dense-scene-plan.json').read_text(encoding='utf-8'));scenes=[e for e in plan['scenes'] if e['chapter']==5]
assert len(scenes)==len(a['scenes'])==48
opening_roles=[[23,24,22],[22],[23,24],[26,17],[26,17,30,29],[28,30],[29,36],[30],[31],[32],[33,34],[34,35,28,36],[35],[28,36],[37],[10,12]]
references=json.loads((root/'art-bible/reference-index.json').read_text(encoding='utf-8'))
by_id={e['id']:e for e in references['entries']}
for i,e in enumerate(scenes):
 roles=opening_roles[i] if i<16 else [10,12] if i in (16,18) or 30<=i<42 else [10,12,38] if 27<=i<=29 else [10,12,122] if i>=42 else [125] if 19<=i<=26 else []
 e['reference_ids']=['location-004']+[f'character-{n:03}' for n in roles]
 e['visual_references']=['art-bible/location-town-gate.png']
 for key in e['reference_ids'][1:]:
  ref=by_id[key];image=ref.get('image')
  if key=='character-010':image='character-faust-old.png'
  if image:e['visual_references'].append('art-bible/'+image)
 e['review_note']='장면 의미·연령·의상·주야 흐름 검토. 봄꽃·빛은 연출용 강조이며 지리·식생의 역사적 복원은 아님. 반복 후렴도 서로 다른 구도로 표현.'
 if i>=42:e['review_note']+=' 푸들의 불길은 파우스트의 주관적 인식으로 모호하게 표현. 악마의 외형을 드러내지 않음.'
assert all((root/e.get('image','__missing__')).is_file() for e in scenes)
p=root/'chapter-05.html';soup=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser')
original=''.join(x.get_text() for x in soup.select('article pre[lang="de"]'));assert original==''.join(u['source'] for u in t['segments'])
for node in soup.select('article > details.source-fold, article > section.illustrated-scene, article > .translation-note'):node.decompose()
nav=soup.select_one('article > nav');assert nav
for e,body in zip(scenes,a['scenes']):
 assert e['id']==body['id']
 section=soup.new_tag('section',attrs={'class':'illustrated-scene','data-scene':e['id'],'id':e['id']})
 fig=soup.new_tag('figure');link=soup.new_tag('a',href=e['image'],target='_blank',rel='noopener');img=soup.new_tag('img',src=e['image'],alt=body['narration'].split('.')[0],loading='lazy',decoding='async');link.append(img);fig.append(link);section.append(fig)
 prose=soup.new_tag('section',attrs={'class':'adaptation-prose','lang':'ko'});label=soup.new_tag('p',attrs={'class':'voice-label'});label.string='[나레이션: 이야기 밖에서 인물의 마음까지 알려 주는 서술자]';prose.append(label)
 for paragraph in body['narration'].split('\n'):
  para=soup.new_tag('p');para.string=paragraph;prose.append(para)
 aside=soup.new_tag('aside',attrs={'class':'inner-voice'});label=soup.new_tag('p',attrs={'class':'voice-label'});label.string=f'[독백: {body["speaker"]}]';aside.append(label);para=soup.new_tag('p');para.string='‘'+body['monologue']+'’';aside.append(para);prose.append(aside);section.append(prose)
 for u in t['segments']:
  if e['source_start']<=u['source_start']<e['source_end']:
   fold=soup.new_tag('details',attrs={'class':'source-fold','data-translation':u['id']});summary=soup.new_tag('summary');summary.string='독일어 원문 · 한국어 번역 펼치기';fold.append(summary)
   de=soup.new_tag('pre',lang='de');de.string=u['source'];fold.append(de);ko=soup.new_tag('div',attrs={'class':'ko-translation','lang':'ko'});ko.string=u['ko'];fold.append(ko);section.append(fold)
 nav.insert_before(section);e.update(status='illustrated_adapted',adaptation='adaptations/chapter-05.json')
css=BeautifulSoup((root/'chapter-04.html').read_text(encoding='utf-8'),'html.parser').find(id='chapter04-adaptation-style').get_text()
old=soup.find(id='chapter05-adaptation-style')
if old:old.decompose()
style=soup.new_tag('style',id='chapter05-adaptation-style');style.string=css;soup.append(style)
assert ''.join(x.get_text() for x in soup.select('article pre[lang="de"]'))==original
assert [x.get_text() for x in soup.select('article .ko-translation')]==[u['ko'] for u in t['segments']]
assert len(soup.select('article > section.illustrated-scene'))==48
assert len(soup.select('details.source-fold'))==20
for label in soup.select('.voice-label'):
 if label.get_text().startswith('[나레이션:'):label.decompose()
p.write_text(str(soup),encoding='utf-8')
a['status']='illustration_aligned_reviewed';(root/'adaptations/chapter-05.json').write_text(json.dumps(a,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'dense-scene-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
mp=root/'scene-manifest.json';m=json.loads(mp.read_text(encoding='utf-8'));m['scenes']=[e for e in m['scenes'] if e.get('chapter')!=5]+[{**e,'char_offset':e['source_start'],'anchor':e['source_text'].strip()[:100]} for e in scenes];m['scope']='Chapters 1–5 illustrated and adapted; later chapters pending.';mp.write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8')
print('Chapter 5: 48 image/prose/monologue groups, 20 closed bilingual units')
