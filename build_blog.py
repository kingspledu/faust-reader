from pathlib import Path
import re,json,html
root=Path(__file__).parent;out=root/'art-bible'
exec((root/'build_art_bible.py').read_text(encoding='utf-8-sig'))
entries=[];sections=[]
for name,img in {'MARGARETE / GRETCHEN':'character-gretchen.png','WAGNER':'character-wagner.png','MARTHE':'character-marthe.png','VALENTIN':'character-valentin.png'}.items():
 a,b,_=labels[name];labels[name]=(a,b,img)

locks={'FAUST':['갈색 흐트러진 머리','얇은 둥근 안경','아이보리 셔츠','검정 로브·버건디 안감·금색 자수'],'MEPHISTOPHELES':['검은 흐트러진 머리','붉은 눈·작은 뿔(시각화 설정)','검정 장갑','버건디·금색 자수·붉은 보석']}
for j,(key,r) in enumerate(roles.items()):
 uid='character-'+str(j+1).zfill(3);ko,note,img=labels.get(r['name'],(r['name'],'원문 대조 항목',''))
 entries.append({'id':uid,'kind':'character','name':ko,'source_name':r['name'],'category':r['type'],'chapter_numbers':[i+1 for i in r['scenes']],'source_urls':[f'https://kingspledu.github.io/faust-reader/chapter-{i+1:02}.html' for i in r['scenes']],'image':img or None,'status':'draft_visual' if img else 'research_only','visual_locks':locks.get(r['name'],[]),'canonical_note':note,'variants_note':'노학자/회춘 이후는 별도 변형 필요' if r['name']=='FAUST' else '', 'unresolved':[] if img else ['외형·팔레트·소품 미확정']})
for j,(n,d,ids) in enumerate(places):
 entries.append({'id':f'location-{j+1:03}','kind':'place','name':n,'source_name':n,'chapter_numbers':[i+1 for i in ids],'source_urls':[f'https://kingspledu.github.io/faust-reader/chapter-{i+1:02}.html' for i in ids],'image':'location-study.png' if j==2 else None,'status':'draft_visual' if j==2 else 'research_only','visual_locks':[],'canonical_note':d,'unresolved':['지도는 가상 배치도이며 축척 없음','원근 컷과 평면도의 출입구·창 위치 대조 필요'] if j==2 else ['공간 배치·조명·팔레트 미확정']})
location_images={'그레트헨의 방':'location-gretchen-room.png','아우어바흐 지하 술집 · 라이프치히':'location-tavern.png','마녀의 부엌':'location-witch-kitchen.png'}
for e in entries:
 if e['name'] in location_images:
  e['image']=location_images[e['name']];e['status']='draft_visual'
# Preserve entry IDs on subsequent rebuilds through identity matching.
oldpath=out/'reference-index.json'
if oldpath.exists():
 old=json.loads(oldpath.read_text(encoding='utf-8'));stable={(e['kind'],e['source_name'],tuple(e['chapter_numbers'])):e['id'] for e in old['entries']}
 for e in entries:e['id']=stable.get((e['kind'],e['source_name'],tuple(e['chapter_numbers'])),e['id'])
# Completed visuals lead the reading flow.
ordered=sorted(entries,key=lambda e:(not bool(e['image']),e['kind']=='place',entries.index(e)))
for e in ordered:
 image=f'<figure><a href="{e["image"]}" target="_blank" rel="noopener"><img loading="lazy" src="{e["image"]}" alt="{H(e["name"])} 설정 시트"></a><figcaption>이미지를 누르면 원본 크기로 볼 수 있습니다.</figcaption></figure>' if e['image'] else ''
 rules='<ul>'+''.join('<li>'+H(x)+'</li>' for x in e['visual_locks'])+'</ul>' if e['visual_locks'] else '<p class="muted">외형 고정 규칙은 아직 확정되지 않았습니다.</p>'
 sections.append(f'<article class="post" id="{e["id"]}" data-kind="{e["kind"]}"><p class="meta">{"캐릭터" if e["kind"]=="character" else "배경 공간"} / {e["id"]} / {"시각 초안" if e["image"] else "조사 기록"}</p><h2><a href="#{e["id"]}">{H(e["name"])}</a></h2><p class="de">{H(e["source_name"])}</p>{image}<p>{H(e["canonical_note"])}</p><details><summary>일관성 규칙과 원문 근거</summary>{rules}<p>{H(e.get("variants_note",""))}</p><p>{H(" · ".join(e["unresolved"]))}</p><p>'+ ' · '.join(f'<a href="{url}">장면 {num:02}</a>' for num,url in zip(e['chapter_numbers'],e['source_urls']))+f'</p><a href="reference-index.json">구조화된 참조 데이터</a> · <a href="#{e["id"]}">고정 링크</a></details></article>')
page=page.replace('이미지 시트 3장','이미지 시트 10장').replace('이미지 3장은','이미지 10장은')
start=page.index('<h2>인물·배경 조사 카드</h2>');end=page.index('</main>',start)
page=page[:start]+page[start:end].split('<div class="grid">')[0].replace('인물·배경 조사 카드','설정 기록').replace('class="controls"','class="controls"')+'<div class="journal">'+''.join(sections)+'</div>'+page[end:]
page=page.replace("document.querySelectorAll('.card')","document.querySelectorAll('.post')")
css2='''html{scroll-behavior:smooth}body{user-select:text}header,main,footer{max-width:1060px}.journal{max-width:920px;margin:auto}.post{padding:45px 0 55px;border-bottom:1px solid #cfc3b4;scroll-margin-top:120px;line-height:1.9}.post h2{font-size:30px;margin:8px 0}.post h2 a{text-decoration:none;color:inherit}.post .meta{font-size:12px;color:#8c6f66;letter-spacing:.06em}.post figure{margin:26px -35px}.post img{display:block;width:100%;height:auto}.post figcaption{font-size:12px;color:#82766e;text-align:center;margin-top:10px}.post details{background:transparent;border:1px solid #ded4c8;padding:16px}.muted{color:#8a7c70}.controls{top:0;border-bottom:1px solid #d4c9bc}header{gap:15px;flex-wrap:wrap}@media(max-width:650px){.post figure{margin:24px -4vw}.post h2{font-size:25px}.post{padding:32px 0}.controls input{width:100%}.controls{position:relative}.post{scroll-margin-top:20px}}'''
page=page.replace('</style>',css2+'</style>')
page=page.replace('한국 웹툰 제작을 위한 캐릭터·배경 공개 설정집.','스크롤하며 읽는 한국 웹툰 캐릭터·배경 설정 노트.')
page=page.replace('<details open>','<details>')
page=page.replace('<h1>캐릭터와 공간,<br>하나의 일관된 세계.</h1>','<h1>파우스트 제작 노트</h1>')
page=page.replace('<a href="research.json">조사 데이터 JSON</a>','<a href="CODEX_REFERENCE.md">Codex 참조 안내</a> · <a href="reference-index.json">참조 인덱스 JSON</a> · <a href="research.json">조사 데이터 JSON</a>')

groups=[('main','주요 인물'),('neighbors','그레트헨 주변 사람들'),('scholars','학문과 극장의 사람들'),('town','성문 밖의 사람들'),('tavern','술집 사람들'),('heaven','천상과 영적 존재들'),('witches','마녀와 발푸르기스의 밤'),('dream','환상극의 사람들'),('forms','변신·군중·공동 발화'),('places','배경 장소')]
def classify(e):
 n=e['source_name'];ch=e['chapter_numbers']
 if e['kind']=='place':return 'places'
 if n in ['FAUST','MEPHISTOPHELES','MARGARETE / GRETCHEN']:return 'main'
 if n in ['MARTHE','VALENTIN','LIESCHEN']:return 'neighbors'
 if n=='WAGNER' or 2 in ch or ch==[7]:return 'scholars'
 if 3 in ch or n in ['GEIST','BÖSER GEIST','GEISTER','GEISTERCHOR','CHOR DER ENGEL','CHOR DER WEIBER','CHOR DER JÜNGER']:return 'heaven'
 if 25 in ch:return 'dream'
 if 8 in ch:return 'tavern'
 if 9 in ch or 24 in ch or 27 in ch:return 'witches'
 if 5 in ch:return 'town'
 return 'forms'
for e in entries:
 e['menu_group']=classify(e)
 page=page.replace('id="'+e['id']+'" data-kind=', 'id="'+e['id']+'" data-group="'+e['menu_group']+'" data-kind=')
menu='<nav class="category-nav" aria-label="설정집 분야"><a href="#" data-group-filter="all" aria-current="true">전체 설정</a>'+''.join('<a href="#group-'+gid+'" data-group-filter="'+gid+'">'+label+'</a>' for gid,label in groups)+'</nav>'
page=page.replace('<h2>설정 기록</h2>',menu+'<h2 id="section-title">전체 설정</h2>')
page=page.replace("let filter='all';","let filter='all', group='all';")
page=page.replace("&&c.textContent.toLowerCase().includes(q)","&&(group==='all'||c.dataset.group===group)&&c.textContent.toLowerCase().includes(q)")
js="""const groupNames=GROUPS;function chooseGroup(g){group=g;filter='all';document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.filter==='all'?'true':'false'));document.querySelectorAll('[data-group-filter]').forEach(a=>a.setAttribute('aria-current',a.dataset.groupFilter===g?'true':'false'));document.getElementById('section-title').textContent=groupNames[g]||'전체 설정';update()}document.querySelectorAll('[data-group-filter]').forEach(a=>a.onclick=()=>{document.getElementById('search').value='';chooseGroup(a.dataset.groupFilter)});function followHash(){let h=location.hash.slice(1);if(h.startsWith('group-'))chooseGroup(h.slice(6));else{let target=document.getElementById(h);if(target&&target.classList.contains('post')){document.getElementById('search').value='';chooseGroup('all');target.scrollIntoView()}}}addEventListener('hashchange',followHash);followHash();""".replace('GROUPS',json.dumps(dict(groups),ensure_ascii=False))
page=page.replace('</script>',js+'</script>')
page=page.replace('</style>','''header,main,footer{max-width:1600px}main{padding-left:4vw;padding-right:4vw}.intro{max-width:850px}.journal{max-width:1450px}.post{display:block}.post>p,.post>h2,.post>details{max-width:850px;margin-left:auto;margin-right:auto}.post figure{margin:30px 0}.post img{width:100%;max-width:1536px;margin:auto}.category-nav{display:flex;flex-wrap:wrap;gap:10px;padding:24px 0;border-top:1px solid #d4c9bc}.category-nav a{padding:10px 16px;border:1px solid #cdbfb1;border-radius:30px;text-decoration:none;background:#fffaf3}.category-nav a[aria-current=true]{background:#743c40;color:white}.controls [data-filter]{display:none}.controls{position:relative}.journal{display:block}.post[hidden]{display:none}@media(max-width:650px){main{padding-left:4vw;padding-right:4vw}.post figure{margin:25px -3vw}.category-nav{flex-wrap:nowrap;overflow-x:auto;padding-bottom:16px}.category-nav a{flex-shrink:0}.post h2{font-size:25px}}'''+'</style>')

(out/'index.html').write_text(page,encoding='utf-8')
(out/'reference-index.json').write_text(json.dumps({'schema_version':1,'scope':'Goethe Faust Part I only','source':'https://www.gutenberg.org/ebooks/2229','authority':'Source text for canonical facts; attached references for visual adaptation. Generated sheets are draft visuals, not user-approved canon.','entries':entries},ensure_ascii=False,indent=2),encoding='utf-8')
(out/'CODEX_REFERENCE.md').write_text('''# Faust consistency reference\n\n1. Read `reference-index.json` first. Resolve entries by stable `id`; never rely on display order or name alone.\n2. Scope: Part I only. Chapter numbers are 1-based. Anonymous speakers are scoped to their source chapter. Joint speech cues and choruses are not unique people.\n3. Open the entry image before using it as a visual reference. `draft_visual` means generated draft, not approved canon; `research_only` means no approved visual design exists. Never invent an existing sheet.\n4. Preserve `visual_locks`, separating canonical source facts from adaptation choices. Check `unresolved` and `variants_note`. For Faust, old scholar and rejuvenated form require explicit variant handling. Margarete/Gretchen is one identity; poodle is Mephistopheles' form.\n5. Verify scene-specific facts via `source_urls`; source text takes priority over tiny generated image labels. Floor plans are invented staging diagrams, not geographic maps. Check consistency of door/window placement across angles before treating a location sheet as fixed.\n6. Use `index.html#<id>` as the human-readable permanent reference. Add new visual variants without overwriting existing images. Preserve IDs when entries are renamed or reordered.\n7. Reference images and prose may contain visual choices absent from Goethe. Do not convert invented heights, horns, costume details, or layouts into canonical claims.\n\nHuman site: https://kingspledu.github.io/faust-reader/art-bible/\nMachine index: https://kingspledu.github.io/faust-reader/art-bible/reference-index.json\n''',encoding='utf-8')
assert len({e['id'] for e in entries})==len(entries)
for e in entries:
 assert f'id="{e["id"]}"' in page
 if e['image']:assert (out/e['image']).exists()
print('Verified blog posts, stable anchors, source links and machine index:',len(entries))
