import copy,functools,http.server,json,threading,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[2]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  path=Path(self.translate_path(self.path))
  if path.suffix=='.mp3' and path.is_file():
   data=path.read_bytes();start=0;end=len(data)-1
   if self.headers.get('Range'):
    import re
    match=re.match(r'bytes=(\d+)-(\d*)',self.headers['Range'])
    if match:start=int(match[1]);end=int(match[2]) if match[2] else end
   self.send_response(206 if self.headers.get('Range') else 200);self.send_header('Content-Type','audio/mpeg');self.send_header('Accept-Ranges','bytes');self.send_header('Content-Length',str(end-start+1))
   if self.headers.get('Range'):self.send_header('Content-Range',f'bytes {start}-{end}/{len(data)}')
   self.end_headers();self.wfile.write(data[start:end+1]);return
  super().do_GET()
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
  context=browser.new_context();page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(origin+'/chapter-01.html');page.wait_for_function("document.querySelector('#faust-audio [role=status]')?.textContent.includes('/60')")
  page.wait_for_function("document.querySelector('audio').readyState>=1")
  assert page.locator('[data-sentence]').count()==60 and page.locator('audio').count()==1
  page.locator('[data-play]').click();page.wait_for_function("document.querySelector('audio').currentTime>.3")
  page.wait_for_function("document.querySelector('audio').currentTime>=1.5")
  page.locator('[data-play]').click()
  page.locator('#faust-settings > summary').click();page.locator('#faust-rate').select_option('1.5');page.wait_for_timeout(300)
  page.reload();page.wait_for_function("document.querySelector('audio')?.readyState>=1");page.wait_for_function("document.querySelector('audio').currentTime>=1.4")
  assert page.locator('audio').evaluate('(a)=>a.playbackRate')==1.5
  page.evaluate("window.originalAudio=document.querySelector('audio')")
  page.locator('#reader-layout-toggle').click();assert page.locator('html').evaluate('(n)=>n.classList.contains("faust-split")')
  page.locator('#landscape-fullscreen').click();page.wait_for_function('!!document.fullscreenElement');page.locator('#landscape-fullscreen').click();page.wait_for_function('!document.fullscreenElement')
  assert page.evaluate("originalAudio===document.querySelector('audio')") and page.locator('audio').evaluate('(a)=>a.playbackRate')==1.5
  page.evaluate("Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:async()=>{throw Error('denied')}})")
  page.locator('#landscape-fullscreen').click();assert page.locator('#faust-install').evaluate('(d)=>d.open');page.locator('#faust-install button').click()
  page.evaluate("Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:undefined})");page.locator('#landscape-fullscreen').click();assert page.locator('#faust-install').evaluate('(d)=>d.open');page.locator('#faust-install button').click()
  for width,height in [(740,360),(844,390),(932,430),(390,844),(1024,768),(1180,820),(1366,1024),(1920,1080)]:
   page.set_viewport_size(dict(width=width,height=height));assert page.locator('#faust-tools').evaluate('(e)=>e.getBoundingClientRect().height')<=35
   assert page.locator('#faust-audio').evaluate('(e)=>e.getBoundingClientRect().height')<=40
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.locator('[data-next]').click();assert '2/60' in page.locator('#faust-audio [role=status]').inner_text()
  page.locator('[data-prev]').click();assert '1/60' in page.locator('#faust-audio [role=status]').inner_text()
  page.locator('#C01-P003-S01').evaluate('(n)=>n.click()');page.wait_for_function("document.querySelector('#faust-art img')?.src.includes('c01-s003')")
  page.locator('[data-play]').click() if not page.locator('audio').evaluate('(a)=>a.paused') else None
  page.locator('#faust-settings > summary').click();page.locator('#faust-offline-save').click();page.wait_for_function("document.querySelector('#faust-offline-status').textContent==='현재 장 저장 완료'",timeout=120000)
  await_count=page.evaluate("caches.open('faust-saved-v1').then(c=>c.keys()).then(k=>k.length)");assert await_count>60
  page.evaluate("caches.open('other-book-test').then(c=>c.put('/other',new Response('keep')))")
  context.set_offline(True);page.reload();page.wait_for_function("document.querySelector('audio')?.readyState>=1")
  page.locator('[data-play]').click();page.wait_for_function("document.querySelector('audio').currentTime>.1")
  assert page.evaluate("fetch(document.querySelector('audio').src,{headers:{Range:'bytes=0-99'}}).then(r=>r.status)")==206
  context.set_offline(False)
  page.locator('#faust-settings > summary').click();page.locator('#faust-offline-delete').click();page.wait_for_function("document.querySelector('#faust-offline-status').textContent.includes('삭제했습니다')")
  assert page.evaluate("caches.has('other-book-test')")
  assert not errors,errors
  # Every actual reader URL loads the shared module; no separate demo completion.
  paths=sorted(root.glob('chapter-*.html'))+sorted((root/'part-ii').glob('act-*.html'))
  for path in paths:
   page.goto(origin+'/'+path.relative_to(root).as_posix());assert page.locator('#reader-layout-toggle').count()==1 and page.locator('#landscape-fullscreen').count()==1
   assert page.locator('audio').count()==(1 if path.name in ('chapter-01.html','chapter-02.html') else 0)
  browser.close()
 report=dict(status='PASS',reader_pages=len(paths),sentence_ids=60,real_mp3_playback=True,exact_resume_seconds_and_rate=True,one_audio_preserved=True,fullscreen_enter_exit=True,fullscreen_denied_unsupported=True,viewport_matrix=True,scene_sync=True,offline_reload_playback=True,offline_range_206=True,book_scoped_delete=True,human_listening=False,physical_device=False)
 (root/'production/tts/reader-integration-browser.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(report)
finally:server.shutdown()
