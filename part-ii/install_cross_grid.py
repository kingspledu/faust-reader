"""Install 2-3 last two and 2-4 first fourteen from a single source grid."""
import json,hashlib,sys
from pathlib import Path
from PIL import Image
from bs4 import BeautifulSoup

root=Path(__file__).resolve().parent
pages={key:BeautifulSoup((root/f'act-02-{key}.html').read_text(encoding='utf-8'),'html.parser') for key in ('03','04')}
def pairs(soup):
    return [(p['id'],p.select_one('pre').get_text(),p.select_one('.translation').get_text()) for p in soup.select('section.panel-text')]
before={key:pairs(s) for key,s in pages.items()}
targets=[('03',p) for p in pages['03'].select('section.panel-text')[48:]]+[('04',p) for p in pages['04'].select('section.panel-text')[:14]]
assert len(targets)==16
im=Image.open(sys.argv[1]).convert('RGB');w,h=im.size
source='source_images/act-02-transition-003-004-grid-001.png'
im.save(root/source)
records=[]
for i,(key,panel) in enumerate(targets):
    row,col=divmod(i,4)
    box=[round(col*w/4)+1,round(row*h/4)+1,round((col+1)*w/4)-1,round((row+1)*h/4)-1]
    asset=f'images/lab-pharsalus-{i+1:02}.webp'
    dest=root/asset
    im.crop(box).save(dest,format='WEBP',quality=94,method=6)
    for old in panel.find_all('img',attrs={'data-batch':'lab-pharsalus'}):old.decompose()
    panel.insert(0,pages[key].new_tag('img',src=asset,alt=f'파우스트 제2부 원문 구간 {panel["id"]}',loading='lazy',attrs={'data-batch':'lab-pharsalus'}))
    records.append(dict(section=f'act-02-{key}',scene_id=panel['id'],panel=i+1,row=row+1,column=col+1,crop=box,image=asset,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
assert len({r['sha256'] for r in records})==16
for key,soup in pages.items():
    assert before[key]==pairs(soup)
    (root/f'act-02-{key}.html').write_text(str(soup),encoding='utf-8')
manifest=dict(source_image=source,source_size=[w,h],grid=[4,4],records=records,source_translation_preserved=True)
(root/'act-02-transition-003-004-illustrations.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
f=root/'act-02-03-illustrations.json';data=json.loads(f.read_text(encoding='utf-8'))
data['batches']=[b for b in data['batches'] if b['source_image']!=source]+[dict(source_image=source,source_size=[w,h],grid=[4,4],records=[r for r in records if r['section']=='act-02-03'])]
data['completed_source_panels']=50;data['remaining_source_panels']=0
f.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
rows=[]
for f in sorted(root.glob('act-??-??.html')):
    soup=BeautifulSoup(f.read_text(encoding='utf-8'),'html.parser');panels=soup.select('section.panel-text');done=sum(bool(p.find('img')) for p in panels)
    rows.append(dict(section=f.stem,total=len(panels),illustrated=done,unillustrated=len(panels)-done))
remaining=sum(r['unillustrated'] for r in rows)
report=dict(scope='Part II source panels without any image; existing image suitability not re-audited',batch_capacity=16,remaining_source_panels=remaining,minimum_remaining_batches=(remaining+15)//16,reference_sheets_excluded=True,sections=rows)
(root/'illustration-progress.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS: 16 distinct crops, both pages source pairs unchanged')
print(json.dumps({k:report[k] for k in ('remaining_source_panels','minimum_remaining_batches')}))
print([r for r in rows if r['section'] in ('act-02-03','act-02-04')])
