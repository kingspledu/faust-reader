import functools,http.server,threading,json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[2]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)));threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
  page=browser.new_page(viewport=dict(width=1280,height=900));page.goto(f'http://127.0.0.1:{server.server_port}/chapter-01.html');page.wait_for_selector('#faust-theme-toggle',state='attached')
  assert page.locator('body').evaluate('(n)=>getComputedStyle(n).backgroundColor')=='rgb(247, 244, 233)'
  page.screenshot(path=str(root/'production/tts/theme-desktop.png'))
  page.locator('#faust-settings > summary').click();page.locator('#faust-theme-toggle').click();assert page.locator('body').evaluate('(n)=>getComputedStyle(n).backgroundColor')=='rgb(25, 37, 30)'
  page.reload();assert page.locator('html').get_attribute('data-faust-theme')=='dark'
  page.locator('#faust-settings > summary').click();page.locator('#faust-theme-toggle').click();page.locator('#faust-settings > summary').click()
  page.set_viewport_size(dict(width=390,height=844));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(root/'production/tts/theme-mobile.png'))
  page.locator('#reader-layout-toggle').click();page.screenshot(path=str(root/'production/tts/theme-split.png'))
  browser.close()
 report=dict(status='PASS',paper_ink_tokens=True,dark_toggle=True,theme_persisted=True,mobile_no_overflow=True)
 (root/'production/tts/theme-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(report)
finally:server.shutdown()
