/* Reading position is independent of audio playback position. */
(()=>{
 const article=document.querySelector('article'),pane=document.getElementById('faust-text'),tools=document.getElementById('faust-tools');if(!article||!pane||!tools)return;
 const paragraphs=[...article.querySelectorAll('.adaptation-prose p,.adaptation-intro p,.ko-translation')].filter(p=>!p.classList.contains('voice-label'));
 paragraphs.forEach((p,i)=>{if(!p.id)p.id='reading-p-'+String(i+1).padStart(4,'0');});
 const progress=document.createElement('div');progress.id='faust-reading-progress';progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','독서 진행');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');progress.innerHTML='<span></span>';tools.append(progress);
 const key='faust-reading-position:'+location.pathname;
 const resume=document.createElement('button');resume.id='faust-resume-reading';resume.textContent='이어 읽기';resume.hidden=true;
 document.querySelector('#faust-settings>div').prepend(resume);
 let saved=null;try{saved=JSON.parse(localStorage.getItem(key));}catch{}
 if(saved&&document.getElementById(saved.id)?.textContent===saved.text){resume.hidden=false;resume.onclick=()=>{const node=document.getElementById(saved.id);node.scrollIntoView({block:'start'});document.getElementById('faust-settings').open=false;};}
 let raf=0;
 function update(){raf=0;const split=document.documentElement.classList.contains('faust-split'),scroller=split?pane:document.documentElement;const range=scroller.scrollHeight-scroller.clientHeight;const percent=Math.max(0,Math.min(100,range?scroller.scrollTop/range*100:100));progress.firstChild.style.width=percent+'%';progress.setAttribute('aria-valuenow',String(Math.round(percent)));
  const top=split?pane.getBoundingClientRect().top:40;const node=paragraphs.find(p=>p.getBoundingClientRect().bottom>top+20);if(!node)return;try{localStorage.setItem(key,JSON.stringify({id:node.id,text:node.textContent}));}catch{}
 }
 const schedule=()=>{if(!raf)raf=requestAnimationFrame(update);};window.addEventListener('scroll',schedule,{passive:true});pane.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);schedule();
 const resources=document.createElement('a');resources.href=new URL('../../art-bible/index.html',document.querySelector('script[src*="reading-position.js"]').src).href;resources.textContent='캐릭터·배경 설정집';document.querySelector('#faust-settings>div').append(resources);
})();
