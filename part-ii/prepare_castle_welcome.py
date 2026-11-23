import json
from pathlib import Path
from bs4 import BeautifulSoup
r=Path(__file__).resolve().parent;a=r.parent/'art-bible'
specs=[('place-iii-faust-courtyard','파우스트의 성 안뜰','INNERER BURGHOF','place','place','회갈색 석벽·2층 뾰족 아치 회랑·뒤쪽 중앙 계단·오른쪽 참나무 문·왼쪽 붉은 천개 좌석','안개가 걷히며 궁전과 다른 성 안뜰이 드러난다. 회랑과 계단, 손님을 맞는 자리를 한 공간으로 연결했다. 배치도와 건축은 창작 무대 설계이며 역사 건축 실물 복원이 아니다.'),('group-iii-castle-attendants','성의 젊은 시종들','DIENERSCHAFT','character','collective','성인 청년·짧은 금빛 곱슬머리·푸른 회색 눈·수염 없음·짙은 청록 긴소매 튜닉·금색 테두리·먹색 바지','성의 시종들이 계단과 카펫, 자리와 천개를 준비하며 손님을 맞는다. 같은 복식 계열로 합창단과 구분했다. 외모와 복식은 창작 시각화다.'),('character-iii-lynkeus','륀케우스','TURMWÄRTER LYNKEUS','character','individual','짧은 적갈색 직모·짧은 적갈색 수염·초록 눈·주근깨·청회색 긴소매 튜닉·짙은 갈색 망토·구리 고리','탑에서 주위를 살피는 파수꾼이다. 헬레네의 도착을 알리지 못해 그녀 앞에서 해명한다. 쇠사슬은 이 장면의 소품이며 상시 의상이 아니다. 얼굴·복식은 창작 디자인이다.')]
idx=a/'reference-index.json';d=json.loads(idx.read_text(encoding='utf-8'));p=a/'index.html';s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser')
for ident,name,src,kind,scope,locks,intro in specs:
 assert (a/(ident+'.png')).is_file()
 group='places' if kind=='place' else 'heaven';e=dict(id=ident,name=name,source_name=src,kind=kind,image=ident+'.png',sheet_scope=scope,menu_group=group,visual_locks=locks.split('·'),canonical_note=intro,part=2,act_numbers=[3],chapter_numbers=[],source_urls=['../part-ii/act-03-05.html'],status='draft_visual')
 d['entries']=[x for x in d['entries'] if x['id']!=ident]+[e]
 old=s.find(id=ident)
 if old:old.decompose()
 post=s.new_tag('article',attrs={'class':'post','id':ident,'data-kind':kind,'data-group':group})
 for tag,txt in [('h2',name),('p',src),('h3','기획의도'),('p',intro)]:
  n=s.new_tag(tag);n.string=txt;post.append(n)
 fig=s.new_tag('figure');link=s.new_tag('a',href=e['image']);link.append(s.new_tag('img',src=e['image'],alt=name+' 일관성 참조 시트',loading='lazy'));fig.append(link);post.append(fig)
 det=s.new_tag('details');su=s.new_tag('summary');su.string='시각적 단서와 원문 근거';det.append(su);n=s.new_tag('p');n.string=locks;det.append(n);post.append(det);s.select_one('.journal').append(post)
idx.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');p.write_text(str(s),encoding='utf-8')
parts=[]
for f in ['act-03-04','act-03-05']:
 soup=BeautifulSoup((r/(f+'.html')).read_text(encoding='utf-8'),'html.parser');parts.extend((f,x) for x in soup.select('section.panel-text') if not x.find('img'))
descs=['일행이 짙은 안개에 둘러싸인다.','시녀들이 서로를 찾으며 조심스럽게 걷는다.','시녀들이 불안하게 앞을 바라본다. 추측 속 헤르메스를 추가하지 않는다.','안개 뒤로 회갈색 성벽이 드러난다.','성 안뜰에 도착한 일행이 둘러본다.','판탈리스가 동요하는 시녀들에게 말한다.','판탈리스가 조용히 기다리라고 손짓한다.','헬레네가 회랑을 보며 포르키아스를 부른다. 포르키아스는 보이지 않는다.','헬레네가 쉬고 싶다 말하고 판탈리스가 답한다.','판탈리스가 사라진 포르키아스를 찾듯 둘러본다.','위층 회랑에서 성인 시종들이 움직인다.','성인 시종들이 손님 맞을 준비를 한다.','금발 성인 시종들이 질서 있게 내려온다.','시녀들이 단정한 시종들의 모습을 본다.','시녀가 놀라움과 기억을 말한다. 실제 입맞춤이나 재를 추가하지 않는다.','성인 시종들이 세 계단과 카펫, 좌석을 운반한다.','시종들이 천개와 좌석을 설치한다.','헬레네가 초대받은 자리에 앉고 시녀들이 다가온다.','시녀들이 계단 곁에 줄지어 선다.','판탈리스가 다가오는 파우스트를 보고 말한다.','판탈리스가 파우스트를 평가하며 헬레네에게 권한다.','파우스트가 헬레네에게 다가와 인사한다.','파우스트가 쇠사슬 찬 륀케우스를 헬레네 앞에 데려온다.','파우스트가 파수꾼 륀케우스의 임무를 설명한다.','파우스트가 탑에서 살피는 일을 말한다. 실제 군대를 추가하지 않는다.','파우스트가 도착을 알리지 않은 잘못을 말한다.','헬레네가 륀케우스를 보고 판단에 관해 답한다.','헬레네가 먼저 해명을 듣겠다고 말한다.','륀케우스가 무릎을 꿇고 헬레네에게 말한다.','륀케우스가 헬레네를 태양에 비유한다. 실제 두 태양을 그리지 않는다.','륀케우스가 눈길을 빼앗긴 순간을 설명한다. 현재의 해명 장면이다.','륀케우스가 꿈에서 깬 듯한 혼란을 말한다. 현재 인물들의 반응을 보여 준다.']
refs=['character-iii-helena','group-iii-helena-chorus','character-iii-panthalis','place-iii-faust-courtyard','group-iii-castle-attendants','character-iii-lynkeus','character-faust']
for i,b in enumerate(['mist-castle-welcome','faust-lynkeus-hearing']):
 chosen=parts[i*16:(i+1)*16];assert len(chosen)==16
 inputs=(['art-bible/character-iii-helena.png','art-bible/character-iii-panthalis.png','art-bible/group-iii-castle-attendants.png','art-bible/place-iii-faust-courtyard.png','part-ii/source_images/helena-choice-mist-grid-001.png'] if i==0 else ['art-bible/character-faust.png','art-bible/character-iii-helena.png','art-bible/character-iii-lynkeus.png','art-bible/group-iii-castle-attendants.png','part-ii/source_images/mist-castle-welcome-grid-001.png'])
 plan=dict(batch_id=b,grid=[4,4],source_image='source_images/'+b+'-grid-001.png',references=refs,generation_reference_images=inputs,scenes=[dict(section=f,scene_id=x['id'],description=t) for (f,x),t in zip(chosen,descs[i*16:(i+1)*16])])
 (r/('plan-'+b+'.json')).write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Registered3references and planned32sections')
