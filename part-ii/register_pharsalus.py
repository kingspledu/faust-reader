import json
from pathlib import Path
from bs4 import BeautifulSoup
from html import escape

p=Path(__file__).resolve().parents[1]/'art-bible'
entries=[dict(id='character-ii-erichtho',kind='character',name='에리크토',source_name='ERICHTHO',image='character-ii-erichtho.png',sheet_scope='individual',menu_group='heaven',visual_locks=['장신의 성인 여성','은빛이 섞인 긴 검은 머리','회색·올리브색 고전풍 드레이프 의상'],canonical_note='파르살로스 들판에 홀로 등장해 전투와 권력의 반복을 말하고 산 사람들의 접근을 피한다. 머리·얼굴·복식은 창작 시각화.'),dict(id='place-ii-pharsalus',kind='place',name='파르살로스 들판',source_name='PHARSALISCHE FELDER',image='place-ii-pharsalus.png',sheet_scope='place',menu_group='places',visual_locks=['넓은 들판·낮은 산지와 강 유역','반달과 붉은 모닥불·푸른 불꽃','나타났다 사라지는 군막의 환영'],canonical_note='고전적 발푸르기스의 밤의 무대. 평면도와 공간 배치는 연출용이며 역사적 지도가 아니다.')]
f=p/'reference-index.json';data=json.loads(f.read_text(encoding='utf-8'));soup=BeautifulSoup((p/'index.html').read_text(encoding='utf-8'),'html.parser')
for e in entries:
    e.update(part=2,act_numbers=[2],chapter_numbers=[],source_urls=['../part-ii/act-02-04.html'],status='draft_visual')
    assert (p/e['image']).is_file()
    data['entries']=[a for a in data['entries'] if a['id']!=e['id']]+[e]
    old=soup.find(id=e['id'])
    if old:old.decompose()
    markup=f'<article class="post" id="{e["id"]}" data-kind="{e["kind"]}" data-group="{e["menu_group"]}"><h2>{e["name"]}</h2><p class="de">{e["source_name"]}</p><figure><a href="{e["image"]}"><img src="{e["image"]}" alt="{e["name"]} 설정 시트" loading="lazy"></a></figure><p>{escape(e["canonical_note"])}</p><details><summary>시각적 단서와 원문 근거</summary><ul>'+''.join(f'<li>{escape(lock)}</li>' for lock in e['visual_locks'])+'</ul><a href="../part-ii/act-02-04.html">2-4막 원문</a></details></article>'
    soup.select_one('.journal').append(BeautifulSoup(markup,'html.parser'))
f.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(p/'index.html').write_text(str(soup),encoding='utf-8')
print('Registered',*[e['id'] for e in entries])
