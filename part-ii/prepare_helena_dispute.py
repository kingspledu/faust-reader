import json
from pathlib import Path
from bs4 import BeautifulSoup
r=Path(__file__).resolve().parent
parts=[]
for f in ['act-03-02','act-03-03']:
 s=BeautifulSoup((r/(f+'.html')).read_text(encoding='utf-8'),'html.parser');parts.extend((f,p) for p in s.select('section.panel-text') if not p.find('img'))
descs=['시녀들이 햇빛 아래 포르키아스에게 응답한다. 태양신을 추가하지 않는다.','시녀들이 포르키아스를 보는 괴로움을 말한다.','합창단이 분노를 드러내고 포르키아스가 듣는다.','포르키아스가 시녀들의 비난에 말을 꺼낸다.','포르키아스가 아름다움과 부끄러움을 말한다. 추상 개념을 인물로 만들지 않는다.','포르키아스가 냉소하며 손짓한다.','포르키아스가 시녀들의 소란을 꾸짖는다.','포르키아스가 말을 잇는다. 비유 속 두루미를 추가하지 않는다.','포르키아스가 궁전의 관리자인 자신에게 소리치느냐고 묻는다.','시녀들이 포르키아스의 모욕을 듣고 서로를 바라본다.','포르키아스가 시녀들을 비난한다. 비유 속 벌레를 추가하지 않는다.','헬레네가 시녀들을 모욕하지 말라며 개입한다.','헬레네가 시녀들의 공로를 말하며 두둔한다.','시녀들이 헬레네의 말을 듣고 가까이 선다.','헬레네가 포르키아스에게 물러서라고 말한다.','포르키아스가 몸을 낮추듯 응답한다.','포르키아스가 헬레네에게 왕비의 자리를 되찾으라 말한다.','포르키아스가 헬레네를 향해 시녀들을 가리키고 판탈리스가 응답한다. 비유 속 새를 추가하지 않는다.','판탈리스와 시녀가 포르키아스와 날카롭게 주고받는다.','시녀들과 포르키아스가 말싸움을 이어 간다. 신화 인물을 실제로 추가하지 않는다.','합창단의 다른 여성과 포르키아스가 응답한다.','판탈리스가 끼어들어 포르키아스의 정체를 묻는다.','헬레네가 양쪽 사이로 들어가 말싸움을 말린다.','헬레네가 내부 다툼의 해로움을 설명한다.','헬레네가 말싸움이 불러온 두려움을 말한다. 실제 유령을 그리지 않는다.','헬레네가 기억과 상상을 혼란스러워하며 포르키아스에게 묻는다.','포르키아스가 침착하게 헬레네에게 응답한다.','포르키아스가 헬레네의 과거를 말한다. 현재 성인들의 대화만 그린다.','헬레네와 포르키아스가 어린 시절의 사건을 이야기한다. 과거 아동이나 납치 장면은 추가하지 않는다.','헬레네가 과거의 호감과 결혼을 이야기한다. 과거 남성을 추가하지 않는다.','헬레네가 가족을 말하고 포르키아스가 응답한다. 가족을 현재에 추가하지 않는다.','헬레네가 고통스러운 기억을 멈추려 하고 포르키아스가 말한다.']
refs=['character-iii-helena','group-iii-helena-chorus','character-iii-panthalis','variant-ii-mephisto-phorkyas','place-iii-sparta-palace']
inputs=['art-bible/character-iii-helena.png','art-bible/group-iii-helena-chorus.png','art-bible/character-iii-panthalis.png','art-bible/variant-ii-mephisto-phorkyas.png','art-bible/place-iii-sparta-palace.png']
for i,b in enumerate(['helena-defends-chorus','helena-memory-dispute']):
 chosen=parts[i*16:(i+1)*16];assert len(chosen)==16
 plan=dict(batch_id=b,grid=[4,4],source_image='source_images/'+b+'-grid-001.png',references=refs,generation_reference_images=inputs,generation_reference_note='다섯 원본 시트를 직접 첨부. 번호로 발화하는 시녀들은 기존 합창단 구성원이며 새로운 외형 집단을 만들지 않는다. 비유와 과거의 인물은 현재 장면에 추가하지 않는다.',scenes=[dict(section=f,scene_id=p['id'],description=t) for (f,p),t in zip(chosen,descs[i*16:(i+1)*16])])
 (r/('plan-'+b+'.json')).write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Planned32 source sections using five registered references')
