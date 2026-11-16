from pathlib import Path
import re,json
root=Path('faust-reader')
replacements={
'이 재서술에서는 그 목소리를 따라가기 쉽도록, 시 속에서 말하는 사람을 이름 없는 시인으로 그렸다. 시인은 파우스트와 다른 인물이며, 뒤이어 나오는 극장 서막의 ‘시인’과도 같은 사람이라고 정하지 않는다.':'',
'앞 장의 시인은 기억을 돌아보는 목소리였지만, 여기의 시인은 공연을 준비하는 대화 속 인물이다. 두 사람이 같은 사람이라고 생각할 필요는 없다.':'',
'아래의 나레이션과 독백은 원문과 삽화를 바탕으로 이해를 돕기 위해 다시 쓴 글이다. 독백은 인물이 마음속으로 하는 말이며, 원문에 그대로 있는 대사는 아니다.':'',
'원문에서 시인이 말하는 조화는 이런 연결을 뜻한다.':'시인이 말하는 조화는 이런 연결이었다.',
'원문에서':'이야기에서'}
for directory in [root,root/'dist']:
 for c in [1,2]:
  f=directory/f'chapter-{c:02}.html';s=f.read_text(encoding='utf-8');de=re.findall(r'<pre lang="de">(.*?)</pre>',s,re.S);ko=re.findall(r'<div class="ko-translation" lang="ko">(.*?)</div>',s,re.S)
  s=re.sub(r'<p class="translation-note">.*?</p>','',s,flags=re.S)
  def clean(m):
   v=m[0]
   for a,b in replacements.items():v=v.replace(a,b)
   return re.sub(r'<p>\s*</p>','',v)
  s=re.sub(r'<section class="adaptation-(?:intro|prose)".*?</section>',clean,s,flags=re.S)
  assert re.findall(r'<pre lang="de">(.*?)</pre>',s,re.S)==de;assert re.findall(r'<div class="ko-translation" lang="ko">(.*?)</div>',s,re.S)==ko
  f.write_text(s,encoding='utf-8')
for c in [1,2]:
 p=root/f'adaptations/chapter-{c:02}.json';d=json.loads(p.read_text(encoding='utf-8'))
 def walk(v):
  if isinstance(v,str):
   for a,b in replacements.items():v=v.replace(a,b)
   return v
  if isinstance(v,list):return [walk(x) for x in v]
  if isinstance(v,dict):return {k:walk(x) for k,x in v.items()}
  return v
 p.write_text(json.dumps(walk(d),ensure_ascii=False,indent=2),encoding='utf-8')
print('Removed meta notices in chapters 1 and 2; preserved narration labels, German and Korean.')
