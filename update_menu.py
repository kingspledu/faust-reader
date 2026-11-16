from pathlib import Path
p=Path('faust-reader/build_blog.py');s=p.read_text(encoding='utf-8-sig');needle="(out/'index.html').write_text(page,encoding='utf-8')"
insert='''
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
page=page.replace('let filter=\'all\';','let filter=\'all\', group=\'all\';')
page=page.replace("&&c.textContent.toLowerCase().includes(q)","&&(group==='all'||c.dataset.group===group)&&c.textContent.toLowerCase().includes(q)")
js="""const groupNames=GROUPS;function chooseGroup(g){group=g;filter='all';document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.filter==='all'?'true':'false'));document.querySelectorAll('[data-group-filter]').forEach(a=>a.setAttribute('aria-current',a.dataset.groupFilter===g?'true':'false'));document.getElementById('section-title').textContent=groupNames[g]||'전체 설정';update()}document.querySelectorAll('[data-group-filter]').forEach(a=>a.onclick=()=>{document.getElementById('search').value='';chooseGroup(a.dataset.groupFilter)});function followHash(){let h=location.hash.slice(1);if(h.startsWith('group-'))chooseGroup(h.slice(6));else{let target=document.getElementById(h);if(target&&target.classList.contains('post')){document.getElementById('search').value='';chooseGroup('all');target.scrollIntoView()}}}addEventListener('hashchange',followHash);followHash();""".replace('GROUPS',json.dumps(dict(groups),ensure_ascii=False))
page=page.replace('</script>',js+'</script>')
page=page.replace('</style>',\'''header,main,footer{max-width:1600px}main{padding-left:4vw;padding-right:4vw}.intro{max-width:850px}.journal{max-width:1450px}.post{display:block}.post>p,.post>h2,.post>details{max-width:850px;margin-left:auto;margin-right:auto}.post figure{margin:30px 0}.post img{width:100%;max-width:1536px;margin:auto}.category-nav{display:flex;flex-wrap:wrap;gap:10px;padding:24px 0;border-top:1px solid #d4c9bc}.category-nav a{padding:10px 16px;border:1px solid #cdbfb1;border-radius:30px;text-decoration:none;background:#fffaf3}.category-nav a[aria-current=true]{background:#743c40;color:white}.controls [data-filter]{display:none}.controls{position:relative}.journal{display:block}.post[hidden]{display:none}@media(max-width:650px){main{padding-left:4vw;padding-right:4vw}.post figure{margin:25px -3vw}.category-nav{flex-wrap:nowrap;overflow-x:auto;padding-bottom:16px}.category-nav a{flex-shrink:0}.post h2{font-size:25px}}\'''+'</style>')
'''
s=s.replace(needle,insert+'\n'+needle);p.write_text(s,encoding='utf-8')
