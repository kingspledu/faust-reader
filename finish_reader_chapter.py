"""Package reviewed grid tiles and authored prose in the existing reader."""
from pathlib import Path
import json
import shutil
import sys
from bs4 import BeautifulSoup
from PIL import Image
from render_dialogue_script import render

r = Path(__file__).parent
ch = int(sys.argv[1])
tag = f'{ch:02}'
page = r / f'chapter-{tag}.html'
plan_path = r / 'dense-scene-plan.json'
manifest_path = r / 'scene-manifest.json'
audit_path = r / 'dialogue-cast-revision-audit.json'

def read(path):
    return json.loads(path.read_text(encoding='utf-8'))

def save(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

plan = read(plan_path)
scenes = [e for e in plan['scenes'] if e['chapter'] == ch]
prose_path = r / f'chapter{tag}-prose.json'
if prose_path.exists():
    rows = read(prose_path)
else:
    rows = []
    for line in prose_path.with_suffix('.txt').read_text(encoding='utf-8').splitlines():
        if not line.strip():
            continue
        translation, narration, *speech = line.split('|')
        rows.append(dict(translation=translation.replace('\\n','\n'), narration=narration,
                         speech=[entry.split('>', 2) for entry in speech]))
assert len(scenes) == len(rows)
soup = BeautifulSoup(page.read_text(encoding='utf-8'), 'html.parser')
source = ''.join(p.get_text() for p in soup.select('article pre[lang=de]'))
assert source == ''.join(e['source_text'] for e in scenes)
position_offset = 0
for batch, path in enumerate(sys.argv[2:], 1):
    path, _, row_count = path.partition('#')
    grid_rows = int(row_count or 4)
    path, _, selection = path.partition('@')
    path, _, tile_range = path.partition('::')
    start_tile, _, end_tile = tile_range.partition(':')
    offset, stop = int(start_tile or 0), int(end_tile or 4 * grid_rows)
    positions = [int(value) - 1 for value in selection.split(',')] if selection else []
    target = r / f'source_images/chapter{tag}-dense-{batch:03}.png'
    if target.exists():
        assert target.read_bytes() == Path(path).read_bytes(), target
    else:
        shutil.copyfile(path, target)
    grid = Image.open(target)
    w, h = grid.size
    mapping = []
    for tile in range(offset, stop):
        if positions:
            if tile - offset >= len(positions):
                break
            position = positions[tile - offset]
            if position < 0:
                continue
        else:
            position = position_offset + tile - offset
        x, y = tile % 4, tile // 4
        box = (round(x*w/4)+3, round(y*h/grid_rows)+3, round((x+1)*w/4)-3, round((y+1)*h/grid_rows)-3)
        scene = scenes[position] if position < len(scenes) else None
        stem = scene['id'] if scene else f'c{tag}-alternative-{position-len(scenes)+1:02}'
        image = f'illustrations/{stem}.webp'
        grid.crop(box).save(r / image, quality=94)
        entry = dict(image=image, source_grid=target.relative_to(r).as_posix(), crop_box=box, native_grid_size=[w,h])
        mapping.append(dict(tile=tile+1, scene_id=scene['id'] if scene else None, **entry))
        if scene:
            scene.update(entry)
    save(r / f'chapter{tag}-grid-{batch:03}-map.json', mapping)
    if not selection:
        position_offset += stop - offset

assert all(e.get('image') and (r/e['image']).is_file() for e in scenes)
cast = read(r / 'voice-cast.json')
cast['aliases'].update({'군중':'character-057', '악령':'character-058'})
units, scripts = [], []
for i, (e, row) in enumerate(zip(scenes, rows), 1):
    unit = dict(id=f'C{tag}-T{i:03}', source_start=e['source_start'], source_end=e['source_end'], source=e['source_text'], ko=row['translation'])
    units.append(unit)
    flow = [dict(role='narration', speaker='나레이터', cast_id='narrator', text=row['narration'])]
    for role, speaker, text in row.get('speech', []):
        overrides = cast['chapter_alias_overrides'].get(str(ch), {})
        flow.append(dict(role=role, speaker=speaker, cast_id=overrides.get(speaker) or cast['aliases'][speaker], text=text))
    if row.get('monologue'):
        flow.append(dict(role='monologue', speaker='그레첸', cast_id=cast['aliases']['그레첸'], text=row['monologue']))
    scripts.append(dict(id=e['id'], script=flow))
    e.update(status='illustrated_adapted', adaptation=f'adaptations/chapter-{tag}.json')
    section = soup.new_tag('section', id=e['id'], attrs={'class':'illustrated-scene','data-scene':e['id']})
    figure = soup.new_tag('figure')
    link = soup.new_tag('a', href=e['image'], target='_blank', rel='noopener')
    link.append(soup.new_tag('img', src=e['image'], alt=row['narration'].split('.')[0], loading='lazy', decoding='async'))
    figure.append(link)
    section.append(figure)
    section.append(soup.new_tag('section', lang='ko', attrs={'class':'adaptation-prose','data-script-revision':'dialogue-cast-v3'}))
    fold = soup.new_tag('details', attrs={'class':'source-fold','data-translation':unit['id']})
    for name, attrs, value in [('summary', {}, '독일어 원문 · 한국어 번역 펼치기'), ('pre', {'lang':'de'}, unit['source']), ('div', {'lang':'ko','class':'ko-translation'},unit['ko'])]:
        node = soup.new_tag(name, attrs=attrs)
        node.string = value
        fold.append(node)
    section.append(fold)
    soup.select_one('article > nav').insert_before(section)
for node in soup.select('article > pre[lang=de],article > .translation-note'):
    node.decompose()
if not soup.select_one('header a[href="voice-cast.html"]'):
    link = soup.new_tag('a', href='voice-cast.html')
    link.string = '성우·연기 설정'
    soup.header.append(link)
style = soup.new_tag('style', id=f'chapter{tag}-adaptation-style')
style.string = BeautifulSoup((r/'chapter-04.html').read_text(encoding='utf-8'),'html.parser').find(id='chapter04-adaptation-style').get_text()
soup.append(style)
assert source == ''.join(x.get_text() for x in soup.select('article pre[lang=de]'))
save(r/f'translations/chapter-{tag}.ko.json', dict(chapter=ch,status='complete',source_total_chars=len(source),covered_end=len(source),segments=units))
title = soup.select_one('article h1 small').get_text()
save(r/f'adaptations/chapter-{tag}.json', dict(title=title,prose_revision='dialogue-cast-v3',voice_cast='voice-cast.json',scenes=scripts))
page.write_text(str(soup),encoding='utf-8')
render(ch)
save(plan_path,plan)
manifest = read(manifest_path)
manifest['scenes'] = [e for e in manifest['scenes'] if e.get('chapter') != ch] + [dict(e,char_offset=e['source_start'],anchor=e['source_text'].strip()[:100]) for e in scenes]
manifest['scope'] = f'Chapters 1–{ch} illustrated and adapted.'
save(manifest_path,manifest)
audit = read(audit_path)
assert len(audit['chapters']) == ch-1
audit['chapters'].append(dict(chapter=ch,scenes=len(scenes),protected=dict(source=[u['source'] for u in units],translations=[u['ko'] for u in units],images=[e['image'] for e in scenes],anchors=[e['id'] for e in scenes])))
save(audit_path,audit)
