from pathlib import Path
p=Path('faust-reader/build_blog.py');s=p.read_text(encoding='utf-8-sig');needle='# Preserve entry IDs'
insert='''
extra_locks={
'LIESCHEN':['둘러 땋은 진한 금발','회녹색 눈','오커색 몸통옷·네이비 치마','나무 물통'],
'DIE HEXE':['구부정한 실루엣·매부리코','은빛 헝클어진 머리·검은 두건','이끼 갈색 겹옷·낡은 앞치마','철제 국자·약병'],
'FROSCH':['둥근 얼굴·붉은 볼','모래빛 곱슬머리·짧은 콧수염','적갈색 더블릿','큼직한 술잔'],
'마르테의 집':['가상 배치도 기준: 남쪽 출입문·중앙 식탁','북서쪽 화덕·동쪽 찬장·북쪽 창'],
'마르테의 정원':['가상 배치도 기준: 북쪽 집 뒷문·남쪽 정원문','서쪽 과일나무·동쪽 벤치·남동쪽 정자'],
'감옥':['철문·짚 침구·높은 쇠창살 창·벽 사슬','차가운 달빛과 따뜻한 등불 대비']}
for e in entries:
 if e['source_name'] in extra_locks:
  e['visual_locks']=extra_locks[e['source_name']]
  e['unresolved']=['시각 초안 · 세부 글자와 시점별 배치 대조 필요']
 if e['name'] in ['마르테의 집','마르테의 정원']:
  e['unresolved'].append('하단 인물 예시는 외형 불일치로 참조 제외. 개별 캐릭터 시트를 우선할 것.')
 if e['name']=='감옥':
  e['unresolved'].append('그림의 창 방향 이동 화살표는 탈옥 경로로 사용하지 않음. 원문 구출 시도는 출입문 기준.')
'''
s=s.replace(needle,insert+'\n'+needle);p.write_text(s,encoding='utf-8')
