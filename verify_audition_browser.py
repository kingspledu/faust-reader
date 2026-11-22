from pathlib import Path
import functools,http.server,threading,json
from playwright.sync_api import sync_playwright
r=Path(__file__).parent
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(r)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe')
  ctx=browser.new_context(permissions=['clipboard-read','clipboard-write']);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  url=f'http://127.0.0.1:{server.server_port}/audition/'
  page.goto(url);page.wait_for_function("document.querySelectorAll('#roles article').length===39 && !document.querySelector('#copyHtml').disabled")
  page.locator('#copyHtml').click();clip=page.evaluate('navigator.clipboard.readText()')
  expected=(r/'audition/code-copy/chapters/FAUST_P1_AUD02_ALL_GEMINI_CANVAS_TTS.html').read_text(encoding='utf-8')
  assert clip.replace('\r\n','\n')==expected.replace('\r\n','\n')
  page.locator('#tier').select_option('primary');assert page.locator('#roles article').count()==4
  page.locator('#roles article').first.get_by_role('button',name='1순위',exact=True).first.click();assert page.locator('#roles article').first.inner_text().find('1순위: 후보 A')>=0
  page.reload();page.wait_for_function("!document.querySelector('#copyHtml').disabled");assert '1순위: 후보 A' in page.locator('#roles article').first.inner_text()
  page.evaluate("Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied')}}})")
  page.locator('#copyHtml').click();assert page.locator('#manualCode').input_value()==expected
  assert page.evaluate("document.querySelector('#manualCode').selectionEnd-document.querySelector('#manualCode').selectionStart")==len(expected.encode('utf-16-le'))//2
  page.route('**/code-copy/chapters/**',lambda route:route.fulfill(status=200,body='corrupt'))
  page.reload();page.wait_for_function("document.querySelector('#status').textContent.includes('무결성')");assert page.locator('#copyHtml').is_disabled()
  page.unroute('**/code-copy/chapters/**');page.reload();page.wait_for_function("!document.querySelector('#copyHtml').disabled")
  page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  browser.close()
 report=dict(status='PASS',roles=39,clipboard_exact=True,persistence=True,manual_copy_fallback=True,corrupt_html_rejected=True,mobile_overflow=False,js_errors=errors,actual_canvas_generation=False,actual_listening=False)
 (r/'audition/portal-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(report)
finally:server.shutdown();server.server_close()
