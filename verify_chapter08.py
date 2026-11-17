from pathlib import Path
from bs4 import BeautifulSoup
import json,hashlib
r=Path(__file__).parent
t=json.loads((r/'translations/chapter-08.ko.json').read_text(encoding='utf-8'));a=json.loads((r/'adaptations/chapter-08.json').read_text(encoding='utf-8'));s=BeautifulSoup((r/'chapter-08.html').read_text(encoding='utf-8'),'html.parser')
de=''.join(x.get_text() for x in s.select('article pre[lang="de"]'))
assert de==''.join(u['source'] for u in t['segments'])
lines=(r/'dist/faust.txt').read_text(encoding='utf-8-sig').splitlines();contents=lines.index('Contents');start=next(i for i in range(contents+1,len(lines)) if lines[i]=='Zueignung');titles=[x.strip() for x in lines[contents+1:start] if x.strip()];positions=[];cursor=start
for title in titles:
 i=next(i for i in range(cursor,len(lines)) if lines[i].strip().rstrip('.')==title.rstrip('.'));positions.append(i);cursor=i+1
assert de=='\n'.join(lines[positions[7]+1:positions[8]]).strip()
assert [x.get_text() for x in s.select('article .ko-translation')]==[u['ko'] for u in t['segments']]
assert len(s.select('details.source-fold'))==11 and not s.select('details[open]')
sections=s.select('article > .illustrated-scene');n=len(sections);assert n in (16,32,48,60)
for sec,b in zip(sections,a['scenes']):
 assert sec['data-scene']==b['id'] and sec.find(recursive=False).name=='figure'
 assert sec.figure.find_next_sibling()['class']==['adaptation-prose']
 assert sec.select_one('.adaptation-prose > p').get_text()==b['narration']
 assert sec.select_one('.inner-voice .voice-label').get_text()==f'[독백: {b["speaker"]}]'
 assert (r/sec.img['src']).is_file()
assert len({x.img['src'] for x in sections})==n
assert not any(p.get_text().startswith('[나레이션:') for p in s.select('article p'))
report=dict(chapter=8,status='partial' if n<60 else 'complete',illustrations=n,planned=60,narration=n,monologues=n,closed_bilingual_units=11,source_chars=len(de),independent_gutenberg_match=True,source_sha256=hashlib.sha256(de.encode()).hexdigest(),tts_generated=False)
(r/'chapter08-production-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report))
