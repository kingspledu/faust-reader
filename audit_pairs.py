from pathlib import Path
import re,html,json
root=Path('faust-reader')
for ch in [1,2,3]:
 s=(root/f'chapter-{ch:02}.html').read_text(encoding='utf-8');matches=list(re.finditer(r'<pre lang="de">(.*?)</pre>',s,re.S));missing=[]
 for i,m in enumerate(matches):
  if not html.unescape(m[1]).strip():continue
  nxt=s[m.end():];immediate=re.match(r'\s*<div class="ko-translation"',nxt)
  if not immediate:missing.append((i,ascii(html.unescape(m[1])[:90])))
 print(ch,missing)
