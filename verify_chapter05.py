from pathlib import Path as _ModernPath
import json as _ModernJSON
if _ModernJSON.loads((_ModernPath(__file__).parent / 'adaptations/chapter-05.json').read_text(encoding='utf-8')).get('prose_revision') == 'modern-dialogue-2026-11-17':
 import verify_modern_dialogue
 raise SystemExit(0)
from pathlib import Path
from bs4 import BeautifulSoup
import json,hashlib
root=Path(__file__).parent
t=json.loads((root/'translations/chapter-05.ko.json').read_text(encoding='utf-8'));a=json.loads((root/'adaptations/chapter-05.json').read_text(encoding='utf-8'))
s=BeautifulSoup((root/'chapter-05.html').read_text(encoding='utf-8'),'html.parser')
de=''.join(x.get_text() for x in s.select('article pre[lang="de"]'))
assert de==''.join(x['source'] for x in t['segments'])
# Independent comparison against the preserved Project Gutenberg text.
lines=(root/'dist/faust.txt').read_text(encoding='utf-8-sig').splitlines();contents=lines.index('Contents');start=next(i for i in range(contents+1,len(lines)) if lines[i]=='Zueignung');titles=[x.strip() for x in lines[contents+1:start] if x.strip()];positions=[];cursor=start
for title in titles:
 i=next(i for i in range(cursor,len(lines)) if lines[i].strip().rstrip('.')==title.rstrip('.'));positions.append(i);cursor=i+1
assert de=='\n'.join(lines[positions[4]+1:positions[5]]).strip()
assert [x.get_text() for x in s.select('article .ko-translation')]==[x['ko'] for x in t['segments']]
assert len(s.select('details.source-fold'))==20 and not s.select('details[open]')
sections=s.select('article > section.illustrated-scene');assert len(sections)==48
for sec,body in zip(sections,a['scenes']):
 assert sec['data-scene']==body['id']
 assert sec.find(recursive=False).name=='figure'
 assert sec.figure.find_next_sibling()['class']==['adaptation-prose']
 assert (root/sec.img['src']).is_file()
 assert sec.select_one('.inner-voice').get_text().startswith('[독백: '+body['speaker']+']')
assert len({sec.img['src'] for sec in sections})==48
episode=json.loads((root/'tts-canvas/FAUST_C05_V04_SCRIPT.json').read_text(encoding='utf-8'));units=episode['scenes'][0]['segments'];assert len(units)==96
for i,body in enumerate(a['scenes']):
 assert units[i*2]['text']==body['narration'] and units[i*2+1]['text']==body['monologue']
 assert units[i*2]['performance']['audio_effect']=='dry'
 assert units[i*2+1]['performance']['audio_effect']=='echo-v4'
 assert units[i*2+1]['voice']==episode['voices'][body['speaker']]
index=json.loads((root/'tts-canvas/FAUST_AUDIO_INDEX_V04.json').read_text(encoding='utf-8'))
assert [x['filename'] for x in index['segments'] if x['chapter']==5]==[x['filename'] for x in units]
report={'chapter':5,'illustrations':48,'narration':48,'monologues':48,'closed_bilingual_units':20,'source_chars':len(de),'independent_gutenberg_match':True,'source_sha256':hashlib.sha256(de.encode()).hexdigest(),'tts_segments':96,'audio_generated':False}
(root/'chapter05-production-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False))
