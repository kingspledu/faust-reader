/* Faust DOM adapter for the audiobook-reader landscape/fullscreen contract. */
(() => {
  if (document.getElementById('faust-tools')) return;
  const article=document.querySelector('article');if(!article)return;
  const script=document.querySelector('script[src*="assets/audiobook/reader.js"]');
  const base=new URL('../../',script.src),root=document.documentElement;
  const read=(k,f)=>{try{return localStorage.getItem('faust-'+k)||f;}catch{return f;}};
  const save=(k,v)=>{try{localStorage.setItem('faust-'+k,v);}catch{}};
  const tools=document.createElement('nav');tools.id='faust-tools';tools.setAttribute('aria-label','읽기 설정');
  tools.innerHTML='<button id="reader-layout-toggle" aria-pressed="false">가로모드</button><button id="landscape-fullscreen" aria-pressed="false">전체모드</button><details id="faust-settings"><summary>목차·설정</summary><div><label>글자 크기 <input id="faust-font" type="range" min="14" max="50"><output></output></label><label><input id="faust-follow" type="checkbox" checked>재생 문장 따라가기</label><label>재생 속도 <select id="faust-rate"><option>0.8</option><option selected>1</option><option>1.2</option><option>1.5</option></select></label><button id="install-app">설치 안내</button><button id="faust-offline-save">현재 장 저장</button><button id="faust-offline-delete">저장 자료 삭제</button><span id="faust-offline-status" role="status"></span></div></details>';
  document.body.prepend(tools);
  const pane=document.createElement('div');pane.id='faust-text';article.before(pane);pane.append(article);
  const art=document.createElement('aside');art.id='faust-art';art.setAttribute('aria-label','현재 장면 삽화');document.body.append(art);
  const menu=document.querySelector('.reader-menu');if(menu)tools.querySelector('details>div').append(menu);
  const dialog=document.createElement('dialog');dialog.id='faust-install';dialog.innerHTML='<p>전체화면을 사용할 수 없는 환경입니다. iPhone·iPad Safari에서는 공유 → 홈 화면에 추가 후 열어 주세요. 다른 브라우저는 메뉴의 설치 또는 홈 화면에 추가를 이용할 수 있습니다.</p><form method="dialog"><button>닫기</button></form>';document.body.append(dialog);
  let installPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
  document.getElementById('install-app').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;}else dialog.showModal();};
  const full=document.getElementById('landscape-fullscreen');
  full.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(root.requestFullscreen)await root.requestFullscreen();else dialog.showModal();}catch{dialog.showModal();}};
  const fullState=()=>{const on=!!document.fullscreenElement;full.textContent=on?'전체모드 종료':'전체모드';full.setAttribute('aria-pressed',String(on));full.setAttribute('aria-label',on?'전체화면 종료':'전체화면 켜기');};document.addEventListener('fullscreenchange',fullState);fullState();
  let preference=read('reader-layout','auto'),current=null,manualUntil=0,request=0,source='',wanted='';
  const mq=matchMedia('(orientation:landscape) and (max-width:1600px) and (any-pointer:coarse)');
  const font=document.getElementById('faust-font'),output=tools.querySelector('output');
  const setFont=()=>{const split=root.classList.contains('faust-split');font.max=split?102:50;const size=Math.max(14,Math.min(Number(font.max),Number(read(split?'landscape-font':'portrait-font',split?'19':'20'))));font.value=size;output.textContent=size+(split?'pt':'px');if(split)root.style.setProperty('--faust-landscape-font',size+'pt');else root.style.setProperty('--size',size+'px');};
  font.oninput=()=>{const split=root.classList.contains('faust-split');save(split?'landscape-font':'portrait-font',font.value);setFont();};
  async function imageFor(node){
    const scene=node?.closest('.illustrated-scene');const img=scene?.querySelector('figure img')||article.querySelector('figure img');
    const src=img?.src||'';if(src===wanted)return;wanted=src;const serial=++request;
    if(!src){art.replaceChildren();source='';return;}
    const next=new Image();next.alt=img.alt;next.src=src;
    try{await next.decode();if(serial!==request)return;source=src;next.className='faust-slide';art.replaceChildren(next);}catch{if(serial===request){art.replaceChildren();source='';art.textContent='삽화를 불러오지 못했습니다.';}}
  }
  const apply=()=>{const on=preference==='split'||(preference==='auto'&&mq.matches);root.classList.toggle('faust-split',on);document.getElementById('reader-layout-toggle').setAttribute('aria-pressed',String(on));setFont();if(on)imageFor(current||article.querySelector('[data-sentence],.illustrated-scene'));};
  document.getElementById('reader-layout-toggle').onclick=()=>{preference=root.classList.contains('faust-split')?'full':'split';save('reader-layout',preference);apply();};mq.addEventListener('change',apply);apply();
  for(const e of ['wheel','touchstart','pointerdown'])pane.addEventListener(e,()=>{manualUntil=Date.now()+4500;},{passive:true});
  window.addEventListener('tiger-active-sentence',e=>{current=e.detail.sentence;imageFor(current);if(e.detail.follow&&Date.now()>manualUntil){if(root.classList.contains('faust-split'))pane.scrollTo({top:current.getBoundingClientRect().top-pane.getBoundingClientRect().top+pane.scrollTop-20,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});else current.scrollIntoView({block:'center',behavior:'smooth'});}});
  let ticking=false;const onScroll=()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;const top=root.classList.contains('faust-split')?pane.getBoundingClientRect().top:32;const scenes=[...article.querySelectorAll('.illustrated-scene')];const visible=scenes.find(s=>s.getBoundingClientRect().bottom>top+40);if(visible)imageFor(visible);});};pane.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('scroll',onScroll,{passive:true});
  const settings=document.getElementById('faust-settings');document.addEventListener('keydown',e=>{if(e.key==='Escape')settings.open=false;});document.addEventListener('click',e=>{if(!settings.contains(e.target))settings.open=false;else if(e.target.closest('a'))settings.open=false;});
  const status=document.getElementById('faust-offline-status');let busy=false;
  const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
  async function worker(){if(!('serviceWorker' in navigator))throw Error('이 브라우저에서는 오프라인 저장을 지원하지 않습니다.');await navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.pathname});await navigator.serviceWorker.ready;}
  document.getElementById('faust-offline-save').onclick=async()=>{if(busy)return;busy=true;const cacheName='faust-saved-v1';try{await worker();status.textContent='저장 파일 확인 중';const response=await fetch(new URL('offline-manifest.json',base),{cache:'no-store'});if(!response.ok)throw Error('저장 목록을 불러오지 못했습니다.');const manifest=await response.json();const key=decodeURI(location.pathname.slice(base.pathname.length));const entries=manifest.chapters[key];if(!entries)throw Error('이 장의 저장 목록이 없습니다.');const cache=await caches.open(cacheName);for(let i=0;i<entries.length;i++){const item=manifest.files[entries[i]],url=new URL(entries[i],base);const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw Error('파일 저장 실패');const bytes=await res.arrayBuffer();if(bytes.byteLength!==item.bytes||await digest(bytes)!==item.sha256)throw Error('파일 검증 실패. 다시 시도해 주세요.');await cache.put(url,new Response(bytes,{headers:{'Content-Type':res.headers.get('Content-Type')||'application/octet-stream'}}));status.textContent=`저장 중 ${i+1}/${entries.length}`;}status.textContent='현재 장 저장 완료';}catch(e){status.textContent=e.message;}finally{busy=false;}};
  document.getElementById('faust-offline-delete').onclick=async()=>{if(busy)return;await caches.delete('faust-saved-v1');status.textContent='이 파우스트 사이트의 저장 자료를 삭제했습니다.';};
  worker().catch(()=>{});
})();
