from pathlib import Path
import json,re,html
root=Path(__file__).parent;exec((root/'build.py').read_text(encoding='utf-8-sig').split("page='''")[0]);d=json.loads((root/'dense-scene-plan.json').read_text(encoding='utf-8'))
# Existing distinct source illustrations already portray these beats; register their reuse at corrected anchors.
for n,old in [(10,14),(11,12),(12,13),(13,16),(14,15)]:
 e=next(e for e in d['scenes'] if e['id']==f'c03-dense-{n:03}');e.update(image=f'illustrations/c03-s{old:03}.webp',status='published',placement_note='기존 고유 삽화를 대응 원문 시작점으로 재배치. 새 생성 아님.')
original=chapters[2]['text'];done=[e for e in d['scenes'] if e['chapter']==3];trans=json.loads((root/'translations/chapter-03.ko.json').read_text(encoding='utf-8'))['segments'];ends={};offset=0
for e in trans:offset+=len(e['source']);ends[offset]=e['ko']
assert offset==len(original)
points=sorted(set([0,len(original),*ends,*[e['source_start'] for e in done]]));parts=[]
for a,b in zip(points,points[1:]):
 for e in done:
  if e['source_start']==a:parts.append(f'<figure id="{e["id"]}" style="margin:32px 0"><a href="{e["image"]}" target="_blank"><img loading="lazy" src="{e["image"]}" alt="{html.escape(e["shot_ko"])} · 천상의 서곡" style="width:100%;height:auto"></a></figure>')
 parts.append('<pre lang="de">'+html.escape(original[a:b])+'</pre>')
 if ends.get(b):parts.append('<div class="ko-translation" lang="ko">'+html.escape(ends[b])+'</div>')
for directory in [root,root/'dist']:
 f=directory/'chapter-03.html';s=f.read_text(encoding='utf-8');head=s.index('</h1>')+5;start=s.index('</p>',head)+4;end=s.index('<nav>',start);body=''.join(parts)
 if directory!=root:body=body.replace('href="illustrations/','href="../illustrations/').replace('src="illustrations/','src="../illustrations/')
 s=s[:start]+body+s[end:];f.write_text(s,encoding='utf-8')
(root/'dense-scene-plan.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
report=[]
for c in [1,2,3]:
 s=(root/f'chapter-{c:02}.html').read_text(encoding='utf-8');de=''.join(html.unescape(x) for x in re.findall(r'<pre lang="de">(.*?)</pre>',s,re.S));assert de==chapters[c-1]['text'],c
 figs=re.findall(r'<figure\b[^>]*id="([^"]+)"',s);images=re.findall(r'<img[^>]*src="([^"]+)"',s)
 assert len(images)==len(set(images)),('duplicate',c)
 for path in images:assert (root/path).is_file(),path
 if c>1:
  es=[e for e in d['scenes'] if e['chapter']==c];assert all(e['id'] in figs for e in es);assert all(3<=e['sentence_count']<=4 for e in es)
  assert ''.join(e['source_text'] for e in es)==de
  tr=json.loads((root/f'translations/chapter-{c:02}.ko.json').read_text(encoding='utf-8'))['segments'];actual=[html.unescape(x) for x in re.findall(r'<div class="ko-translation" lang="ko">(.*?)</div>',s,re.S)];assert actual==[e['ko'] for e in tr if e['ko']]
 report.append({'chapter':c,'figures':len(figs),'original_german_preserved':True,'missing_images':0,'policy':'2행마다 1컷 · 헌시 예외' if c==1 else '3~4문장 구간마다 1컷','verified_dense_segments':None if c==1 else len(es)})
(root/'illustration-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=True))
