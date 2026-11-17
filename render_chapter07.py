from pathlib import Path
from bs4 import BeautifulSoup
import json
root=Path(__file__).parent;t=json.loads((root/'translations/chapter-07.ko.json').read_text(encoding='utf-8'));a=json.loads((root/'adaptations/chapter-07.json').read_text(encoding='utf-8'));plan=json.loads((root/'dense-scene-plan.json').read_text(encoding='utf-8'));scenes=[e for e in plan['scenes'] if e['chapter']==7]
assert len(scenes)==len(a['scenes'])==62
assert all((root/e.get('image','__missing__')).is_file() for e in scenes)
p=root/'chapter-07.html';s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser');de=''.join(x.get_text() for x in s.select('article pre[lang="de"]'));assert de==''.join(u['source'] for u in t['segments'])
for node in s.select('article > details.source-fold,article > .illustrated-scene,article > .translation-note'):node.decompose()
nav=s.select_one('article > nav')
for i,(e,body) in enumerate(zip(scenes,a['scenes'])):
 assert e['id']==body['id']
 sec=s.new_tag('section',attrs={'class':'illustrated-scene','id':e['id'],'data-scene':e['id']});fig=s.new_tag('figure');link=s.new_tag('a',href=e['image'],target='_blank',rel='noopener');img=s.new_tag('img',src=e['image'],alt=body['narration'].split('.')[0],loading='lazy',decoding='async');link.append(img);fig.append(link);sec.append(fig)
 prose=s.new_tag('section',attrs={'class':'adaptation-prose','lang':'ko'})
 for paragraph in body['narration'].split('\n'):
  para=s.new_tag('p');para.string=paragraph;prose.append(para)
 aside=s.new_tag('aside',attrs={'class':'inner-voice'});label=s.new_tag('p',attrs={'class':'voice-label'});label.string=f'[독백: {body["speaker"]}]';aside.append(label);para=s.new_tag('p');para.string='‘'+body['monologue']+'’';aside.append(para);prose.append(aside);sec.append(prose)
 for u in t['segments']:
  if e['source_start']<=u['source_start']<e['source_end']:
   fold=s.new_tag('details',attrs={'class':'source-fold','data-translation':u['id']});label=s.new_tag('summary');label.string='독일어 원문 · 한국어 번역 펼치기';fold.append(label);pre=s.new_tag('pre',lang='de');pre.string=u['source'];fold.append(pre);ko=s.new_tag('div',attrs={'class':'ko-translation','lang':'ko'});ko.string=u['ko'];fold.append(ko);sec.append(fold)
 nav.insert_before(sec)
 e.update(status='illustrated_adapted',adaptation='adaptations/chapter-07.json',reference_ids=['character-010','character-008','location-003'],visual_references=['art-bible/character-faust-old.png','art-bible/location-study.png']+(['art-bible/character-mephistopheles-noble.png'] if i<36 else ['art-bible/character-mephistopheles-faust-disguise.png','art-bible/character-student07.png']),review_note='노학자·붉은 귀족복·학생 앞에서의 학자 변장 구별. 내기 조건을 만족감 자체로 축약하지 않음. 학생 상대 의학 발언은 악마의 기만으로 서술.')
css=BeautifulSoup((root/'chapter-04.html').read_text(encoding='utf-8'),'html.parser').find(id='chapter04-adaptation-style').get_text();old=s.find(id='chapter07-adaptation-style')
if old:old.decompose()
style=s.new_tag('style',id='chapter07-adaptation-style');style.string=css;s.append(style)
assert ''.join(x.get_text() for x in s.select('article pre[lang="de"]'))==de
assert [x.get_text() for x in s.select('article .ko-translation')]==[u['ko'] for u in t['segments']]
p.write_text(str(s).replace('?? ?? ??</a>','장면 제작 계획 / Szenenplan</a>'),encoding='utf-8');a['status']='illustration_aligned_reviewed';(root/'adaptations/chapter-07.json').write_text(json.dumps(a,ensure_ascii=False,indent=2),encoding='utf-8');(root/'dense-scene-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
mp=root/'scene-manifest.json';m=json.loads(mp.read_text(encoding='utf-8'));m['scenes']=[e for e in m['scenes'] if e.get('chapter')!=7]+[{**e,'char_offset':e['source_start'],'anchor':e['source_text'].strip()[:100]} for e in scenes];m['scope']='Chapters 1–7 illustrated and adapted; later chapters pending.';mp.write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8');print('Chapter 7: 62 illustration and prose groups; 13 closed bilingual units')
