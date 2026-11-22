/* Sentence files stay separate. Highlight paragraphs without rewriting source text. */
(async () => {
  const script = document.querySelector('script[data-audio-manifest]');
  if (!script || document.getElementById('faust-audio')) return;
  const panel = document.createElement('section'); panel.id = 'faust-audio';
  panel.setAttribute('aria-label', '1장 오디오북');
  panel.innerHTML = '<strong>1장 오디오북</strong> <button type="button" data-prev>이전 문장</button> <button type="button" data-play>재생</button> <button type="button" data-next>다음 문장</button> <label>속도 <select><option>0.8</option><option selected>1</option><option>1.2</option><option>1.5</option></select></label> <span role="status" aria-live="polite">불러오는 중</span><audio controls preload="metadata"></audio>';
  const style = document.createElement('style');
  style.textContent = '#faust-audio{position:sticky;top:0;z-index:20;background:#f7f2e8;border:1px solid #cbbda9;padding:12px;margin:16px 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:16px}#faust-audio audio{width:100%;height:38px}.faust-audio-active{background:#fff0bf;outline:2px solid #d1a84f;outline-offset:5px}';
  document.head.append(style); document.querySelector('article').prepend(panel);
  const audio = panel.querySelector('audio'), status = panel.querySelector('[role=status]'), play = panel.querySelector('[data-play]');
  try {
    const response = await fetch(script.dataset.audioManifest); if (!response.ok) throw new Error('음성 목록을 불러오지 못했습니다.');
    const manifest = await response.json(), rows = manifest.sentences;
    const paragraphs = [...document.querySelectorAll('.adaptation-prose p,.adaptation-intro p')].filter(p => !p.classList.contains('voice-label'));
    const ids = [...new Set(rows.map(r => r.paragraph_id))];
    const key = 'faust-audio-C01-S01'; let position = 0;
    try { position = Math.min(rows.length - 1, Math.max(0, Number(localStorage.getItem(key)) || 0)); } catch {}
    const select = (index, resume = false) => {
      position = Math.max(0, Math.min(rows.length - 1, index)); const row = rows[position];
      audio.src = new URL(row.url, new URL(script.dataset.audioManifest, document.baseURI)).href;
      audio.playbackRate = Number(panel.querySelector('select').value);
      document.querySelectorAll('.faust-audio-active').forEach(p => p.classList.remove('faust-audio-active'));
      paragraphs[ids.indexOf(row.paragraph_id)]?.classList.add('faust-audio-active');
      status.textContent = `${position + 1}/${rows.length} · ${row.speaker}`;
      try { localStorage.setItem(key, String(position)); } catch {}
      if (resume) audio.play().catch(() => { status.textContent = '재생 버튼을 눌러 주세요.'; });
    };
    panel.querySelector('[data-prev]').onclick = () => select(position - 1, !audio.paused);
    panel.querySelector('[data-next]').onclick = () => select(position + 1, !audio.paused);
    play.onclick = () => { if (audio.paused) audio.play().catch(() => { status.textContent = '음성을 재생하지 못했습니다.'; }); else audio.pause(); };
    panel.querySelector('select').onchange = e => { audio.playbackRate = Number(e.target.value); };
    audio.onplay = () => { play.textContent = '일시정지'; };
    audio.onpause = () => { play.textContent = '재생'; };
    audio.onended = () => { if (position + 1 < rows.length) select(position + 1, true); else { play.textContent = '다시 듣기'; select(0); status.textContent = '1장 듣기 완료'; } };
    audio.onerror = () => { status.textContent = '음성을 불러오지 못했습니다. 다음 문장으로 이동하거나 다시 재생해 주세요.'; };
    window.addEventListener('pagehide', () => audio.pause()); select(position);
  } catch (error) { status.textContent = error.message; panel.querySelectorAll('button,select').forEach(e => { e.disabled = true; }); }
})();
