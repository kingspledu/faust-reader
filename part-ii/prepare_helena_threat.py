import json
from pathlib import Path
from bs4 import BeautifulSoup
r=Path(__file__).resolve().parent;parts=[]
for f in ['act-03-03','act-03-04']:
 s=BeautifulSoup((r/(f+'.html')).read_text(encoding='utf-8'),'html.parser');parts.extend((f,p) for p in s.select('section.panel-text') if not p.find('img'))
descs=['헬레네와 포르키아스가 궁전 관리와 과거를 말한다.','헬레네가 괴로운 기억을 멈추라 하고 포르키아스가 응답한다.','헬레네가 자신의 정체를 혼란스러워한다. 과거 인물을 추가하지 않는다.','헬레네가 꿈처럼 느껴지는 기억을 말하며 지친 모습을 보인다.','시녀들이 포르키아스에게 그만 말하라고 요구한다.','합창단이 포르키아스의 악의를 비난한다. 비유 속 늑대와 양을 추가하지 않는다.','시녀들이 불안하게 포르키아스를 지켜본다. 머리 셋 개를 그리지 않는다.','판탈리스가 헬레네를 위로하며 포르키아스에게 항의한다.','헬레네 곁 시녀들이 걱정스러운 얼굴로 선다.','시녀들이 지친 헬레네를 지지하며 말한다.','포르키아스가 헬레네를 향해 말을 꺼낸다. 태양을 인물로 만들지 않는다.','헬레네가 현기증에서 벗어나 고개를 든다.','헬레네가 평정을 되찾고 왕비로서 자세를 바로 세운다.','헬레네가 제사 준비를 명령하고 포르키아스가 응답한다.','헬레네가 제물의 정체를 듣지 못했다고 말하고 포르키아스가 되묻는다.','포르키아스가 헬레네와 시녀들을 가리키며 위협하고 모두 놀란다.','포르키아스의 위협을 들은 헬레네와 시녀들의 반응. 실제 처형은 그리지 않는다.','시녀들이 위협에 얼어붙고 포르키아스가 바라본다. 실제 매달린 몸이나 밧줄은 추가하지 않는다.','포르키아스가 겁먹은 여성들에게 말을 잇는다.','포르키아스가 안쪽으로 손짓하고 시녀들이 움츠린다. 미지의 괴물을 추가하지 않는다.','포르키아스가 제사 준비를 지시하는 손짓. 실제 피나 희생 장면은 추가하지 않는다.','포르키아스가 발치의 빈 공간을 가리키고 헬레네가 듣는다. 실제 시신이나 처형은 그리지 않는다.','판탈리스가 지친 시녀들을 뒤로 두고 포르키아스에게 묻는다.','판탈리스가 구할 방법을 청하고 포르키아스가 헬레네 쪽을 본다.','포르키아스가 결단이 필요하다고 말하고 시녀들이 간청한다.','헬레네가 고통을 견디며 침착하게 답한다.','헬레네가 탈출 방법을 묻고 시녀들이 재촉한다.','시녀들이 서로를 지지하며 구원을 간청한다. 비유 속 신이나 올가미를 추가하지 않는다.','포르키아스가 이야기를 들어 달라 하고 시녀들이 귀 기울인다.','포르키아스가 집을 지키는 사람을 말하며 궁전을 가리킨다.','헬레네가 말을 끊고 핵심을 말하라고 요구한다.','포르키아스가 메넬라오스의 항해를 말한다. 현재 궁전 앞의 대화만 보여 준다.']
refs=['character-iii-helena','group-iii-helena-chorus','character-iii-panthalis','variant-ii-mephisto-phorkyas','place-iii-sparta-palace'];inputs=['art-bible/character-iii-helena.png','art-bible/group-iii-helena-chorus.png','art-bible/character-iii-panthalis.png','art-bible/variant-ii-mephisto-phorkyas.png','art-bible/place-iii-sparta-palace.png']
for i,b in enumerate(['helena-regains-composure','phorkyas-threat-rescue']):
 chosen=parts[i*16:(i+1)*16];assert len(chosen)==16
 plan=dict(batch_id=b,grid=[4,4],source_image='source_images/'+b+'-grid-001.png',references=refs,generation_reference_images=inputs,generation_reference_note='다섯 원본 시트 직접 참조. 위협과 비유를 실제 실행된 사건으로 바꾸지 않는다. 현재 낮 궁전 문 앞에서 인물의 발언과 반응을 표현한다.',scenes=[dict(section=f,scene_id=p['id'],description=t) for (f,p),t in zip(chosen,descs[i*16:(i+1)*16])])
 (r/('plan-'+b+'.json')).write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Planned32 sections; registered references unchanged')
