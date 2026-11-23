import json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
exec((Path(__file__).parent/'verify_reader_integration.py').read_text(encoding='utf-8').split('try:\n with sync_playwright()')[0])
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True);page=browser.new_page()
  page.goto(origin+'/chapter-01.html');page.wait_for_function("document.querySelector('audio')?.readyState>=1")
  page.locator('#C01-P002-S01').evaluate('(n)=>n.click()');page.wait_for_function("document.querySelector('audio').readyState>=1")
  page.locator('[data-play]').click() if not page.locator('audio').evaluate('(a)=>a.paused') else None
  # Synthetic ended is only a state-transition test, not listening or timing accuracy.
  page.evaluate("document.querySelector('audio').dispatchEvent(new Event('ended'))")
  page.locator('[data-play]').click();page.wait_for_timeout(500)
  assert page.locator('audio').evaluate('(a)=>a.paused')
  sentence=page.locator('#C01-P001-S02');text=sentence.text_content();src=page.locator('audio').get_attribute('src')
  sentence.locator('.faust-vocab').click();assert page.locator('.faust-vocab-card').count()==1
  assert sentence.text_content()==text,'Vocabulary changed textContent'
  assert page.locator('audio').get_attribute('src')==src,'Vocabulary changed audio source'
  page.keyboard.press('Escape');assert page.locator('.faust-vocab-card').count()==0
  page.evaluate("document.getElementById('C01-P010-S01').scrollIntoView()")
  page.wait_for_function("Number(document.querySelector('#faust-reading-progress').getAttribute('aria-valuenow'))>0")
  assert page.evaluate("!!localStorage.getItem('faust-reading-position:'+location.pathname)")
  page.reload();page.wait_for_selector('#faust-resume-reading',state='attached');assert page.locator('#faust-resume-reading').evaluate('(n)=>!n.hidden')
  page.locator('#faust-settings > summary').click();page.locator('#faust-resume-reading').click();page.wait_for_function('scrollY>0')
  assert page.locator('link[rel=manifest]').count()==1
  browser.close()
 report=dict(status='PASS',paragraph_wait_pause_cancels_transition=True,reading_progress=True,independent_reading_resume=True,pwa_link=True,vocabulary_text_and_audio_preserved=True,human_listening=False)
 (root/'production/tts/cut-reading-browser.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(report)
finally:server.shutdown()
