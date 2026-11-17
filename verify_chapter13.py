from pathlib import Path
from bs4 import BeautifulSoup
import json,hashlib
r=Path(__file__).parent;t=json.loads((r/'translations/chapter-13.ko.json').read_text(encoding='utf-8'));a=json.loads((r/'adaptations/chapter-13.json').read_text(encoding='utf-8'));s=BeautifulSoup((r/'chapter-13.html').read_text(encoding='utf-8'),'html.parser')
de=''.join(x.get_text() for x in s.select('article pre[lang="de"]'));assert de==''.join(u['source'] for u in t['segments'])
lines=(r/'dist/faust.txt').read_text(encoding='utf-8-sig').splitlines();contents=lines.index('Contents');start=next(i for i in range(contents+1,len(lines)) if lines[i]=='Zueignung');titles=[x.strip() for x in lines[contents+1:start] if x.strip()];positions=[];cursor=start
for title in titles:
 i=next(i for i in range(cursor,len(lines)) if lines[i].strip().rstrip('.')==title.rstrip('.'));positions.append(i);cursor=i+1
assert de=='\n'.join(lines[positions[12]+1:positions[13]]).strip()
assert [x.get_text() for x in s.select('article .ko-translation')]==[u['ko'] for u in t['segments']]
assert len(s.select('details.source-fold'))==9 and not s.select('details[open]')
sections=s.select('article>.illustrated-scene');n=len(sections);assert n in (16,31)
plan=json.loads((r/'dense-scene-plan.json').read_text(encoding='utf-8'));es=[e for e in plan['scenes'] if e['chapter']==13];assert len(es)==31 and ''.join(e['source_text'] for e in es)==de
for sec,b,e in zip(sections,a['scenes'],es):
 assert sec['data-scene']==b['id']==e['id'] and sec.find(recursive=False).name=='figure'
 assert 'adaptation-prose' in sec.figure.find_next_sibling().get('class',[])
 assert '\n'.join(p.get_text() for p in sec.select_one('.adaptation-prose').find_all('p',recursive=False))==b['narration']
 assert sec.select_one('.voice-label').get_text()==f'[독백: {b["speaker"]}]'
 assert (r/sec.img['src']).is_file()
 for fold in sec.select('details.source-fold'):
  u=next(u for u in t['segments'] if u['id']==fold['data-translation']);assert e['source_start']<=u['source_start']<e['source_end']
assert len({x.img['src'] for x in sections})==n
count=0
if n==31:
 units=json.loads((r/'tts-canvas/FAUST_C13_V04_SCRIPT.json').read_text(encoding='utf-8'))['scenes'][0]['segments'];expected=[]
 for b in a['scenes']:expected.extend(b['narration'].split('\n')+[b['monologue']])
 assert [u['text'] for u in units]==expected;count=len(units)
 for u in units:assert u['performance']['audio_effect']==('dry' if u['speaker']=='나레이터' else 'echo-v4')
report=dict(chapter=13,status='complete' if n==31 else 'partial',source_chars=len(de),source_sha256=hashlib.sha256(de.encode()).hexdigest(),independent_source_match=True,bilingual_units=9,illustrations=n,tts_segments=count,audio_generated=False)
(r/'chapter13-production-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report))
