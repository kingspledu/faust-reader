import json,hashlib,sys
from pathlib import Path
r=Path(__file__).parent
data=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8-sig'))
catalog=json.loads((r/'audition/catalog.json').read_text(encoding='utf-8'))
cast=json.loads((r/'voice-cast.json').read_text(encoding='utf-8'))
assert data['schema']=='faust-casting-selection-1' and data['revision']=='AUD02' and data['model']==cast['model']
roles={x['id']:x for x in catalog['roles']};changes=[]
for cid,v in data['votes'].items():
 role=roles[cid];ratings=v.get('ratings',{});scores={}
 for key,value in ratings.items():
  voice,q=key.rsplit(':',1);assert voice in role['voices'] and q in {x['id'] for x in role['questions']}
  if value!='':assert str(value) in ['1','2','3','4','5'];scores.setdefault(voice,[]).append(int(value))
 first=v.get('first')
 if first:
  assert first in role['voices'];reason='explicit-first'
 else:
  complete={k:sum(x)/len(x) for k,x in scores.items() if len(x)==len(role['questions'])}
  assert complete,cid
  top=max(complete.values());winners=[k for k,x in complete.items() if x==top]
  assert len(winners)==1,(cid,'ambiguous ratings');first=winners[0];reason='unique-complete-rated-candidate'
 p=cast['profiles'][cid];old=p['voice_name'];p.update(voice_name=first,audition_status='user_selected',audition_revision='AUD02',selection_basis=reason)
 changes.append(dict(cast_id=cid,name=role['name'],previous=old,selected=first,basis=reason,ratings=ratings,reserve=v.get('reserve')))
 role['selected_voice']=first;role['selection_basis']=reason
cast['revision']='CAST-2026-11-23-AUD02'
(r/'voice-cast.json').write_text(json.dumps(cast,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(r/'audition/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf-8')
report=dict(schema='faust-approved-cast-1',revision=cast['revision'],source_sha256=hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest(),rule='Explicit first wins; otherwise unique highest candidate rated on all questions',narrator_conflict='Explicit Charon retained; Kore 5-point ratings preserved',changes=changes)
(r/'audition/approved-cast.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
from bs4 import BeautifulSoup
p=r/'voice-cast.html';soup=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser')
# Refresh the public reference table from the authoritative cast instead of rerunning legacy defaults.
for tr in soup.select('tr'):
 cells=tr.find_all(['td','th'])
 for change in changes:
  if any(c.get_text(strip=True)==change['cast_id'] for c in cells):
   for cell in cells:
    if cell.get_text(strip=True)==change['previous']:cell.string=change['selected']
p.write_text(str(soup),encoding='utf-8')
print('Applied',len(changes),'roles;',sum(x['previous']!=x['selected'] for x in changes),'voice changes; narrator explicit Charon')
