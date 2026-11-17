from pathlib import Path
from bs4 import BeautifulSoup
import json,re,hashlib
r=Path(__file__).parent;cast=json.loads((r/'voice-cast.json').read_text(encoding='utf-8'));audit=json.loads((r/'dialogue-cast-revision-audit.json').read_text(encoding='utf-8'));index=json.loads((r/'tts-canvas/FAUST_AUDIO_INDEX_V04.json').read_text(encoding='utf-8'))
refs=json.loads((r/'art-bible/reference-index.json').read_text(encoding='utf-8'));ids={e['id'] for v in refs.values() if isinstance(v,list) for e in v if isinstance(e,dict) and e.get('kind')=='character'}
assert len(ids)==128 and ids<=set(cast['profiles'])
assert len(cast['prebuilt_voices'])==30 and all(p['voice_name'] in cast['prebuilt_voices'] and p['persona'] for p in cast['profiles'].values())
assert cast['model']=='gemini-2.5-flash-preview-tts'
lines=(r/'dist/faust.txt').read_text(encoding='utf-8-sig').splitlines();contents=lines.index('Contents');start=next(i for i in range(contents+1,len(lines)) if lines[i]=='Zueignung');titles=[x.strip() for x in lines[contents+1:start] if x.strip()];positions=[];cursor=start
for title in titles:
 i=next(i for i in range(cursor,len(lines)) if lines[i].strip().rstrip('.')==title.rstrip('.'));positions.append(i);cursor=i+1
reports=[]
for ch in range(1,len(audit["chapters"])+1):
 s=BeautifulSoup((r/f'chapter-{ch:02}.html').read_text(encoding='utf-8'),'html.parser');d=json.loads((r/f'adaptations/chapter-{ch:02}.json').read_text(encoding='utf-8'));before=audit['chapters'][ch-1]['protected']
 actual=dict(source=[x.get_text() for x in s.select('article pre[lang="de"]')],translations=[x.get_text() for x in s.select('article .ko-translation')],images=[x['src'] for x in s.select('article figure img')],anchors=[x.get('data-scene') for x in s.select('.illustrated-scene')])
 assert actual==before and not s.select('details.source-fold[open]')
 end=positions[ch] if ch<len(positions) else next(i for i in range(positions[ch-1]+1,len(lines)) if lines[i].startswith('*** END OF'))
 assert ''.join(actual['source'])=='\n'.join(lines[positions[ch-1]+1:end]).strip()
 for fold in s.select('details.source-fold'):
  for pre in fold.select('pre[lang="de"]'):assert 'ko-translation' in pre.find_next_sibling().get('class',[])
 for i,block in enumerate(s.select('article .adaptation-prose')):
  flow=d['scripts'][i] if ch==1 else d['scenes'][i]['script'];expected=[]
  for x in flow:expected.append(x['text'])
  actualflow=[]
  for node in block.find_all(['p','aside'],recursive=False):
   if node.name=='aside':actualflow.append(node.select_one('p:not(.voice-label)').get_text().strip('‘’'))
   else:actualflow.append(node.get_text().strip('“”'))
  assert actualflow==expected,(ch,i)
 for scene in s.select('.illustrated-scene'):
  assert scene.find(recursive=False).name=='figure' and 'adaptation-prose' in scene.figure.find_next_sibling().get('class',[])
 for im in s.select('article figure img'):assert (r/im['src']).is_file()
 episode=json.loads((r/f'tts-canvas/FAUST_C{ch:02}_V04_SCRIPT.json').read_text(encoding='utf-8'));units=episode['scenes'][0]['segments'];texts=[]
 for part in s.select('article .adaptation-intro,article .adaptation-prose'):
  for p in part.find_all('p'):
   if 'voice-label' not in p.get('class',[]) and p.get_text(' ',strip=True):texts.append(p.get_text(' ',strip=True).strip('‘’“”'))
 assert texts==[u['text'] for u in units]
 for u in units:
  profile=cast['profiles'][u['cast_id']];assert u['voice']==profile['voice_name'] and u['performance']['character_persona']==profile['persona'] and u['model']==cast['model']
  assert u['performance']['audio_effect']==('echo-v4' if u['kind']=='monologue' else 'dry')
  assert profile['mode']!='non_speaking'
  assert not any(x in u['text'] for x in ['메피스토펠레스','그레트헨','나레이션: 이야기 밖에서'])
  if u['kind']=='dialogue' and u['cast_id']=='character-008' and ch in (6,7,10,11,12,14,16,17):
   assert not re.search(r'(어요|에요|예요|죠|네요|세요|습니까|습니다)[.!?…]?$',u['text']),(ch,u['text'])
 html=(r/f'tts-canvas/FAUST_C{ch:02}_V04_GEMINI_CANVAS_TTS.html').read_text(encoding='utf-8');assert f'models/{cast["model"]}:generateContent' in html
 assert "turn.kind==='monologue')" in html and "effect:turns[index].kind==='monologue'?'echo-v4':'dry'" in html
 assert 'character_persona' in html and '배역 음성 누락' in html and 'const apiKey = ""' in html
 embedded=json.loads(re.search(r'const originalEpisode = (.*?);\s*const originalStory =',html,re.S).group(1));assert embedded==episode
 items=[e for e in index['segments'] if e['chapter']==ch];assert [e['filename'] for e in items]==[u['filename'] for u in units]
 reports.append(dict(chapter=ch,scenes=len(s.select('.adaptation-prose')),tts_segments=len(units),dialogue=sum(u['kind']=='dialogue' for u in units),monologues=sum(u['kind']=='monologue' for u in units),source_translation_images_preserved=True))
 print('PASS chapter',ch,'segments',len(units))
assert len({e['filename'] for e in index['segments']})==len(index['segments'])
assert len(index['segments'])==sum(x['tts_segments'] for x in reports)
(r/'dialogue-cast-verification.json').write_text(json.dumps(dict(status='passed',cast_profiles=len(cast['profiles']),reference_entries_covered=len(ids),chapters=reports,tts_segments=len(index['segments']),audio_generated=False,listening_test=False),ensure_ascii=False,indent=2),encoding='utf-8')
print('PASS: completed chapters;128 reference entries covered;cast/role/effect/index aligned')
