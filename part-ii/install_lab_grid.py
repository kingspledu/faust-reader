"""Install the first source-aligned laboratory grid without modifying source pairs."""
import hashlib,json,sys
from pathlib import Path
from PIL import Image
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parent
source=Path(sys.argv[1])
batch=int(sys.argv[2]) if len(sys.argv)>2 else 1
offset=(batch-1)*16
assert batch>0
page=ROOT/'act-02-03.html'
soup=BeautifulSoup(page.read_text(encoding='utf-8'),'html.parser')
panels=soup.select('section.panel-text')
before=[(p['id'],p.select_one('pre').get_text(),p.select_one('.translation').get_text()) for p in panels]
original=ROOT/f'source_images/act-02-03-grid-{batch:03}.png'
original.parent.mkdir(exist_ok=True)
image=Image.open(source).convert('RGB')
image.save(original)
w,h=image.size
records=[]
for i,panel in enumerate(panels[offset:offset+16]):
    row,col=divmod(i,4)
    # Inset avoids a one-pixel neighboring gutter without changing crop order.
    box=(round(col*w/4)+1,round(row*h/4)+1,round((col+1)*w/4)-1,round((row+1)*h/4)-1)
    filename=f'images/laboratory-{batch:03}-{i+1:02}.webp'
    dest=ROOT/filename
    image.crop(box).save(dest,format='WEBP',quality=94,method=6)
    for old in panel.find_all('img',attrs={'data-batch':f'lab{batch:03}'}):old.decompose()
    node=soup.new_tag('img',src=filename,loading='lazy',alt=f'실험실 원문 장면 {offset+i+1}',attrs={'data-batch':f'lab{batch:03}'})
    panel.insert(0,node)
    records.append(dict(scene_id=panel['id'],panel=i+1,row=row+1,column=col+1,crop=list(box),image=filename,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
after=[(p['id'],p.select_one('pre').get_text(),p.select_one('.translation').get_text()) for p in panels]
assert before==after
assert len({r['sha256'] for r in records})==16
page.write_text(str(soup),encoding='utf-8')
manifest_path=ROOT/'act-02-03-illustrations.json'
old=json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
batches=old.get('batches',[])
if not batches and old.get('records'):batches=[{k:old[k] for k in ('source_image','source_size','grid','records')}]
batches=[b for b in batches if b['source_image']!=original.relative_to(ROOT).as_posix()]
batches.append(dict(source_image=original.relative_to(ROOT).as_posix(),source_size=[w,h],grid=[4,4],records=records))
covered={r['scene_id'] for b in batches for r in b['records']}
manifest=dict(section='act-02-03',batches=batches,completed_source_panels=len(covered),total_source_panels=len(panels),remaining_source_panels=len(panels)-len(covered),source_translation_preserved=True)
(ROOT/'act-02-03-illustrations.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS: 16 unique crops; all source/translation pairs unchanged;',manifest['remaining_source_panels'],'panels pending')
