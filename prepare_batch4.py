from pathlib import Path
p=Path('faust-reader/build_blog.py');s=p.read_text(encoding='utf-8-sig')
s=s.replace("locks={'FAUST'", """for name,img in {'DIREKTOR':'character-director.png','DICHTER':'character-poet.png','LUSTIGE PERSON':'character-comic.png'}.items():
 a,b,_=labels[name];labels[name]=(a,b,img)
locks={'FAUST'""")
s=s.replace('# Preserve entry IDs', '''location_images.update({'극장':'location-theater.png','성문 밖과 마을 들판':'location-town-gate.png','숲과 동굴':'location-forest-cave.png'})
new_batch_locks={
'DIREKTOR':['중후하고 둥근 체형·회색 관자놀이·단정한 콧수염','버건디 짧은 코트·갈색 조끼·장부·열쇠'],
'DICHTER':['마른 체형·물결치는 회갈색 어깨 머리·수염 없음','인디고 코트·원고·깃펜·안경 없음'],
'LUSTIGE PERSON':['짧은 구리빛 곱슬머리·활발한 얼굴·녹색 눈','오커와 숲색 의상·부드러운 부츠·광대 분장 없음'],
'극장':['가상 배치 기준: 북쪽 무대·남쪽 관객 벤치','동쪽 출입구·무대 뒤 소품대·커튼'],
'성문 밖과 마을 들판':['가상 배치 기준: 서쪽 성문·동쪽 들판 길','남쪽 강·북동쪽 보리수 광장·언덕 쉼터'],
'숲과 동굴':['가상 배치 기준: 북쪽 동굴 입구·중앙 바위턱','서쪽 고목·남동쪽 개울']}
for e in entries:
 if e['name'] in location_images:
  e['image']=location_images[e['name']];e['status']='draft_visual'
 if e['source_name'] in new_batch_locks:
  e['visual_locks']=new_batch_locks[e['source_name']];e['unresolved']=['시각 초안 · 원문 사실과 창작 외형·배치 구분. 이미지 내 설명보다 원문 링크를 우선.']
# Preserve entry IDs''')
p.write_text(s,encoding='utf-8')
