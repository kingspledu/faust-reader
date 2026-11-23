/* Reviewed Korean explanations, scoped to exact sentences, never global replacement. */
(()=>{
 const entries=[['C01-P001-S02','대목','글이나 이야기의 한 부분. 여기서는 젊은 시인이 먼저 써 두었던 장면들을 말해요.'],['C01-P005-S01','기척','누군가 가까이 있거나 움직인다는 것을 느끼게 하는 작은 소리나 느낌이에요. 여기서는 기억 속 사람들이 다가오는 듯한 느낌을 말해요.']];
 let active=null,opener=null;
 function close(){active?.remove();active=null;if(opener){opener.setAttribute('aria-expanded','false');opener.focus();}opener=null;}
 for(const [id,term,meaning] of entries){const sentence=document.getElementById(id);if(!sentence)continue;const before=sentence.textContent;const walker=document.createTreeWalker(sentence,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode()){const i=node.textContent.indexOf(term);if(i<0)continue;const after=node.splitText(i),tail=after.splitText(term.length);const button=document.createElement('button');button.type='button';button.className='faust-vocab';button.textContent=term;button.setAttribute('aria-expanded','false');after.replaceWith(button);button.onclick=e=>{e.stopPropagation();if(opener===button){close();return;}close();opener=button;button.setAttribute('aria-expanded','true');active=document.createElement('aside');active.className='faust-vocab-card';const p=document.createElement('p');p.textContent=meaning;const dismiss=document.createElement('button');dismiss.textContent='닫기';dismiss.onclick=close;active.append(p,dismiss);sentence.after(active);};break;}
  if(sentence.textContent!==before)throw Error('Vocabulary changed source text');
 }
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
})();
