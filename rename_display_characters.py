from pathlib import Path
from bs4 import BeautifulSoup,NavigableString
import json,hashlib
r=Path(__file__).parent
def rename(s):return s.replace('메피스토펠레스','메피스토').replace('그레트헨','그레첸')
def tree(x):
 if isinstance(x,str):return rename(x)
 if isinstance(x,list):return [tree(v) for v in x]
 if isinstance(x,dict):return {rename(k):v if k in ('source','source_text','anchor') else tree(v) for k,v in x.items()}
 return x
changed=[];protected=[]
def save(p,s):
 if p.read_text(encoding='utf-8')!=s:p.write_text(s,encoding='utf-8');changed.append(str(p.relative_to(r)).replace('\\','/'))
for p in sorted(r.glob('chapter-*.html')):
 s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser');before=[x.get_text() for x in s.select('pre[lang="de"],.ko-translation')]
 for n in list(s.find_all(string=True)):
  if any(a.name=='pre' and a.get('lang')=='de' or 'ko-translation' in a.get('class',[]) for a in n.parents):continue
  v=rename(str(n))
  if v!=str(n):n.replace_with(NavigableString(v))
 for tag in s.find_all(True):
  for k in ['alt','title','aria-label']:
   if tag.get(k):tag[k]=rename(tag[k])
 assert before==[x.get_text() for x in s.select('pre[lang="de"],.ko-translation')]
 save(p,str(s));protected.append(dict(file=p.name,source_translation_sha256=hashlib.sha256(json.dumps(before,ensure_ascii=False).encode()).hexdigest()))
for p in (r/'adaptations').glob('chapter-*.json'):save(p,json.dumps(tree(json.loads(p.read_text(encoding='utf-8'))),ensure_ascii=False,indent=2))
for p in [r/'dense-scene-plan.json',r/'scene-manifest.json',r/'art-bible/reference-index.json']:
 save(p,json.dumps(tree(json.loads(p.read_text(encoding='utf-8'))),ensure_ascii=False,indent=2))
for p in list((r/'art-bible').glob('*.html'))+list((r/'art-bible').glob('*.md'))+[r/'index.html',r/'scene-plan.html',r/'FAUST_PRODUCTION_GUIDELINES.md',r/'AGENTS.md',r/'build_tts_canvas.py']:
 if p.exists():save(p,rename(p.read_text(encoding='utf-8')))
for pattern in ['render_chapter*.py','verify_chapter*.py','write_chapter*.py']:
 for p in r.glob(pattern):save(p,rename(p.read_text(encoding='utf-8')))
for p in [r/'review/write_chapter11_v3_sample.py',r/'review/HUMANIZER_RESEARCH_AND_REVIEW.md']:
 save(p,rename(p.read_text(encoding='utf-8')))
policy='''
## 인물 이름 표기 · 최신 사용자 지정

새 한국어 웹소설·대사·독백·TTS·메뉴·설정집에서는 메피스토, 그레첸으로 통일한다. 독일어 원문과 기존 대응 번역의 이름은 원문 보존을 위해 그대로 둔다. 인물 ID와 영문 파일명은 유지한다. 기존 시트 이미지에 그려진 글자는 이번 텍스트 표기 변경에 포함하지 않는다.
'''
p=r/'FAUST_PRODUCTION_GUIDELINES.md';s=p.read_text(encoding='utf-8');save(p,s+policy)
(r/'character-display-name-audit.json').write_text(json.dumps(dict(changed=changed,protected_chapters=protected,notes='German source and existing Korean translation preserved; image pixels and stable IDs unchanged.'),ensure_ascii=False,indent=2),encoding='utf-8')
print('Display names updated:',len(changed),'files; protected source/translation:',len(protected),'chapters')
