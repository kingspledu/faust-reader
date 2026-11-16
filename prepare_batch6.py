from pathlib import Path
p=Path('faust-reader/build_blog.py');s=p.read_text(encoding='utf-8-sig')
s=s.replace('# Preserve entry IDs', '''batch6_locations={
'산책길':'location-walk.png','정원':'location-garden.png',
'하르츠 산맥의 브로켄 접근로와 축제터':'location-brocken.png',
'산 위 환상극 무대':'location-dream-stage.png',
'흐린 날의 들판':'location-overcast-field.png',
'밤의 탁 트인 들판과 처형장 부근':'location-night-field.png'}
batch6_locks={
'산책길':['가상 배치: 굽은 산책로·왼쪽 생울타리·오른쪽 돌 경계','정확한 지형은 원문 미명시'],
'정원':['가상 배치: 교차 산책로·화단·서쪽 과일나무·북쪽 벤치','마르테의 정원과 동일 장소인지는 미확정'],
'하르츠 산맥의 브로켄 접근로와 축제터':['남쪽 접근로·북쪽 축제터·중앙 춤터','서쪽 장터·동쪽 임시 극장·모닥불은 가상 연출 배치'],
'산 위 환상극 무대':['극중극을 위한 산 위 임시 무대','배경 산과 계곡·무대·음악 구역의 관계를 유지'],
'흐린 날의 들판':['어두운 구름·진흙 길·드문 나무와 울타리','구체적 지형과 도시 위치는 창작 설정'],
'밤의 탁 트인 들판과 처형장 부근':['밤 들판을 가로지르는 이동 경로·멀리 떨어진 처형장','Rabenstein은 처형장 관련 시설. 성이나 산봉우리로 해석하지 않음']}
for e in entries:
 if e['name'] in batch6_locations:
  e['image']=batch6_locations[e['name']];e['status']='draft_visual';e['visual_locks']=batch6_locks[e['name']]
  e['unresolved']=['시각 초안 · 가상 배치도이며 실제 지리·축척 아님. 원근도와 지도 대조 필요.']
# Preserve entry IDs''')
p.write_text(s,encoding='utf-8')
