from pathlib import Path
from bs4 import BeautifulSoup
import json,hashlib
root=Path(__file__).parent
s=BeautifulSoup((root/'chapter-04.html').read_text(encoding='utf-8'),'html.parser')
t=json.loads((root/'translations/chapter-04.ko.json').read_text(encoding='utf-8'))
a=json.loads((root/'adaptations/chapter-04.json').read_text(encoding='utf-8'))
sections=s.select('article > section.illustrated-scene');assert len(sections)==52
assert ''.join(x.get_text() for x in s.select('pre[lang="de"]'))==''.join(u['source'] for u in t['segments'])
assert [x.get_text() for x in s.select('.ko-translation')]==[u['ko'] for u in t['segments']]
assert len(s.select('details.source-fold'))==17 and not s.select('details[open]')
for section,body in zip(sections,a['scenes']):
 assert section['data-scene']==body['id']
 assert section.find(recursive=False).name=='figure'
 assert section.figure.find_next_sibling()['class']==['adaptation-prose']
 assert section.select_one('.inner-voice').get_text().startswith('[독백: '+body['speaker']+']')
 assert (root/section.img['src']).is_file()
 for fold in section.select('details'):
  assert fold.pre.find_next_sibling()['lang']=='ko'
assert len({x.img['src'] for x in sections})==52
episode=json.loads((root/'tts-canvas/FAUST_C04_V04_SCRIPT.json').read_text(encoding='utf-8'))
units=episode['scenes'][0]['segments'];assert len(units)==104
for i,body in enumerate(a['scenes']):
 assert units[i*2]['text']==body['narration']
 assert units[i*2+1]['text']==body['monologue']
 assert units[i*2]['performance']['audio_effect']=='dry'
 assert units[i*2+1]['performance']['audio_effect']=='echo-v4'
index=json.loads((root/'tts-canvas/FAUST_AUDIO_INDEX_V04.json').read_text(encoding='utf-8'))
assert [u['filename'] for u in units]==[u['filename'] for u in index['segments'] if u['chapter']==4]
report={'chapter':4,'illustrations':52,'narration':52,'monologues':52,'closed_aligned_source_units':17,'source_chars':t['covered_end'],'source_sha256':hashlib.sha256(''.join(u['source'] for u in t['segments']).encode()).hexdigest(),'tts_segments':104,'source_and_translation_preserved':True,'mobile_dom_width_check':'passed at 390px; viewport screenshot timed out','audio_listening':'not performed'}
(root/'chapter04-production-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False))
