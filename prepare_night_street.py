from pathlib import Path
p=Path('faust-reader/build_blog.py');s=p.read_text(encoding='utf-8-sig');s=s.replace('# Preserve entry IDs', '''for e in entries:
 if e['name']=='그레트헨 집 앞 밤거리':
  e['image']='location-gretchen-night-street.png';e['status']='draft_visual'
  e['visual_locks']=['그레트헨 집 출입문·상부 창·돌 포장 밤거리','차가운 달빛과 출입문 등불의 대비']
  e['unresolved']=['가상 배치도 · 원근도와 문·창 위치 대조 필요','이전 거리 장면과 동일한 위치로 단정하지 않음']
# Preserve entry IDs''');p.write_text(s,encoding='utf-8')
