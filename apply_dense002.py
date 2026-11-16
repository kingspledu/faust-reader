from pathlib import Path
import json,html,re,sys,shutil
from PIL import Image
root=Path(__file__).parent;d=json.loads((root/'dense-scene-plan.json').read_text(encoding='utf-8'));batch=[e for e in d['scenes'] if e['status']!='published'][:16];im=Image.open(sys.argv[1]);w,h=im.size;shutil.copyfile(sys.argv[1],root/'source_images/dense-batch-002.png')
for i,e in enumerate(batch):
 box=(round(i%4*w/4)+3,round(i//4*h/4)+3,round((i%4+1)*w/4)-3,round((i//4+1)*h/4)-3);e.update(image=f'illustrations/{e["id"]}.webp',status='published',source_grid='source_images/dense-batch-002.png',crop_box=box,native_grid_size=[w,h]);im.crop(box).save(root/e['image'],'WEBP',quality=94)
exec((root/'build.py').read_text(encoding='utf-8-sig').split("page='''")[0]);m=json.loads((root/'scene-manifest.json').read_text(encoding='utf-8'))
for ch in [2,3]:
 original=chapters[ch-1]['text'];done=[e for e in d['scenes'] if e['chapter']==ch and e['status']=='published'];cutoff=max(e['source_end'] for e in done);items=[dict(id=e['id'],char_offset=e['source_start'],image=e['image']) for e in done];items += [e for e in m['scenes'] if e['chapter']==ch and e.get('status')=='published' and e['char_offset']>=cutoff];items.sort(key=lambda e:e['char_offset'])
 trans=json.loads((root/f'translations/chapter-{ch:02}.ko.json').read_text(encoding='utf-8'))['segments'];offset=0;ends={}
 for e in trans:
  offset+=len(e['source']);ends[offset]=e['ko']
 assert offset==len(original)
 points=sorted(set([0,len(original),*ends,*[e['char_offset'] for e in items]]));parts=[]
 for a,b in zip(points,points[1:]):
  for e in items:
   if e['char_offset']==a:parts.append(f'<figure id="{e["id"]}" style="margin:32px 0"><a href="{e["image"]}" target="_blank"><img loading="lazy" src="{e["image"]}" alt="원문 구간 삽화" style="width:100%;height:auto"></a></figure>')
  parts.append('<pre lang="de">'+html.escape(original[a:b])+'</pre>')
  if b in ends and ends[b]:parts.append('<div class="ko-translation" lang="ko">'+html.escape(ends[b])+'</div>')
 for directory in [root,root/'dist']:
  f=directory/f'chapter-{ch:02}.html';s=f.read_text(encoding='utf-8');a=s.index('<pre lang="de">');b=s.index('<nav>',a);content=''.join(parts)
  # Remove existing opening figure as well.
  head=s.index('</h1>')+len('</h1>');note=s.find('</p>',head)+4
  a=note if 'translation-note' in s[head:note] else a
  if directory!=root:content=content.replace('href="illustrations/','href="../illustrations/').replace('src="illustrations/','src="../illustrations/')
  s=s[:a]+content+s[b:];assert ''.join(html.unescape(x) for x in re.findall(r'<pre lang="de">(.*?)</pre>',s,re.S))==original
  assert sum(1 for x in re.findall('class="ko-translation"',s))==sum(bool(e['ko']) for e in trans)
  f.write_text(s,encoding='utf-8')
(root/'dense-scene-plan.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8');print('16 new cuts; chapter 2 dense complete; chapter 3 first 9; German and Korean preserved')
