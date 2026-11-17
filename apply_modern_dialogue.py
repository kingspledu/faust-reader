from pathlib import Path
from bs4 import BeautifulSoup
import json,hashlib
r=Path(__file__).parent
def edits(name):
 result={}
 for row in (r/name).read_text(encoding='utf-8').splitlines():
  if row.strip():key,value=row.split('|',1);assert key not in result;result[key]=value.replace('\\n','\n')
 return result
monos=edits('modern_dialogue_edits.txt');narr=edits('modern_narration_edits.txt');used_m=set();used_n=set();report={'revision':'modern-dialogue-2026-11-17','chapters':[],'changes':[]}
def signature(s):
 return {'german':[x.get_text() for x in s.select('article pre[lang="de"]')],'korean':[x.get_text() for x in s.select('article .ko-translation')],'images':[x.get('src') for x in s.select('article figure img')],'scene_ids':[x.get('data-scene') for x in s.select('article>.illustrated-scene')],'folds':len(s.select('details.source-fold')),'open':len(s.select('details[open]'))}
for ch in range(1,13):
 jp=r/f'adaptations/chapter-{ch:02}.json';hp=r/f'chapter-{ch:02}.html';old=json.loads(jp.read_text(encoding='utf-8'));data=json.loads(json.dumps(old,ensure_ascii=False));s=BeautifulSoup(hp.read_text(encoding='utf-8'),'html.parser');before=signature(s);blocks=s.select('article .adaptation-prose');counts={'chapter':ch,'scenes':len(blocks),'narration_changed':0,'monologue_changed':0}
 if ch==11:
  approved=json.loads((r/'review/chapter-11-dialogue-v2.json').read_text(encoding='utf-8'));assert len(approved['scenes'])==len(data['scenes'])==len(blocks)
  data['scenes']=approved['scenes'];data['status']='illustration_aligned_reviewed'
 for i,b in enumerate(blocks):
  key=f'{ch:02}-{i+1:03}';oldn='\n'.join(p.get_text() for p in b.find_all('p',recursive=False));voice=b.select_one('.inner-voice');ps=[p for p in voice.find_all('p') if 'voice-label' not in p.get('class',[])];assert len(ps)==1;oldm=ps[0].get_text().strip('‘’')
  if ch==11:newn=data['scenes'][i]['narration'];newm=data['scenes'][i]['monologue']
  else:
   newn=narr.get(key,oldn);newm=monos.get(key,oldm)
   if key in narr:used_n.add(key)
   if key in monos:used_m.add(key)
  if newn!=oldn:
   for p in b.find_all('p',recursive=False):p.decompose()
   for text in newn.split('\n'):
    p=s.new_tag('p');p.string=text;voice.insert_before(p)
   counts['narration_changed']+=1;report['changes'].append({'chapter':ch,'scene':i+1,'kind':'narration','before':oldn,'after':newn})
  if newm!=oldm:ps[0].string='‘'+newm+'’';counts['monologue_changed']+=1;report['changes'].append({'chapter':ch,'scene':i+1,'kind':'monologue','before':oldm,'after':newm})
  if ch==1:data['passages'][i]=newn;data['monologues'][i]=newm
  else:data['scenes'][i].update(narration=newn,monologue=newm)
 data['prose_revision']='modern-dialogue-2026-11-17'
 assert signature(s)==before,f'Protected content changed in chapter{ch}'
 assert not s.select('details[open]')
 hp.write_text(str(s),encoding='utf-8');jp.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
 counts.update(protected_content_preserved=True,source_sha256=hashlib.sha256(''.join(before['german']).encode()).hexdigest(),image_count=len(before['images']),fold_count=before['folds']);report['chapters'].append(counts)
assert used_m==set(monos) and used_n==set(narr)
report['totals']={k:sum(c[k] for c in report['chapters']) for k in ('scenes','narration_changed','monologue_changed')}
(r/'modern-dialogue-revision-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report['totals']))
