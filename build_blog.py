from pathlib import Path
import re,json,html
root=Path(__file__).parent;out=root/'art-bible'
exec((root/'build_art_bible.py').read_text(encoding='utf-8-sig'))
entries=[];sections=[]
locks={'FAUST':['갈색 흐트러진 머리','얇은 둥근 안경','아이보리 셔츠','검정 로브·버건디 안감·금색 자수'],'MEPHISTOPHELES':['검은 흐트러진 머리','붉은 눈·작은 뿔(시각화 설정)','검정 장갑','버건디·금색 자수·붉은 보석']}
for j,(key,r) in enumerate(roles.items()):
 uid='character-'+str(j+1).zfill(3);ko,note,img=labels.get(r['name'],(r['name'],'원문 대조 항목',''))
 entries.append({'id':uid,'kind':'character','name':ko,'source_name':r['name'],'category':r['type'],'chapter_numbers':[i+1 for i in r['scenes']],'source_urls':[f'https://kingspledu.github.io/faust-reader/chapter-{i+1:02}.html' for i in r['scenes']],'image':img or None,'status':'draft_visual' if img else 'research_only','visual_locks':locks.get(r['name'],[]),'canonical_note':note,'variants_note':'노학자/회춘 이후는 별도 변형 필요' if r['name']=='FAUST' else '', 'unresolved':[] if img else ['외형·팔레트·소품 미확정']})
for j,(n,d,ids) in enumerate(places):
 entries.append({'id':f'location-{j+1:03}','kind':'place','name':n,'source_name':n,'chapter_numbers':[i+1 for i in ids],'source_urls':[f'https://kingspledu.github.io/faust-reader/chapter-{i+1:02}.html' for i in ids],'image':'location-study.png' if j==2 else None,'status':'draft_visual' if j==2 else 'research_only','visual_locks':[],'canonical_note':d,'unresolved':['지도는 가상 배치도이며 축척 없음','원근 컷과 평면도의 출입구·창 위치 대조 필요'] if j==2 else ['공간 배치·조명·팔레트 미확정']})
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
start=page.index('<h2>인물·배경 조사 카드</h2>');end=page.index('</main>',start)
page=page[:start]+page[start:end].split('<div class="grid">')[0].replace('인물·배경 조사 카드','설정 기록').replace('class="controls"','class="controls"')+'<div class="journal">'+''.join(sections)+'</div>'+page[end:]
page=page.replace("document.querySelectorAll('.card')","document.querySelectorAll('.post')")
css2='''html{scroll-behavior:smooth}body{user-select:text}header,main,footer{max-width:1060px}.journal{max-width:920px;margin:auto}.post{padding:45px 0 55px;border-bottom:1px solid #cfc3b4;scroll-margin-top:120px;line-height:1.9}.post h2{font-size:30px;margin:8px 0}.post h2 a{text-decoration:none;color:inherit}.post .meta{font-size:12px;color:#8c6f66;letter-spacing:.06em}.post figure{margin:26px -35px}.post img{display:block;width:100%;height:auto}.post figcaption{font-size:12px;color:#82766e;text-align:center;margin-top:10px}.post details{background:transparent;border:1px solid #ded4c8;padding:16px}.muted{color:#8a7c70}.controls{top:0;border-bottom:1px solid #d4c9bc}header{gap:15px;flex-wrap:wrap}@media(max-width:650px){.post figure{margin:24px -4vw}.post h2{font-size:25px}.post{padding:32px 0}.controls input{width:100%}.controls{position:relative}.post{scroll-margin-top:20px}}'''
page=page.replace('</style>',css2+'</style>')
page=page.replace('한국 웹툰 제작을 위한 캐릭터·배경 공개 설정집.','스크롤하며 읽는 한국 웹툰 캐릭터·배경 설정 노트.')
page=page.replace('<details open>','<details>')
page=page.replace('<h1>캐릭터와 공간,<br>하나의 일관된 세계.</h1>','<h1>파우스트 제작 노트</h1>')
page=page.replace('<a href="research.json">조사 데이터 JSON</a>','<a href="CODEX_REFERENCE.md">Codex 참조 안내</a> · <a href="reference-index.json">참조 인덱스 JSON</a> · <a href="research.json">조사 데이터 JSON</a>')
(out/'index.html').write_text(page,encoding='utf-8')
(out/'reference-index.json').write_text(json.dumps({'schema_version':1,'scope':'Goethe Faust Part I only','source':'https://www.gutenberg.org/ebooks/2229','authority':'Source text for canonical facts; attached references for visual adaptation. Generated sheets are draft visuals, not user-approved canon.','entries':entries},ensure_ascii=False,indent=2),encoding='utf-8')
(out/'CODEX_REFERENCE.md').write_text('''# Faust consistency reference\n\n1. Read `reference-index.json` first. Resolve entries by stable `id`; never rely on display order or name alone.\n2. Scope: Part I only. Chapter numbers are 1-based. Anonymous speakers are scoped to their source chapter. Joint speech cues and choruses are not unique people.\n3. Open the entry image before using it as a visual reference. `draft_visual` means generated draft, not approved canon; `research_only` means no approved visual design exists. Never invent an existing sheet.\n4. Preserve `visual_locks`, separating canonical source facts from adaptation choices. Check `unresolved` and `variants_note`. For Faust, old scholar and rejuvenated form require explicit variant handling. Margarete/Gretchen is one identity; poodle is Mephistopheles' form.\n5. Verify scene-specific facts via `source_urls`; source text takes priority over tiny generated image labels. Floor plans are invented staging diagrams, not geographic maps. Check consistency of door/window placement across angles before treating a location sheet as fixed.\n6. Use `index.html#<id>` as the human-readable permanent reference. Add new visual variants without overwriting existing images. Preserve IDs when entries are renamed or reordered.\n7. Reference images and prose may contain visual choices absent from Goethe. Do not convert invented heights, horns, costume details, or layouts into canonical claims.\n\nHuman site: https://kingspledu.github.io/faust-reader/art-bible/\nMachine index: https://kingspledu.github.io/faust-reader/art-bible/reference-index.json\n''',encoding='utf-8')
assert len({e['id'] for e in entries})==len(entries)
for e in entries:
 assert f'id="{e["id"]}"' in page
 if e['image']:assert (out/e['image']).exists()
print('Verified blog posts, stable anchors, source links and machine index:',len(entries))
