"""Import explicitly supplied sentence ZIP; never trust archive paths or metadata alone."""
import hashlib,io,json,zipfile,sys
chapter=int(sys.argv[1]) if len(sys.argv)>1 else 1
code=f"{chapter:02}"
count={1:60,2:170}[chapter]
from pathlib import Path
import av
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parents[2];work=Path(__file__).parent
archive=Path.home()/'Downloads'/f'FAUST_P1_C{code}_S01_MP3.zip'
doc=json.loads((work/f'chapter-{code}-sentences.json').read_text(encoding='utf-8'))
script=json.loads((work/f'output/FAUST_P1_C{code}_S01_SCRIPT.json').read_text(encoding='utf-8'))
turns=[s for scene in script['scenes'] for s in scene['segments']]
page=root/f'chapter-{code}.html';html=page.read_text(encoding='utf-8');soup=BeautifulSoup(html,'html.parser')
paras=[p for p in soup.select('.adaptation-prose p,.adaptation-intro p') if 'voice-label' not in p.get('class',[])]
assert len(paras)==len(doc['paragraphs'])
for p,expected in zip(paras,doc['paragraphs']):assert p.get_text(' ',strip=True)==expected['text']
dest=root/f'audio/part-1/chapter-{code}';dest.mkdir(parents=True,exist_ok=True)
rows=[];hashes=set();pending=[]
with zipfile.ZipFile(archive) as z:
 assert len(z.namelist())==len(set(z.namelist()))
 index=json.loads(z.read(f'FAUST_P1_C{code}_S01_MP3_INDEX.json'))
 assert index['complete'] and not index['missing']
 assert len(index['segments'])==len(turns)==len(doc['sentences'])==count
 for i,(row,turn,s) in enumerate(zip(index['segments'],turns,doc['sentences'])):
  name=row['filename'];assert Path(name).name==name and '/' not in name and '\\' not in name
  assert row['order']==i and name==turn['filename'].replace('.wav','.mp3')
  assert row['text']==s['text']==turn['text']
  assert row['text_sha256']==hashlib.sha256(s['text'].encode()).hexdigest()
  assert row['voice']==s['voice'] and row['kind']==s['kind'] and row['speaker']==turn['speaker']
  data=z.read(name);digest=hashlib.sha256(data).hexdigest();assert digest not in hashes;hashes.add(digest)
  frames=list(av.open(io.BytesIO(data)).decode(audio=0));assert frames
  duration=sum(f.samples/f.sample_rate for f in frames);assert duration>0
  pending.append((name,data))
  rows.append(dict(sentence_id=s['sentence_id'],paragraph_id=s['paragraph_id'],scene_id=s['scene_id'],text=s['text'],speaker=s['speaker'],kind=s['kind'],voice=s['voice'],url=name,sha256=digest,bytes=len(data),duration=round(duration,4)))
 assert {n for n in z.namelist() if n.endswith('.mp3')}=={r['url'] for r in rows}
for name,data in pending:(dest/name).write_bytes(data)
manifest=dict(chapter=chapter,revision='S01',sentences=rows,total_seconds=round(sum(r['duration'] for r in rows),2),audio_content_listening_verified=False,effects_provenance='Canvas browser_generated_cache export; imported without additional DSP')
(dest/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
marker=f'<script src="assets/audiobook/player.js" data-audio-manifest="audio/part-1/chapter-{code}/manifest.json" defer></script>'
if marker not in html:page.write_text(html+'\n'+marker+'\n',encoding='utf-8')
report=dict(files=count,missing=[],duplicates=[],all_decoded=True,text_voice_kind_hash_match=True,total_seconds=manifest['total_seconds'],archive_sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),listening_verified=False)
(work/f'chapter-{code}-audio-import.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(report)
