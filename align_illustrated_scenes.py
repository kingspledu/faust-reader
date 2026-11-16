from pathlib import Path
from bs4 import BeautifulSoup
import json,re
root=Path(__file__).parent;plan=json.loads((root/'dense-scene-plan.json').read_text(encoding='utf-8'))
report=[]
for directory in [root,root/'dist']:
 for ch in [1,2,3]:
  f=directory/f'chapter-{ch:02}.html';soup=BeautifulSoup(f.read_text(encoding='utf-8'),'html.parser');article=soup.find('article');before_de=[x.get_text() for x in article.select('pre[lang=de]') if x.get_text().strip()];before_ko=[x.get_text() for x in article.select('.ko-translation')];figs=article.find_all('figure',recursive=False);proses=article.find_all('section',class_='adaptation-prose',recursive=False);assert len(figs)==len(proses)
  folds=article.find_all('details',class_='source-fold',recursive=False);pairs=[]
  for fold in folds:
   for pre in fold.select('pre[lang=de]'):
    if not pre.get_text().strip():continue
    ko=pre.find_next_sibling('div',class_='ko-translation');assert ko
    pairs.append((pre.extract(),ko.extract()))
   fold.decompose()
  for pre in article.find_all('pre',recursive=False):
   assert not pre.get_text().strip();pre.decompose()
  groups=[]
  for fig,prose in zip(figs,proses):
   group=soup.new_tag('section',attrs={'class':'illustrated-scene','data-scene':fig.get('id')});fig.insert_before(group);group.append(fig.extract());group.append(prose.extract());groups.append(group)
  # Original complete bilingual units are assigned where their starting source line occurs.
  segments=[e for e in plan['scenes'] if e['chapter']==ch];offset=0
  for j,(pre,ko) in enumerate(pairs):
   if ch==1:target=min(j,len(groups)-1)
   else:target=max([i for i,e in enumerate(segments) if e['source_start']<=offset] or [0])
   group=groups[target];fold=group.find('details',recursive=False)
   if fold is None:
    fold=soup.new_tag('details',attrs={'class':'source-fold'});summary=soup.new_tag('summary');summary.string='독일어 원문 · 한국어 번역 펼치기';fold.append(summary);group.append(fold)
   offset+=len(pre.get_text());fold.append(pre);fold.append(ko)
  if ch==3:
   mapping=[1,3,5,6,7,8,10,11,13,14,12,9,16,15]
   for group,n in zip(groups,mapping):
    path=('' if directory==root else '../')+f'illustrations/c03-s{n:03}.webp';group.figure.a['href']=path;group.figure.img['src']=path;group.figure.img['alt']=group.select_one('.adaptation-prose').get_text(' ',strip=True)[:100]
  style=soup.new_tag('style');style.string='.illustrated-scene{display:block;margin:42px 0;padding-bottom:20px;border-bottom:1px solid #ded4c8}.illustrated-scene>figure{margin:0 0 22px!important}.illustrated-scene>.adaptation-prose{margin-top:0}.illustrated-scene img{display:block;width:100%;height:auto}';soup.append(style)
  assert [x.get_text() for x in article.select('pre[lang=de]') if x.get_text().strip()]==before_de
  assert [x.get_text() for x in article.select('.ko-translation')]==before_ko
  for group in groups:
   kids=group.find_all(recursive=False);assert kids[0].name=='figure' and 'adaptation-prose' in kids[1].get('class',[])
   assert all(x.name=='details' for x in kids[2:]);assert not group.select('details[open]')
  f.write_text(str(soup),encoding='utf-8');report.append({'path':str(f),'paired_scenes':len(groups),'source_and_translation_preserved':True})
(root/'layout-pairing-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print('Validated paired scene groups:',[(x['paired_scenes']) for x in report])
