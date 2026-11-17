from pathlib import Path
from PIL import Image
from bs4 import BeautifulSoup
import json,shutil,sys
root=Path(__file__).parent
grid=root/'source_images/chapter04-dense-004.png'
if not grid.exists():shutil.copyfile(Path(sys.argv[1]),grid)
im=Image.open(grid);w,h=im.size
p=root/'dense-scene-plan.json';plan=json.loads(p.read_text(encoding='utf-8'))
scenes=[x for x in plan['scenes'] if x['chapter']==4];assert len(scenes)==52
for tile,idx in enumerate(list(range(12))+list(range(48,52))):
 e=scenes[idx];box=(round(tile%4*w/4)+3,round(tile//4*h/4)+3,round((tile%4+1)*w/4)-3,round((tile//4+1)*h/4)-3)
 name=f'illustrations/{e["id"]}'+('-v2' if idx<12 else '')+'.webp'
 if not (root/name).exists():im.crop(box).save(root/name,'WEBP',quality=94)
 if idx<12:e['previous_image']=e.get('image')
 e.update(image=name,source_grid='source_images/chapter04-dense-004.png',crop_box=box,native_grid_size=[w,h],status='generated_draft',review_note='4×4行優先。노학자·서재·장면 의미 확인. 빛나는 도형은 인물의 이해를 표현한 연출이며 물리적 새 사건으로 서술하지 않음.')
translations=json.loads((root/'translations/chapter-04.ko.json').read_text(encoding='utf-8'))
# German herunterholen means take down from the shelf, not set down.
for unit in translations['segments']:
 unit['ko']=unit['ko'].replace('나는 이제 경건한 마음으로 너를 내려놓는다!','나는 이제 경건한 마음으로 너를 선반에서 내려온다!') if False else unit['ko'].replace('나는 이제 경건한 마음으로 너를 내려놓는다!','나는 이제 경건한 마음으로 너를 선반에서 꺼내 내린다!')
translations['review_notes']=['C04-T017 herunterhole: 선반에서 병을 꺼내 내리는 동작으로 수정. 다른 번역 문구와 원문 보존.']
(root/'translations/chapter-04.ko.json').write_text(json.dumps(translations,ensure_ascii=False,indent=2),encoding='utf-8')
prose=json.loads((root/'adaptations/chapter-04.json').read_text(encoding='utf-8'))
p=root/'chapter-04.html';soup=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser')
original=''.join(x.get_text() for x in soup.select('article pre[lang="de"]'))
assert original==''.join(u['source'] for u in translations['segments'])
for node in soup.select('article > details.source-fold,article > section.illustrated-scene,article > .translation-note'):node.decompose()
nav=soup.select_one('article > nav');assert nav
for e,body in zip(scenes,prose['scenes']):
 assert e['id']==body['id'] and (root/e['image']).exists()
 section=soup.new_tag('section',attrs={'class':'illustrated-scene','data-scene':e['id'],'id':e['id']})
 fig=soup.new_tag('figure');link=soup.new_tag('a',href=e['image'],target='_blank',rel='noopener');img=soup.new_tag('img',src=e['image'],alt=body['narration'].split('。')[0].split('.')[0],loading='lazy',decoding='async');link.append(img);fig.append(link);section.append(fig)
 text=soup.new_tag('section',attrs={'class':'adaptation-prose','lang':'ko'})
 label=soup.new_tag('p',attrs={'class':'voice-label'});label.string='[나레이션: 이야기 밖에서 인물의 마음까지 알려 주는 서술자]';text.append(label)
 for paragraph in body['narration'].split('\n'):
  para=soup.new_tag('p');para.string=paragraph;text.append(para)
 aside=soup.new_tag('aside',attrs={'class':'inner-voice'});label=soup.new_tag('p',attrs={'class':'voice-label'});label.string=f'[독백: {body["speaker"]}]';aside.append(label);para=soup.new_tag('p');para.string='‘'+body['monologue']+'’';aside.append(para);text.append(aside);section.append(text)
 # Preserve whole aligned units at their starting scene; never split one language alone.
 for unit in translations['segments']:
  if e['source_start']<=unit['source_start']<e['source_end']:
   fold=soup.new_tag('details',attrs={'class':'source-fold','data-translation':unit['id']});summary=soup.new_tag('summary');summary.string='독일어 원문 · 한국어 번역 펼치기';fold.append(summary)
   de=soup.new_tag('pre',lang='de');de.string=unit['source'];fold.append(de);ko=soup.new_tag('div',attrs={'class':'ko-translation','lang':'ko'});ko.string=unit['ko'];fold.append(ko);section.append(fold)
 nav.insert_before(section)
 e['status']='illustrated_adapted';e['adaptation']='adaptations/chapter-04.json'
css='''.illustrated-scene{margin:38px 0 54px;scroll-margin-top:100px}.illustrated-scene figure{margin:0 0 26px}.illustrated-scene figure img{display:block;width:100%;height:auto;border-radius:8px}.adaptation-prose{font:var(--size,20px)/1.95 system-ui,sans-serif;word-break:keep-all}.adaptation-prose p{margin:0 0 1.2em}.voice-label{font:600 13px/1.7 system-ui;color:#80584b}.adaptation-prose aside.inner-voice{position:static;width:auto;max-height:none;overflow:visible;display:block;padding:16px 22px;background:#eee5d8;border:0;border-left:3px solid #997b68;margin:22px 0}.source-fold{margin:20px 0;border:1px solid #cfc3b4;padding:12px 16px}.source-fold summary{cursor:pointer;font:14px/1.7 system-ui;color:#75604d}.source-fold pre,.source-fold .ko-translation{font-size:17px}'''
style=soup.new_tag('style',id='chapter04-adaptation-style');style.string=css;soup.append(style)
assert ''.join(x.get_text() for x in soup.select('article pre[lang="de"]'))==original
assert [x.get_text() for x in soup.select('article .ko-translation')]==[u['ko'] for u in translations['segments']]
assert len(soup.select('section.illustrated-scene'))==52
for label in soup.select('.voice-label'):
 if label.get_text().startswith('[나레이션:'):label.decompose()
p.write_text(str(soup),encoding='utf-8')
(root/'dense-scene-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
manifest=json.loads((root/'scene-manifest.json').read_text(encoding='utf-8'));manifest['scenes']=[e for e in manifest['scenes'] if e.get('chapter')!=4]+[{**e,'char_offset':e['source_start'],'anchor':e['source_text'].strip()[:100]} for e in scenes];manifest['scope']='Chapters 1–4 illustrated and adapted; later chapters pending.'
(root/'scene-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('Chapter 4: 52 image/prose/monologue groups; 17 closed translation pairs; German preserved')
