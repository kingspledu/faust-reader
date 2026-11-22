import hashlib,io,json,sys,zipfile
from pathlib import Path
import av
r=Path(__file__).parent;c=json.loads((r/'audition/catalog.json').read_text(encoding='utf-8'))
expected={x['filename'].replace('.wav','.mp3'):x for role in c['roles'] for x in role['files']}
z=zipfile.ZipFile(sys.argv[1]);assert len(z.namelist())==len(set(z.namelist()))
indices=[n for n in z.namelist() if n.endswith('.json')];assert len(indices)==1
idx=json.loads(z.read(indices[0]));assert idx['schema']=='mp3-zip-index-1'
rows=idx['segments'];assert len(rows)==len({s['filename'] for s in rows})
verified=[];payloads={}
for s in rows:
 name=s['filename'];assert Path(name).name==name and name in expected
 e=expected[name];assert s['text']==e['text'] and s['text_sha256']==e['text_sha256'] and s['voice']==e['voice']
 assert hashlib.sha256(s['text'].encode()).hexdigest()==s['text_sha256']
 data=z.read(name);frames=0;samples=0;peak=0
 with av.open(io.BytesIO(data)) as container:
  for f in container.decode(audio=0):
   a=f.to_ndarray();frames+=1;samples+=f.samples;peak=max(peak,float(abs(a).max()))
   rate=f.sample_rate
 assert frames and samples>rate*.2 and peak>0,name
 verified.append(dict(filename=name,bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),duration=round(samples/rate,3),voice=s['voice'],role_id=e['role_id'],effect=e['effect'],text_sha256=e['text_sha256'],audio='audio/'+name));payloads[name]=data
assert set(z.namelist())==set(payloads)|set(indices)|{n for n in z.namelist() if n.endswith('_INDEX.csv')},'Unexpected archive files'
assert len({s['sha256'] for s in verified})==len(verified),'Duplicate audio bytes'
out=r/'audition/audio';out.mkdir(exist_ok=True)
for name,data in payloads.items():(out/name).write_bytes(data)
links={x['filename']:x for x in verified}
for role in c['roles']:
 for e in role['files']:
  found=links.get(e['filename'].replace('.wav','.mp3'))
  if found:e.update(audio=found['audio'],audio_sha256=found['sha256'],duration=found['duration'])
c['audio_status']='imported-decode-verified-not-listening-verified';c['audio_count']=len(verified)
(r/'audition/catalog.json').write_text(json.dumps(c,ensure_ascii=False,indent=2),encoding='utf-8')
report=dict(schema='faust-audition-import-1',imported=len(verified),expected=len(expected),missing=sorted(set(expected)-set(payloads)),zip_sha256=hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest(),transcripts_and_voices_match=True,all_mp3_decoded=True,actual_listening_verified=False,files=verified)
(r/'audition/audio-import-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('PASS:',len(verified),'MP3s; transcript/voice hashes match; all decode; missing',len(report['missing']))
