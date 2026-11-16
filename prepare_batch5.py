from pathlib import Path
p=Path('faust-reader/build_blog.py');s=p.read_text(encoding='utf-8-sig')
s=s.replace("locks={'FAUST'", """for name,img in {'RAPHAEL':'character-raphael.png','GABRIEL':'character-gabriel.png','MICHAEL':'character-michael.png'}.items():
 a,b,_=labels[name];labels[name]=(a,b,img)
locks={'FAUST'""")
s=s.replace('# Preserve entry IDs', '''location_images.update({'천상':'location-heaven.png','도시의 거리':'location-city-street.png','정원의 작은 정자':'location-garden-pavilion.png'})
new_batch5_locks={
'RAPHAEL':['긴 은회색 생머리·청회색 눈·차분한 타원형 얼굴','아이보리 로브·사파이어색 숄·금색 테두리'],
'GABRIEL':['짧은 꿀빛 금발·녹색 눈·생기 있는 눈썹','아이보리 로브·비취색 망토·금색 테두리'],
'MICHAEL':['어깨 길이 짙은 머리·호박색 눈·각진 얼굴·넓은 어깨','아이보리 로브·슬레이트색 망토·청동 장식'],
'천상':['구름 단과 별이 보이는 우주 궁륭·중앙의 빛','천사 3인의 자리와 주변부 메피스토펠레스 위치는 상징적 연출'],
'도시의 거리':['돌 포장 골목·목골조 집·분기점·주택 출입문','두 거리 장면의 동일 장소 여부는 미확정'],
'정원의 작은 정자':['작은 목조 정원 집·소박한 내부 벤치','남쪽 출입문·서쪽 창·북쪽 벤치는 가상 배치']}
for e in entries:
 if e['name'] in location_images:
  e['image']=location_images[e['name']];e['status']='draft_visual'
 if e['source_name'] in new_batch5_locks:
  e['visual_locks']=new_batch5_locks[e['source_name']];e['unresolved']=['시각 초안 · 원문 사실과 창작 외형·배치를 구분. 작은 이미지 글자보다 원문 링크를 우선.']
 if e['source_name'] in ['RAPHAEL','GABRIEL','MICHAEL']:
  e['unresolved'].append('머리·눈 색, 날개, 의상과 소품은 창작 설정. 서곡의 우주 질서를 찬양하는 역할을 기준으로 사용.')
# Preserve entry IDs''')
p.write_text(s,encoding='utf-8')
