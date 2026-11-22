from pathlib import Path
from bs4 import BeautifulSoup
r=Path(__file__).parent;p=r/'audition/app.js';s=p.read_text(encoding='utf-8')
a=s.index("let generatorCode='';")
s=s[:a]+'''
let generatorCode='';
async function loadGenerator(){
 $('copyHtml').disabled=true;generatorCode='';
 try{
  const mr=await fetch('code-copy/manifest.json',{cache:'no-cache'});if(!mr.ok)throw Error('생성 코드 목록 요청 실패');
  const m=await mr.json();if(m.schema!=='canvas-code-copy-1'||m.chapters.length!==1)throw Error('통합 HTML 목록 오류');
  const entry=m.chapters[0];if(!/^chapters\\/[A-Za-z0-9_-]+\\.html$/.test(entry.file))throw Error('잘못된 코드 경로');
  const res=await fetch('code-copy/'+entry.file+'?sha256='+entry.sha256,{cache:'no-cache'});if(!res.ok)throw Error('HTML 요청 실패: HTTP '+res.status);
  const buf=await res.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buf)),b=>b.toString(16).padStart(2,'0')).join('');
  if(buf.byteLength!==entry.bytes||hash!==entry.sha256)throw Error('HTML 무결성 검사 실패. 새로고침해 주세요.');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(buf);if(!/^<!doctype html>/i.test(text.trimStart())||!text.includes('const originalEpisode = '))throw Error('Canvas HTML 형식 오류');
  generatorCode=text;$('copyHtml').disabled=false;
 }catch(e){say(e.message)}
}
loadGenerator();
$('copyHtml').onclick=async()=>{
 if(!generatorCode)return;
 try{await navigator.clipboard.writeText(generatorCode);say('202개 대사의 HTML 전체를 복사했습니다. Gemini Canvas에 붙여 넣어 주세요.')}
 catch(e){const a=$('manualCode');a.hidden=false;a.value=generatorCode;a.focus();a.select();a.setSelectionRange(0,a.value.length);say('코드 전체를 선택했습니다. Ctrl+C 또는 복사를 눌러 주세요.')}
};
'''
s=s.replace("const effect=$('echo').checked&&q.kind==='monologue';","const alreadyEcho=row.effect==='echo-v4';const effect=$('echo').checked&&q.kind==='monologue'&&!alreadyEcho;")
s=s.replace("${effect?'독백 효과':'원음'}","${alreadyEcho?'독백 효과 적용 파일':effect?'독백 효과':'원음'}")
p.write_text(s,encoding='utf-8')
p=r/'audition/index.html';soup=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser')
if not soup.find(id='manualCode'):
 area=soup.new_tag('textarea',id='manualCode',attrs={'hidden':True,'readonly':True,'aria-label':'수동 복사용 전체 HTML 코드'});soup.find(id='copyHtml').insert_after(area)
label=soup.find(id='echo').parent
label.contents[-1].replace_with(' 추가 독백 효과 비교 (효과 적용 파일은 중복 처리하지 않음)')
for para in soup.find_all('p'):
 if '배경음악 없이 원음을 먼저' in para.get_text():para.string='배경음악 없이 비교하세요. 최신 공통 템플릿의 독백 파일에는 짧은 에코가 적용됩니다. 효과 적용 파일을 다시 처리하지 않습니다. 후보 순서는 고정됩니다. 연결 파일은 새로고침 후 다시 선택해 주세요.'
p.write_text(str(soup),encoding='utf-8')
print('Single copy button; SHA/size validation; manual selection fallback; no double echo')
