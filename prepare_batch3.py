from pathlib import Path
p=Path('faust-reader/build_blog.py');s=p.read_text(encoding='utf-8-sig')
s=s.replace("locks={'FAUST'", """for name,img in {'BRANDER':'character-brander.png','SIEBEL':'character-siebel.png','ALTMAYER':'character-altmayer.png'}.items():
 a,b,_=labels[name];labels[name]=(a,b,img)
locks={'FAUST'""")
s=s.replace('# Preserve entry IDs', '''location_images.update({'공동 우물':'location-well.png','성벽 안쪽 통로와 성모상 감실 · Zwinger':'location-zwinger.png','대성당':'location-cathedral.png'})
new_locks={
 'BRANDER':['긴 얼굴·검은 단발·뾰족한 턱수염','마른 체형·짙은 청록 더블릿'],
 'SIEBEL':['사각 얼굴·짧은 짙은 적갈색 머리·수염 없음','튼튼한 체형·머스터드 갈색 가죽옷'],
 'ALTMAYER':['뒤로 묶은 회갈색 머리·작은 회색 콧수염','가늘고 나이 든 얼굴·짙은 자주색 조끼'],
 '공동 우물':['석조 우물·목재 지붕·도르래·물통','주변 목골조 집과 돌 포장 광장'],
 '성벽 안쪽 통로와 성모상 감실 · Zwinger':['성벽 통로의 움푹 들어간 성모상 감실','꽃 봉헌대·좁은 석조 통로'],
 '대성당':['서쪽 출입문·동쪽 제단·중앙 회랑','기둥·측랑·성가대 구역·회중 구역']}
for e in entries:
 if e['name'] in location_images:
  e['image']=location_images[e['name']];e['status']='draft_visual'
 if e['source_name'] in new_locks:
  e['visual_locks']=new_locks[e['source_name']];e['unresolved']=['시각 초안 · 이미지 세부 글자와 시점별 형태·배치를 대조할 것']
# Preserve entry IDs''')
p.write_text(s,encoding='utf-8')
