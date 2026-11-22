from pathlib import Path
from bs4 import BeautifulSoup
r=Path(__file__).parent
p=r/'audition/app.js';s=p.read_text(encoding='utf-8')
a=s.index("const a=el('a','Canvas 생성 HTML 다운로드');");b=s.index('const v=votes',a)
s=s[:a]+s[b:]
s+='''
let generatorCode='';
fetch('canvas/FAUST_P1_AUD02_ALL.html').then(r=>{if(!r.ok)throw Error('통합 HTML을 불러오지 못했습니다.');return r.text()}).then(t=>{generatorCode=t;$('copyHtml').disabled=false}).catch(e=>say(e.message));
$('copyHtml').onclick=async()=>{try{if(!generatorCode)throw Error('HTML을 불러오는 중입니다.');await navigator.clipboard.writeText(generatorCode);say('202개 대사가 담긴 전체 HTML 코드를 복사했습니다. Gemini Canvas에 붙여 넣어 주세요.')}catch(e){say('복사하지 못했습니다. 브라우저의 클립보드 권한을 확인하고 다시 눌러 주세요.')}};
'''
p.write_text(s,encoding='utf-8')
p=r/'audition/index.html';soup=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser')
button=soup.new_tag('button',id='copyHtml',disabled=True);button.string='전체 대사 생성 HTML 코드 복사'
soup.select_one('main').insert(0,button)
li=soup.select_one('ol li');li.string='위 버튼으로 39배역·202개 대사가 담긴 통합 HTML 코드를 복사해 Gemini Canvas에 붙여 넣습니다. API 키를 입력하지 않습니다.'
for a in list(soup.select('a[download]')):a.decompose()
p.write_text(str(soup),encoding='utf-8')
root=(r/'audition/canvas').resolve()
assert root.is_relative_to(r.resolve())
for f in root.iterdir():
    if f.suffix in ('.html','.json') and f.stem!='FAUST_P1_AUD02_ALL':f.unlink()
print('One Canvas HTML; one copy button; superseded role generators removed')
