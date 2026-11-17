from pathlib import Path as _ModernPath
import json as _ModernJSON
if _ModernJSON.loads((_ModernPath(__file__).parent / 'adaptations/chapter-10.json').read_text(encoding='utf-8')).get('prose_revision') == 'modern-dialogue-2026-11-17':
 import verify_modern_dialogue
 raise SystemExit(0)
from pathlib import Path
from bs4 import BeautifulSoup
import json,hashlib
r=Path(__file__).parent;t=json.loads((r/'translations/chapter-10.ko.json').read_text(encoding='utf-8'));s=BeautifulSoup((r/'chapter-10.html').read_text(encoding='utf-8'),'html.parser')
de=''.join(x.get_text() for x in s.select('article pre[lang="de"]'));assert de==''.join(u['source'] for u in t['segments'])
lines=(r/'dist/faust.txt').read_text(encoding='utf-8-sig').splitlines();contents=lines.index('Contents');start=next(i for i in range(contents+1,len(lines)) if lines[i]=='Zueignung');titles=[x.strip() for x in lines[contents+1:start] if x.strip()];positions=[];cursor=start
for title in titles:
 i=next(i for i in range(cursor,len(lines)) if lines[i].strip().rstrip('.')==title.rstrip('.'));positions.append(i);cursor=i+1
assert de=='\n'.join(lines[positions[9]+1:positions[10]]).strip()
assert [x.get_text() for x in s.select('article .ko-translation')]==[u['ko'] for u in t['segments']]
assert len(s.select('details.source-fold'))==6 and not s.select('details[open]')
sections=s.select('article > .illustrated-scene');n=len(sections);assert n in (0,12)
a=json.loads((r/'adaptations/chapter-10.json').read_text(encoding='utf-8'))
for sec,b in zip(sections,a['scenes']):
 assert sec['data-scene']==b['id'] and sec.find(recursive=False).name=='figure'
 assert sec.figure.find_next_sibling()['class']==['adaptation-prose']
 assert sec.select_one('.adaptation-prose > p').get_text()==b['narration']
 assert sec.select_one('.inner-voice .voice-label').get_text()==f'[독백: {b["speaker"]}]'
 assert (r/sec.img['src']).is_file()
assert len({x.img['src'] for x in sections})==n
plan=json.loads((r/'dense-scene-plan.json').read_text(encoding='utf-8'));planned=[e for e in plan['scenes'] if e['chapter']==10];assert len(planned)==12 and ''.join(e['source_text'] for e in planned)==de
for left,right in zip(planned,planned[1:]):assert left['source_end']==right['source_start']
for sec,e in zip(sections,planned):
 for fold in sec.select('details.source-fold'):
  u=next(u for u in t['segments'] if u['id']==fold['data-translation']);assert e['source_start']<=u['source_start']<e['source_end']
assert not any(p.get_text().startswith('[나레이션:') for p in s.select('article p'))
if n==12:
 units=json.loads((r/'tts-canvas/FAUST_C10_V04_SCRIPT.json').read_text(encoding='utf-8'))['scenes'][0]['segments'];assert len(units)==24
 for i,b in enumerate(a['scenes']):
  assert units[i*2]['text']==b['narration'] and units[i*2+1]['text']==b['monologue']
  assert units[i*2]['performance']['audio_effect']=='dry' and units[i*2+1]['performance']['audio_effect']=='echo-v4'
report=dict(chapter=10,status='partial' if n<12 else 'complete',illustrations=n,planned=12,narration=n,monologues=n,closed_bilingual_units=6,source_chars=len(de),independent_gutenberg_match=True,source_sha256=hashlib.sha256(de.encode()).hexdigest(),audio_generated=False)
(r/'chapter10-production-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report))
