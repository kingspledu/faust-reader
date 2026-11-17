from pathlib import Path as _CastPath
import runpy as _CastRun
if (_CastPath(__file__).parent/'dialogue-cast-revision-audit.json').exists():
 _CastRun.run_path(str(_CastPath(__file__).parent/'verify_dialogue_cast.py'),run_name='__main__');raise SystemExit(0)
from pathlib import Path
from bs4 import BeautifulSoup
import json,hashlib
r=Path(__file__).parent;report=json.loads((r/'modern-dialogue-revision-audit.json').read_text(encoding='utf-8'));index=json.loads((r/'tts-canvas/FAUST_AUDIO_INDEX_V04.json').read_text(encoding='utf-8'))
lines=(r/'dist/faust.txt').read_text(encoding='utf-8-sig').splitlines();contents=lines.index('Contents');start=next(i for i in range(contents+1,len(lines)) if lines[i]=='Zueignung');titles=[x.strip() for x in lines[contents+1:start] if x.strip()];positions=[];cursor=start
for title in titles:
 i=next(i for i in range(cursor,len(lines)) if lines[i].strip().rstrip('.')==title.rstrip('.'));positions.append(i);cursor=i+1
for ch in range(1,13):
 s=BeautifulSoup((r/f'chapter-{ch:02}.html').read_text(encoding='utf-8'),'html.parser');d=json.loads((r/f'adaptations/chapter-{ch:02}.json').read_text(encoding='utf-8'));blocks=s.select('article .adaptation-prose');expected=[]
 for i,b in enumerate(blocks):
  narration=d['passages'][i] if ch==1 else d['scenes'][i]['narration'];mono=d['monologues'][i] if ch==1 else d['scenes'][i]['monologue']
  assert '\n'.join(p.get_text() for p in b.find_all('p',recursive=False))==narration
  assert b.select_one('.inner-voice p:not(.voice-label)').get_text().strip('‘’')==mono
  speaker='시인' if ch==1 else d['scenes'][i].get('speaker',d['scenes'][i].get('monologue_speaker'))
  assert b.select_one('.voice-label').get_text()==f'[독백: {speaker}]'
 for section in s.select('article>.illustrated-scene'):
  assert section.find(recursive=False).name=='figure'
  assert 'adaptation-prose' in section.figure.find_next_sibling().get('class',[])
 for fold in s.select('details.source-fold'):
  for german in fold.select('pre[lang="de"]'):
   assert 'ko-translation' in german.find_next_sibling().get('class',[])
 for part in s.select('article .adaptation-intro,article .adaptation-prose'):
  for p in part.find_all('p'):
   if 'voice-label' not in p.get('class',[]) and p.get_text(' ',strip=True):expected.append(p.get_text(' ',strip=True).strip('‘’'))
 episode=json.loads((r/f'tts-canvas/FAUST_C{ch:02}_V04_SCRIPT.json').read_text(encoding='utf-8'));units=episode['scenes'][0]['segments'];assert [u['text'] for u in units]==expected
 filenames=[x['filename'] for x in index['segments'] if x['chapter']==ch];assert filenames==[u['filename'] for u in units]
 for u in units:
  assert u['performance']['audio_effect']==('dry' if u['speaker']=='나레이터' else 'echo-v4')
  assert '속삭임으로 바꾸거나' in u['performance']['mic_direction'] if u['speaker']!='나레이터' else True
 before=report['chapters'][ch-1];assert hashlib.sha256(''.join(x.get_text() for x in s.select('article pre[lang="de"]')).encode()).hexdigest()==before['source_sha256']
 assert ''.join(x.get_text() for x in s.select('article pre[lang="de"]'))=='\n'.join(lines[positions[ch-1]+1:positions[ch]]).strip()
 assert len(s.select('details.source-fold'))==before['fold_count'] and len(s.select('article figure img'))==before['image_count'] and not s.select('details[open]')
 assert all((r/im['src']).is_file() for im in s.select('article figure img'))
 print(f'Chapter{ch:02}: source/translation/images protected; {len(units)} TTS segments aligned')
assert len({x['filename'] for x in index['segments']})==len(index['segments'])
(r/'modern-dialogue-verification.json').write_text(json.dumps({'chapters':12,'scenes':sum(c['scenes'] for c in report['chapters']),'tts_segments':len(index['segments']),'gutenberg_independent_match':True,'text_and_index_aligned':True,'source_translation_images_preserved':True,'real_audio_generated':False},ensure_ascii=False,indent=2),encoding='utf-8');print('PASS:12 chapters,all text/index/effect routes')
