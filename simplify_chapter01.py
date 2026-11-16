from pathlib import Path
import re,json,html
root=Path(__file__).parent
replace={'헌시의 화자를 이름 없는 시인으로 그렸다.':'시 속에서 말하는 사람을 이름 없는 시인으로 그렸다.','헌시의 화자를 인물화한 각색':'시 속에서 말하는 사람을 이름 없는 시인으로 바꿔 쓴 이야기','옛 벗':'옛 친구','벗들':'친구들','벗이':'친구가','벗을':'친구를','벗과':'친구와','헌시는 본격적인 이야기가 시작되기 전에 지난 삶과 소중한 사람들에게 마음을 전하는 시다.':'헌시는 소중한 사람들에게 바치는 시를 말한다. 이 작품에서는 본격적인 이야기가 시작되기 전에, 지나온 삶과 그때 함께했던 사람들을 돌아본다.','헌시가 본격적인':'소중한 사람들에게 바치는 시가 본격적인','모습으로 인물화':'모습으로 표현','형상들이':'모습들이','형상이':'모습이','형상은':'모습은','형상들이었다':'모습들이었다','희미했던 형상':'희미했던 모습','형상을':'모습을','헌시의 원문과 삽화를 바탕으로 재서술한 3인칭 각색입니다.':'「헌시」의 원문과 그림을 바탕으로, 이야기 밖의 서술자가 인물의 행동과 마음을 설명하도록 다시 쓴 글입니다.','갈망':'간절한 바람','전율':'떨림','애정':'사랑하는 마음','애수':'슬픔','현이':'줄이','현을':'줄을','현은':'줄은','청중석':'듣는 사람들의 자리','첫 청중':'처음 노래를 들어 준 사람들','새 청중':'새로 노래를 듣는 사람들','그 청중':'그 노래를 듣는 사람들','새로운 인정':'새로 듣는 칭찬','낱낱':'하나하나'}
for directory in [root,root/'dist']:
 f=directory/'chapter-01.html';s=f.read_text(encoding='utf-8');de=re.findall(r'<pre lang="de">(.*?)</pre>',s,re.S);ko=re.findall(r'<div class="ko-translation" lang="ko">(.*?)</div>',s,re.S)
 # Only rewrite adaptation sections and introductory adaptation notice.
 def simplify(m):
  value=m[0]
  for a,b in replace.items():value=value.replace(a,b)
  value=value.replace('시인은 그 침묵이 두렵지 않았다.','시인은 그 고요함이 두렵지 않았다.').replace('내면','마음속')
  return value
 s=re.sub(r'<section class="adaptation-(?:intro|prose)".*?</section>',simplify,s,flags=re.S)
 s=re.sub(r'<p class="translation-note">.*?</p>',simplify,s,flags=re.S)
 s=s.replace('[나레이션: 전지적 서술자]','[나레이션: 이야기 밖에서 인물의 마음까지 알려 주는 서술자]')
 assert re.findall(r'<pre lang="de">(.*?)</pre>',s,re.S)==de;assert re.findall(r'<div class="ko-translation" lang="ko">(.*?)</div>',s,re.S)==ko
 f.write_text(s,encoding='utf-8')
p=root/'adaptations/chapter-01.json';d=json.loads(p.read_text(encoding='utf-8'))
def walk(v):
 if isinstance(v,str):
  for a,b in replace.items():v=v.replace(a,b)
  return v
 if isinstance(v,list):return [walk(x) for x in v]
 if isinstance(v,dict):return {k:walk(x) for k,x in v.items()}
 return v
d=walk(d);d['reading_level_note']='중학생 대상: 벗→친구, 형상→모습, 현→줄. 헌시는 뜻을 풀어 설명. 원문·번역은 수정하지 않음.';p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
p=root/'AGENTS.md';s=p.read_text(encoding='utf-8');s+='\nUse familiar middle-school Korean in adaptation prose: 친구 rather than 벗; explain 헌시 as 소중한 사람들에게 바치는 시, 화자 as 시 속에서 말하는 사람. Prefer 모습, 마음속, 악기의 줄 over unnecessary literary jargon. Preserve original German and existing translated quotations.\n';p.write_text(s,encoding='utf-8');print('Adaptation vocabulary simplified; source text and translation preserved')
