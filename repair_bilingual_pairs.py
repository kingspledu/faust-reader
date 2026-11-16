from pathlib import Path
import re,json,html
root=Path('faust-reader')
for ch in [2,3]:
 tr=json.loads((root/f'translations/chapter-{ch:02}.ko.json').read_text(encoding='utf-8'))['segments'];pairs=[e for e in tr if e['source'].strip()];assert all(e['ko'].strip() for e in pairs)
 for directory in [root,root/'dist']:
  f=directory/f'chapter-{ch:02}.html';s=f.read_text(encoding='utf-8');before=''.join(html.unescape(x) for x in re.findall(r'<pre lang="de">(.*?)</pre>',s,re.S));s=re.sub(r'<pre lang="de">.*?</pre>','',s,flags=re.S);cursor=[0]
  def pair(m):
   e=pairs[cursor[0]];cursor[0]+=1;assert html.unescape(m[1])==e['ko'];return '<pre lang="de">'+html.escape(e['source'])+'</pre>'+m[0]
  s=re.sub(r'<div class="ko-translation" lang="ko">(.*?)</div>',pair,s,flags=re.S);assert cursor[0]==len(pairs);assert ''.join(html.unescape(x) for x in re.findall(r'<pre lang="de">(.*?)</pre>',s,re.S))==before
  # Remove folds emptied by reunifying source fragments. No narrative/images removed.
  s=re.sub(r'<details class="source-fold"><summary>[^<]*</summary>\s*</details>','',s,flags=re.S)
  for m in re.finditer(r'<pre lang="de">(.*?)</pre>',s,re.S):assert re.match(r'<div class="ko-translation"',s[m.end():])
  f.write_text(s,encoding='utf-8')
p=root/'AGENTS.md';s=p.read_text(encoding='utf-8');s+='\nEvery nonempty German source block must be immediately paired with its corresponding Korean translation inside the same expandable source area. Do not split German blocks at illustration anchors while leaving translation only at a later anchor. Keep complete translation-aligned source units together.\n';p.write_text(s,encoding='utf-8');print('Chapters 2 and 3 repaired: every German block immediately paired with Korean; complete German and Korean strings preserved.')
