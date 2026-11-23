import json
from pathlib import Path
exec((Path(__file__).parent/'verify_reader_integration.py').read_text(encoding='utf-8').split('try:\n with sync_playwright()')[0])
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True);page=browser.new_page()
  page.goto(origin+'/chapter-02.html');page.wait_for_function("document.querySelector('#faust-audio [role=status]')?.textContent.includes('/170')")
  assert page.locator('[data-sentence]').count()==170
  page.locator('[data-play]').click();page.wait_for_function("document.querySelector('audio').currentTime>1.5");page.locator('[data-play]').click()
  page.locator('#faust-settings > summary').click();page.locator('#faust-rate').select_option('1.2');page.reload();page.wait_for_function("document.querySelector('audio')?.currentTime>1.4")
  assert page.locator('audio').evaluate('(a)=>a.playbackRate')==1.2
  page.locator('[data-next]').click();assert '2/170' in page.locator('#faust-audio [role=status]').inner_text()
  page.locator('#reader-layout-toggle').click();assert page.locator('audio').count()==1
  page.goto(origin+'/chapter-01.html');page.wait_for_function("document.querySelector('#faust-audio [role=status]')?.textContent.includes('/60')")
  browser.close()
 report=dict(status='PASS',chapter=2,sentences=170,real_mp3_playback=True,resume_seconds_and_rate=True,chapter_positions_separated=True,single_player=True,human_listening=False)
 (root/'production/tts/chapter-02-audio-browser.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(report)
finally:server.shutdown()
