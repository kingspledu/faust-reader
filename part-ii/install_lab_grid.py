"""Install the first source-aligned laboratory grid without modifying source pairs."""
import hashlib,json,sys
from pathlib import Path
from PIL import Image
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parent
source=Path(sys.argv[1])
page=ROOT/'act-02-03.html'
soup=BeautifulSoup(page.read_text(encoding='utf-8'),'html.parser')
panels=soup.select('section.panel-text')
before=[(p['id'],p.select_one('pre').get_text(),p.select_one('.translation').get_text()) for p in panels]
original=ROOT/'source_images/act-02-03-grid-001.png'
original.parent.mkdir(exist_ok=True)
image=Image.open(source).convert('RGB')
image.save(original)
w,h=image.size
records=[]
for i,panel in enumerate(panels[:16]):
    row,col=divmod(i,4)
    # Inset avoids a one-pixel neighboring gutter without changing crop order.
    box=(round(col*w/4)+1,round(row*h/4)+1,round((col+1)*w/4)-1,round((row+1)*h/4)-1)
    filename=f'images/laboratory-001-{i+1:02}.webp'
    dest=ROOT/filename
    image.crop(box).save(dest,format='WEBP',quality=94,method=6)
    for old in panel.find_all('img',attrs={'data-batch':'lab001'}):old.decompose()
    node=soup.new_tag('img',src=filename,loading='lazy',alt=f'실험실 탄생 장면 {i+1}',attrs={'data-batch':'lab001'})
    panel.insert(0,node)
    records.append(dict(scene_id=panel['id'],panel=i+1,row=row+1,column=col+1,crop=list(box),image=filename,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
after=[(p['id'],p.select_one('pre').get_text(),p.select_one('.translation').get_text()) for p in panels]
assert before==after
assert len({r['sha256'] for r in records})==16
page.write_text(str(soup),encoding='utf-8')
manifest=dict(section='act-02-03',source_image=original.relative_to(ROOT).as_posix(),source_size=[w,h],grid=[4,4],completed_source_panels=16,total_source_panels=len(panels),remaining_source_panels=len(panels)-16,source_translation_preserved=True,records=records)
(ROOT/'act-02-03-illustrations.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS: 16 unique crops; all source/translation pairs unchanged;',len(panels)-16,'panels pending')
