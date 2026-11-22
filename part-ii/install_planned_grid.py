"""Install one explicitly planned 4x4 source grid without changing source text."""
import hashlib
import json
import sys
from pathlib import Path
from bs4 import BeautifulSoup
from PIL import Image

root = Path(__file__).resolve().parent
plan = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
assert plan['grid'] == [4, 4] and len(plan['scenes']) == 16
pages = {s['section']: BeautifulSoup((root/(s['section']+'.html')).read_text(encoding='utf-8'), 'html.parser') for s in plan['scenes']}
def protected(soup):
    return [(p['id'], str(p.select_one('details'))) for p in soup.select('section.panel-text')]
before = {key: protected(soup) for key, soup in pages.items()}
replace = '--replace' in sys.argv[3:]
for scene in plan['scenes']:
    panel = pages[scene['section']].find(id=scene['scene_id'])
    assert panel is not None
    existing = panel.find_all('img')
    if replace:
        assert len(existing) == 1 and existing[0].get('data-batch') == plan['batch_id'], scene['scene_id']
    else:
        assert not existing, scene['scene_id']
image = Image.open(sys.argv[2]).convert('RGB')
w, h = image.size
image.save(root/plan['source_image'])
records = []
for i, scene in enumerate(plan['scenes']):
    soup = pages[scene['section']]
    panel = soup.find(id=scene['scene_id'])
    if replace:
        panel.find('img').decompose()
    row, col = divmod(i, 4)
    crop = [round(col*w/4)+1, round(row*h/4)+1, round((col+1)*w/4)-1, round((row+1)*h/4)-1]
    asset = f'images/{plan["batch_id"]}-{i+1:02}.webp'
    image.crop(crop).save(root/asset, format='WEBP', quality=94, method=6)
    digest = hashlib.sha256((root/asset).read_bytes()).hexdigest()
    panel.insert(0, soup.new_tag('img', src=asset+('?v='+digest[:12] if replace else ''), alt=scene['description'], loading='lazy', attrs={'data-batch': plan['batch_id']}))
    records.append(dict(scene, panel=i+1, row=row+1, column=col+1, crop=crop, image=asset, sha256=digest))
assert len({r['sha256'] for r in records}) == 16
for key, soup in pages.items():
    assert protected(soup) == before[key], key
    (root/(key+'.html')).write_text(str(soup), encoding='utf-8')
manifest = dict(source_image=plan['source_image'], source_size=[w,h], grid=[4,4], references=plan['references'], generation_reference_images=plan.get('generation_reference_images', []), generation_reference_note=plan.get('generation_reference_note', ''), records=records, source_translation_preserved=True)
manifest['correction'] = plan.get('correction', '')
(root/(plan['batch_id']+'-illustrations.json')).write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
rows=[]
for f in sorted(root.glob('act-??-??.html')):
    panels=BeautifulSoup(f.read_text(encoding='utf-8'),'html.parser').select('section.panel-text')
    done=sum(bool(p.find('img')) for p in panels)
    rows.append(dict(section=f.stem,total=len(panels),illustrated=done,unillustrated=len(panels)-done))
remaining=sum(r['unillustrated'] for r in rows)
report=dict(scope='Part II source panels without any image; existing image suitability not re-audited',batch_capacity=16,remaining_source_panels=remaining,minimum_remaining_batches=(remaining+15)//16,reference_sheets_excluded=True,sections=rows)
(root/'illustration-progress.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS: 16 unique crops; source folds preserved verbatim')
print(json.dumps({k:report[k] for k in ('remaining_source_panels','minimum_remaining_batches')}))
print([r for r in rows if r['section'] in pages])
