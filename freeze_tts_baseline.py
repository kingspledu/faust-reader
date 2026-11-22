"""Record current source inputs; does not approve sentence-level production."""
from pathlib import Path
import hashlib,json,subprocess
from bs4 import BeautifulSoup
r=Path(__file__).parent;out=r/'production/tts';out.mkdir(parents=True,exist_ok=True)
files=['cleanroom-novel.txt','voice-cast.json','FAUST_PRODUCTION_GUIDELINES.md','audition/approved-cast.json']
chapters=[]
for ch in range(1,29):
 path=f'chapter-{ch:02}.html';soup=BeautifulSoup((r/path).read_text(encoding='utf-8'),'html.parser')
 blocks=[]
 for block in soup.select('article .adaptation-intro, article .adaptation-prose'):
  scene=block.find_parent('section',class_='illustrated-scene')
  for p in block.find_all('p'):
   if 'voice-label' in p.get('class',[]):continue
   blocks.append(dict(scene_id=scene.get('data-scene') if scene else f'c{ch:02}-intro',text=p.get_text(' ',strip=True),declared_speaker=p.get('data-speaker'),declared_cast=p.get('data-cast'),declared_role=p.get('data-role'),status='sentence-and-speaker-review-required'))
 chapters.append(dict(chapter=ch,paragraphs=blocks))
 files.extend([path,f'adaptations/chapter-{ch:02}.json'])
cast=json.loads((r/'voice-cast.json').read_text(encoding='utf-8'))
manifest=dict(baseline_id='FAUST-P1-TTS-BASELINE-2026-11-23',scope='Part I chapters 1–28; published Korean adaptation only',source_commit=subprocess.check_output(['git','-c','safe.directory='+r.as_posix(),'rev-parse','HEAD'],cwd=r,text=True).strip(),cast_revision=cast['revision'],model=cast['model'],files={p:hashlib.sha256((r/p).read_bytes()).hexdigest() for p in files},selected_roles={cid:dict(voice=p['voice_name'],persona=p.get('persona',''),audition_status=p.get('audition_status')) for cid,p in cast['profiles'].items()},production_unit='one sentence per request and individual audio file',target_duration=None,approval='Input snapshot only; not sentence/speaker/acting approval',existing_tts_status='Legacy paragraph-based output; must not be used as sentence-reviewed production')
(out/'baseline.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(out/'published-prose.snapshot.json').write_text(json.dumps(chapters,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert len(chapters)==28 and all(c['paragraphs'] for c in chapters)
for p,h in manifest['files'].items():assert hashlib.sha256((r/p).read_bytes()).hexdigest()==h
print('PASS:28 chapters frozen;',len(files),'input hashes;',sum(p.get('audition_status')=='user_selected' for p in cast['profiles'].values()),'selected roles; no duration target')
