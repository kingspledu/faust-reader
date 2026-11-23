/* One audio element and source-checked sentence IDs. */
(async()=>{
 const script=document.querySelector('script[data-audio-manifest]');if(!script||document.getElementById('faust-audio'))return;
 const panel=document.createElement('section');panel.id='faust-audio';panel.setAttribute('aria-label','오디오북 재생');
 panel.innerHTML='<button data-prev aria-label="이전 문장">이전</button><button data-play>재생</button><button data-next aria-label="다음 문장">다음</button><input type="range" min="0" value="0" step="0.1" aria-label="현재 문장 재생 위치"><span role="status" aria-live="polite">불러오는 중</span><audio preload="metadata"></audio>';
 document.body.append(panel);const audio=panel.querySelector('audio'),status=panel.querySelector('[role=status]'),play=panel.querySelector('[data-play]'),seek=panel.querySelector('input'),rate=document.getElementById('faust-rate');
 try{
  const url=new URL(script.dataset.audioManifest,document.baseURI),res=await fetch(url);if(!res.ok)throw Error('음성 목록을 불러오지 못했습니다.');const raw=await res.text(),manifest=JSON.parse(raw),rows=manifest.sentences;
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))].map(x=>x.toString(16).padStart(2,'0')).join('');
  for(const row of rows){const node=document.getElementById(row.sentence_id);if(!node||node.textContent.trim().replace(/^[‘“]/,'').replace(/[’”]$/,'')!==row.text)throw Error('본문과 음성의 문장 연결이 달라 재생을 중단했습니다.');}
  const timeline=FaustTimeline.build(rows);
  const key='faust-audio-C'+String(manifest.chapter).padStart(2,'0')+'-S01-'+hash;let position=0,pendingTime=0,timer=0,ending=false,restoring=true,waitingNext=null;
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved){position=Math.max(0,rows.findIndex(r=>r.sentence_id===saved.id));pendingTime=Math.max(0,Number(saved.time)||0);rate.value=String(saved.rate||1);}else position=Math.min(rows.length-1,Math.max(0,Number(localStorage.getItem('faust-audio-C'+String(manifest.chapter).padStart(2,'0')+'-S01'))||0));}catch{}
  const remember=()=>{if(restoring||audio.readyState<1)return;try{localStorage.setItem(key,JSON.stringify({id:rows[position].sentence_id,time:audio.currentTime,rate:audio.playbackRate}));}catch{}};
  const start=()=>audio.play().catch(()=>{status.textContent='재생 버튼을 눌러 주세요.';});
  const mark=()=>{const row=rows[position],node=document.getElementById(row.sentence_id);document.querySelectorAll('.faust-audio-active').forEach(n=>n.classList.remove('faust-audio-active'));node.classList.add('faust-audio-active');status.textContent=`${position+1}/${rows.length} · ${row.speaker}`;dispatchEvent(new CustomEvent('tiger-active-sentence',{detail:{sentence:node,follow:document.getElementById('faust-follow')?.checked!==false,chapter:manifest.chapter,index:position,time:timeline[position].offset+Math.max(0,audio.currentTime-timeline[position].start)}}));};
  const select=(index,resume=false,offset=0)=>{clearTimeout(timer);waitingNext=null;ending=false;restoring=true;position=Math.max(0,Math.min(rows.length-1,index));pendingTime=offset;audio.src=new URL(rows[position].url,url).href;audio.playbackRate=Number(rate.value);audio.volume=Math.min(1,rows[position].playback_gain||1);mark();if(resume)start();};
  panel.querySelector('[data-prev]').onclick=()=>select(position-1,!audio.paused);panel.querySelector('[data-next]').onclick=()=>select(position+1,!audio.paused);
  play.onclick=()=>{if(waitingNext!==null){clearTimeout(timer);const next=waitingNext;select(next,false);return;}if(audio.paused)start();else audio.pause();};rate.onchange=()=>{audio.playbackRate=Number(rate.value);remember();};seek.oninput=()=>{clearTimeout(timer);waitingNext=null;ending=false;audio.currentTime=Number(seek.value);remember();};
  audio.onloadedmetadata=()=>{seek.min=timeline[position].start;seek.max=timeline[position].end;const target=Math.max(timeline[position].start,Math.min(pendingTime||timeline[position].start,Math.max(0,timeline[position].end-.05)));pendingTime=0;audio.currentTime=target;restoring=false;};
  audio.ontimeupdate=()=>{seek.value=audio.currentTime;remember();const r=rows[position],next=rows[position+1];if(!ending&&!audio.paused&&next&&next.paragraph_id===r.paragraph_id&&r.trim_end&&audio.currentTime>=r.trim_end){ending=true;select(position+1,true);}};
  audio.onplay=()=>{play.textContent='일시정지';};audio.onpause=()=>{play.textContent='재생';};
  audio.onended=()=>{if(ending)return;ending=true;if(position+1<rows.length){waitingNext=position+1;play.textContent='일시정지';timer=setTimeout(()=>select(position+1,true),timeline[position].gap*1000);}else{select(0);status.textContent=manifest.chapter+'장 듣기 완료';}};
  for(const row of rows){const node=document.getElementById(row.sentence_id);node.tabIndex=0;node.addEventListener('click',e=>{if(!e.target.closest('button,a'))select(rows.indexOf(row),true);});node.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.target.closest('button,a')){e.preventDefault();select(rows.indexOf(row),true);}});}
  audio.onerror=()=>{status.textContent='음성을 불러오지 못했습니다. 다시 재생하거나 다음 문장으로 이동해 주세요.';};window.addEventListener('pagehide',()=>{remember();clearTimeout(timer);audio.pause();});
  if('mediaSession' in navigator)for(const [action,fn] of [['play',start],['pause',()=>audio.pause()],['previoustrack',()=>select(position-1,true)],['nexttrack',()=>select(position+1,true)]]){try{navigator.mediaSession.setActionHandler(action,fn);}catch{}}
  select(position,false,pendingTime);
 }catch(e){status.textContent=e.message;panel.querySelectorAll('button,input').forEach(n=>n.disabled=true);}
})();
