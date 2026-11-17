from pathlib import Path
from bs4 import BeautifulSoup
import json,re,hashlib
r=Path(__file__).parent
def rename(s):return s.replace('메피스토펠레스','메피스토').replace('그레트헨','그레첸')
cast=json.loads((r/'voice-cast.json').read_text(encoding='utf-8'))
def cast_id(speaker,ch):
 return cast['chapter_alias_overrides'].get(str(ch),{}).get(speaker) or cast['aliases'][speaker]
patches={}
for p in sorted((r/'review').glob('dialogue_v3_*.txt')):
 for line in p.read_text(encoding='utf-8').splitlines():
  if not line.strip():continue
  key,*parts=rename(line).split('|');ch,no=map(int,key.split('.'));flow=[]
  for j,text in enumerate(parts):
   if text.startswith('#'):flow.append(dict(role='narration',speaker='나레이터',text=text[1:]))
   elif '>' in text:
    sp,t=text.split('>',1);flow.append(dict(role='dialogue',speaker=sp,text=t))
   else:flow.append(dict(role='narration',speaker='나레이터',text=text))
  assert (ch,no) not in patches;patches[ch,no]=flow
qmap={
 13:{1:['마르테'],2:['그레첸','마르테'],4:['마르테'],5:['그레첸'],6:['마르테','메피스토','마르테'],7:['마르테'],9:['메피스토'],10:['메피스토','마르테'],11:['그레첸'],14:['마르테'],19:['마르테'],20:['메피스토','마르테'],22:['마르테'],27:['메피스토'],28:['그레첸','메피스토'],31:['마르테']},
 14:{1:['파우스트'],10:['파우스트']},
 15:{1:['그레첸','파우스트'],2:['그레첸'],3:['마르테','메피스토'],4:['마르테','메피스토','마르테'],5:['그레첸','파우스트'],6:['그레첸','파우스트'],7:['그레첸'],8:['그레첸'],9:['그레첸'],10:['그레첸','그레첸'],11:['마르테','메피스토','마르테'],12:['마르테','메피스토','마르테'],13:['메피스토','메피스토'],14:['파우스트','그레첸','파우스트'],15:['그레첸'],16:['그레첸','그레첸'],17:['파우스트','그레첸','그레첸'],18:['그레첸','그레첸'],19:['그레첸','그레첸'],20:['파우스트'],21:['파우스트','파우스트'],22:['마르테'],23:['마르테','메피스토'],24:['메피스토']},
 16:{1:['그레첸','파우스트'],6:['그레첸']},
 17:{1:['파우스트'],15:['파우스트']},
 11:{2:['메피스토','파우스트','메피스토'],10:['메피스토','파우스트'],11:['메피스토','메피스토'],12:['파우스트','메피스토'],13:['메피스토','메피스토'],14:['메피스토','그레첸'],15:['그레첸'],16:['그레첸'],17:['그레첸'],18:['그레첸','그레첸'],19:['그레첸'],20:['그레첸'],21:['그레첸']}}
def split(text,speakers,ch,no):
 found=re.findall('“([^”]*)”',text);assert len(found)==len(speakers),(ch,no,len(found),speakers)
 flow=[];pos=0
 for m,sp in zip(re.finditer('“([^”]*)”',text),speakers):
  for n in text[pos:m.start()].strip().split('\n'):
   if n.strip():flow.append(dict(role='narration',speaker='나레이터',text=n.strip()))
  flow.append(dict(role='dialogue',speaker=sp,text=m.group(1)));pos=m.end()
 for n in text[pos:].strip().split('\n'):
  if n.strip():flow.append(dict(role='narration',speaker='나레이터',text=n.strip()))
 return flow
audit=[]
for ch in range(1,18):
 p=r/f'chapter-{ch:02}.html';s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser');datafile=r/f'adaptations/chapter-{ch:02}.json';d=json.loads(datafile.read_text(encoding='utf-8'))
 before=dict(source=[x.get_text() for x in s.select('article pre[lang="de"]')],translations=[x.get_text() for x in s.select('article .ko-translation')],images=[x['src'] for x in s.select('article figure img')],anchors=[x.get('data-scene') for x in s.select('.illustrated-scene')])
 (r/'review/dialogue-v3-before').mkdir(exist_ok=True)
 backup=r/f'review/dialogue-v3-before/chapter-{ch:02}.json'
 if not backup.exists():backup.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
 if ch==11:
  sample=json.loads((r/'review/chapter-11-dialogue-v3-sample.json').read_text(encoding='utf-8'))
  for old,new in zip(d['scenes'],sample['scenes']):old.update(narration=new['narration'],monologue=new['monologue'] or '',speaker=new['monologue_speaker'] or old['speaker'])
 count_dialogue=0;count_mono=0
 for no,prose in enumerate(s.select('article .adaptation-prose'),1):
  b=None if ch==1 else d['scenes'][no-1]
  text=d['passages'][no-1] if ch==1 else b['narration'];old_mono=d['monologues'][no-1] if ch==1 else b.get('monologue','');sp='시인' if ch==1 else b.get('speaker',b.get('monologue_speaker'))
  if (ch,no) in patches and ch!=11:flow=[dict(x) for x in patches[ch,no]]
  else:flow=split(text,qmap.get(ch,{}).get(no,[]),ch,no)
  # 원문 독백 중심의 장면만 선택적으로 유지. 대화 도중 매 그림마다 반복하던 속마음은 제거.
  keep=(ch==11 and bool(old_mono)) or (ch==1 and no in (1,6,11,16)) or (ch==4 and no in (2,11,20,34,50)) or (ch==6 and no in (6,8,10,43)) or (ch==7 and no in (9,38,58)) or (ch==9 and no in (17,46)) or (ch==13 and no in (1,27)) or (ch==15 and no in (8,18)) or (ch==16 and no==6) or (ch==17 and no in (3,18))
  if keep and old_mono:flow.append(dict(role='monologue',speaker=sp,text=old_mono))
  for x in flow:x['cast_id']=cast_id(x['speaker'],ch)
  assert all(x['text'] for x in flow)
  if b is not None:
   b['script']=flow;b['narration']='\n'.join('“'+x['text']+'”' if x['role']=='dialogue' else x['text'] for x in flow if x['role']!='monologue');b['monologue']=old_mono if keep else ''
  else:
   d.setdefault('scripts',[])
   if no==1:d['scripts']=[]
   d['scripts'].append(flow);d['monologues'][no-1]=old_mono if keep else ''
  prose.clear()
  for x in flow:
   if x['role']=='monologue':
    aside=s.new_tag('aside',attrs={'class':'inner-voice','data-role':'monologue','data-speaker':x['speaker'],'data-cast':x['cast_id']});label=s.new_tag('p',attrs={'class':'voice-label'});label.string=f'[독백: {x["speaker"]}]';aside.append(label);z=s.new_tag('p');z.string='‘'+x['text']+'’';aside.append(z);prose.append(aside);count_mono+=1
   else:
    z=s.new_tag('p',attrs={'data-role':x['role'],'data-speaker':x['speaker'],'data-cast':x['cast_id']});z.string='“'+x['text']+'”' if x['role']=='dialogue' else x['text'];prose.append(z);count_dialogue+=x['role']=='dialogue'
  prose['data-script-revision']='dialogue-cast-v3'
 # 나레이션 소개 역시 명시적으로 분류한다.
 for intro in s.select('article .adaptation-intro p'):
  if 'voice-label' not in intro.get('class',[]):intro['data-role']='narration';intro['data-speaker']='나레이터';intro['data-cast']='narrator'
 assert before==dict(source=[x.get_text() for x in s.select('article pre[lang="de"]')],translations=[x.get_text() for x in s.select('article .ko-translation')],images=[x['src'] for x in s.select('article figure img')],anchors=[x.get('data-scene') for x in s.select('.illustrated-scene')])
 assert not s.select('details.source-fold[open]')
 if not s.select_one('header a[href="voice-cast.html"]'):
  a=s.new_tag('a',href='voice-cast.html');a.string='성우·연기 설정';s.header.append(a)
 p.write_text(str(s),encoding='utf-8');d['prose_revision']='dialogue-cast-v3';d['voice_cast']='voice-cast.json';d['reader_editorial_policy']='친절한 전지적 서술, 원문에 근거한 인물 간 대화, 필요한 자리의 독백만 유지. 메피스토·그레첸 표기. 메피스토는 파우스트에게 느긋한 반말.';datafile.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
 audit.append(dict(chapter=ch,scenes=len(s.select('.adaptation-prose')),dialogue_turns=count_dialogue,monologues=count_mono,protected=before))
 print(f'Chapter{ch:02}: {count_dialogue} spoken turns,{count_mono} inner thoughts; source/translation/images unchanged')
(r/'dialogue-cast-revision-audit.json').write_text(json.dumps(dict(revision='dialogue-cast-v3',chapters=audit,patch_count=len(patches)),ensure_ascii=False,indent=2),encoding='utf-8')
