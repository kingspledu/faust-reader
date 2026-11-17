from pathlib import Path
from bs4 import BeautifulSoup
import json
root=Path(__file__).parent;p=root/'chapter-06.html'
soup=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser')
t=json.loads((root/'translations/chapter-06.ko.json').read_text(encoding='utf-8'))
blocks=soup.select('article pre[lang="de"]');assert ''.join(x.get_text() for x in blocks)==''.join(x['source'] for x in t['segments'])
anchor=blocks[0]
for u in t['segments']:
 d=soup.new_tag('details',attrs={'class':'source-fold','data-translation':u['id']});summary=soup.new_tag('summary');summary.string='독일어 원문 · 한국어 번역 펼치기';d.append(summary)
 de=soup.new_tag('pre',lang='de');de.string=u['source'];d.append(de)
 ko=soup.new_tag('div',attrs={'class':'ko-translation','lang':'ko'});ko.string=u['ko'];d.append(ko);anchor.insert_before(d)
for b in blocks:b.decompose()
for note in soup.select('article > .translation-note'):note.decompose()
style=soup.new_tag('style');style.string='.source-fold{margin:20px 0;border:1px solid #ccc5b6;padding:14px;border-radius:8px}.source-fold summary{cursor:pointer;font:15px/1.7 system-ui;color:#62564a}'
soup.append(style)
assert ''.join(x.get_text() for x in soup.select('article pre[lang="de"]'))==''.join(x['source'] for x in t['segments'])
assert len(soup.select('details.source-fold'))==10
p.write_text(str(soup).replace('?? ?? ??</a>','장면 제작 계획 / Szenenplan</a>'),encoding='utf-8')
print('Chapter 6: 10 complete bilingual units, German unchanged, collapsed by default')
