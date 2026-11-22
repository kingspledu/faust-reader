import functools,http.server,json,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[2]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
  page=browser.new_page();page.goto(f'http://127.0.0.1:{server.server_port}/chapter-01.html')
  page.wait_for_function("document.querySelector('#faust-audio [role=status]')?.textContent.includes('/60')")
  page.wait_for_function("document.querySelector('#faust-audio audio').readyState>=1")
  assert page.locator('.faust-audio-active').count()==1
  page.locator('[data-play]').click();page.wait_for_function("!document.querySelector('#faust-audio audio').paused")
  page.wait_for_function("document.querySelector('#faust-audio audio').currentTime>0.1")
  page.locator('[data-play]').click();assert page.locator('audio').evaluate('(a)=>a.paused')
  page.locator('[data-next]').click();assert '2/60' in page.locator('#faust-audio [role=status]').inner_text()
  page.locator('#faust-audio select').select_option('1.5');assert page.locator('audio').evaluate('(a)=>a.playbackRate')==1.5
  page.reload();page.wait_for_function("document.querySelector('#faust-audio [role=status]')?.textContent.includes('2/60')")
  page.locator('[data-prev]').click();assert '1/60' in page.locator('#faust-audio [role=status]').inner_text()
  page.set_viewport_size(dict(width=390,height=844));assert page.locator('#faust-audio').evaluate('(e)=>e.getBoundingClientRect().right<=innerWidth')
  report=dict(browser_playback=True,pause=True,next_previous=True,speed=True,resume_sentence=True,paragraph_highlight=True,mobile_controls_fit=True,human_listening=False)
  (root/'production/tts/chapter-01-audio-browser.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(report);browser.close()
finally:server.shutdown()
