import json
from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parent;art=root.parent/'art-bible'
specs=[
('character-ii-galatea','갈라테이아','GALATEE','individual',['진주빛 흰 긴 머리·옅은 푸른 눈','진주·흰 산호 머리장식','진주색 긴소매 불투명 드레스·바다색 허리띠','바다 위 열린 가리비 조개 왕좌·회색 돌고래'], '네레우스가 기다리던 딸이 조개 왕좌를 탄 채 바다 행렬에 나타난다. 아버지와 인사를 나누지만 행렬은 계속 움직인다. 진주빛 머리와 의상, 조개 왕좌의 세부는 원문에 근거한 창작 시각화이며 실제 유물이나 역사적 복식 복원이 아니다.'),
('group-ii-dorids','도리데스','DORIDEN','collective',['성인 여성·은빛 라벤더 긴 곱슬머리','은 조개 머리핀·보랏빛 회색 눈','라벤더·상아색 불투명 긴소매 드레스·은 허리띠','인간형 다리·은색 샌들'], '파도에서 구한 젊은 선원들과 함께 네레우스 앞에 선다. 그들과 영원히 함께하고 싶다고 청하지만 네레우스는 자신이 영원함을 줄 수 없다고 답한다. 기존 네레이데스와 역할을 구분해 읽을 수 있도록 라벤더색을 창작 시각적 표지로 정했다.'),
('group-ii-psylli-marsi','프실로이와 마르소이','PSYLLEN UND MARSEN','collective',['성인 행렬 안내자·회청색 후드 로브','불투명 긴소매·상아색 허리띠','구리 고리와 운반용 밧줄','갈라테이아의 조개 왕좌를 안내'], '두 이름은 이 대목에서 함께 노래하는 무리로 등장한다. 오래 보존해 온 수레를 말하며 갈라테이아의 행렬을 이끈다. 현대 사람들에게 보이지 않는다는 노랫말은 독자에게 보이는 창작 연출과 구분한다. 후드와 복식은 특정 역사 집단의 실물 복원이 아니다.'),
('group-ii-rescued-sailors','구조된 젊은 선원들','DIE JÜNGLINGE','collective',['성인 청년·짧은 짙은 갈색 머리·수염 없음','해진 상아색 반소매 튜닉·갈색 바지','밧줄 허리띠·맨발 또는 소박한 샌들','갈대·이끼 위에 구조되어 쉬는 선원'], '도리데스가 거친 파도에서 구한 젊은 선원들이다. 이 장면에서는 구조 과정을 새 사건으로 보태지 않고, 이미 구조된 이들이 도리데스와 대화하는 모습을 그린다. 나이·머리·복식의 세부는 성인 청년으로 정한 창작 디자인이다.')]
idx=art/'reference-index.json';data=json.loads(idx.read_text(encoding='utf-8'));page=art/'index.html';soup=BeautifulSoup(page.read_text(encoding='utf-8'),'html.parser')
for ident,name,source,scope,locks,intro in specs:
    assert (art/(ident+'.png')).is_file()
    entry=dict(id=ident,name=name,source_name=source,kind='character',image=ident+'.png',sheet_scope=scope,menu_group='heaven',visual_locks=locks,canonical_note=intro,part=2,act_numbers=[2],chapter_numbers=[],source_urls=['../part-ii/act-02-13.html'],status='draft_visual')
    data['entries']=[e for e in data['entries'] if e['id']!=ident]+[entry]
    old=soup.find(id=ident)
    if old:old.decompose()
    post=soup.new_tag('article',attrs={'class':'post','id':ident,'data-kind':'character','data-group':'heaven'})
    for tag,txt in [('h2',name),('p',source),('h3','기획의도'),('p',intro)]:
        n=soup.new_tag(tag);n.string=txt;post.append(n)
    fig=soup.new_tag('figure');a=soup.new_tag('a',href=entry['image']);a.append(soup.new_tag('img',src=entry['image'],alt=name+' 일관성 참조 시트',loading='lazy'));fig.append(a);post.append(fig)
    det=soup.new_tag('details');su=soup.new_tag('summary');su.string='시각적 단서와 원문 근거';det.append(su);p=soup.new_tag('p');p.string=' · '.join(locks);det.append(p);post.append(det);soup.select_one('.journal').append(post)
idx.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');page.write_text(str(soup),encoding='utf-8')
soup=BeautifulSoup((root/'act-02-13.html').read_text(encoding='utf-8'),'html.parser');parts=[p for p in soup.select('section.panel-text') if not p.find('img')]
descs=['후드 차림의 행렬 안내자들이 밤바다의 조개 왕좌를 이끌며 오래 지켜 온 일을 노래한다.','안내자들이 조개 왕좌 주변에서 밧줄과 이동 방향을 살핀다.','안내자들이 갈라테이아의 조개 왕좌를 달빛 물결 위로 이끈다.','행렬 안내자들이 노래를 잇는다. 노랫말 속 상징을 실제 전투나 새 인물로 추가하지 않는다.','갈라테이아가 진주색 드레스를 입고 조개 왕좌에 앉아 다가온다.','새 몸의 세이렌들이 조개 왕좌를 두르는 바다 행렬을 본다.','네레이데스와 라벤더 차림 도리데스가 왕좌 주변으로 다가온다.','갈라테이아가 조개 왕좌 위에서 엄숙하고 온화한 얼굴로 바다를 바라본다.','도리데스가 구조된 성인 청년 선원들과 함께 네레우스 앞에 선다.','도리데스가 갈대와 이끼 위에 쉬는 성인 선원들을 보여 준다. 과거의 난파를 새로 그리지 않는다.','도리데스와 성인 선원이 손을 맞잡고 네레우스가 바라본다.','도리데스가 네레우스에게 선원들과 계속 함께하기를 청한다.','네레우스가 딸들의 청을 들으며 조심스럽게 답한다.','네레우스가 영원한 약속을 줄 수 없다고 설명한다. 제우스를 새로 그리지 않는다.','도리데스가 성인 선원들과 헤어져야 한다며 아쉬워한다.','구조된 성인 선원들이 도리데스에게 고마움을 표현하며 답한다.','조개 왕좌의 갈라테이아와 물가의 네레우스가 인사를 나눈다.','돌고래들이 갈라테이아의 조개 왕좌를 이끌고 네레우스 곁을 지나간다.','네레우스가 딸을 바라보고, 탈레스가 바다 축제에 기뻐한다.','탈레스가 물가에서 모든 생명이 물에서 비롯됨을 말한다.','탈레스가 물의 순환을 찬미한다. 비유 속 낮 풍경 대신 현재의 밤바다를 유지한다.','메아리가 울릴 듯한 바위 만에서 탈레스와 네레우스가 멀어지는 행렬을 본다. 메아리의 몸은 만들지 않는다.','네레우스가 멀리 원을 그리는 바다 행렬을 바라본다.','군중 사이로 갈라테이아의 조개 왕좌가 빛난다.','멀어진 왕좌와 갈라테이아를 네레우스의 시선으로 본다.','돌고래형 프로테우스의 등 위 밀폐된 병 안에서 호문쿨루스가 바다를 바라본다.','호문쿨루스의 빛이 밝아지고 네레우스가 새 빛을 발견한다. 병은 아직 닫혀 있다.','갈라테이아의 조개 왕좌 가까이 병의 황금빛이 일렁인다. 탈레스가 알아본다.','호문쿨루스의 병이 조개 왕좌에 부딪쳐 빛이 바다로 퍼진다. 유혈 없이 유리와 빛으로 표현한다.','황금빛으로 밝아지는 밤 물결을 새 몸의 세이렌들이 바라본다.','갈라테이아의 행렬과 바다를 금빛이 둘러싼다. 에로스를 별도 인물로 추가하지 않는다.','밤바다의 물과 빛을 향해 바다 무리가 합창한다.']
for i,batch in enumerate(['galatea-dorids','shell-throne-radiance']):
    chosen=parts[i*16:(i+1)*16];assert len(chosen)==16
    refs=['character-ii-galatea','group-ii-dorids','group-ii-psylli-marsi','group-ii-rescued-sailors','character-ii-nereus','group-ii-sirens','character-ii-thales','character-ii-homunculus','character-ii-proteus','group-ii-nereids']
    inputs=(['part-ii/source_images/dolphin-moon-procession-grid-001.png','art-bible/character-ii-galatea.png','art-bible/group-ii-dorids.png','art-bible/group-ii-psylli-marsi.png','art-bible/group-ii-rescued-sailors.png'] if i==0 else ['part-ii/source_images/galatea-dorids-grid-001.png','art-bible/character-ii-galatea.png','art-bible/character-ii-homunculus.png','art-bible/character-ii-proteus.png','art-bible/character-ii-thales.png'])
    plan=dict(batch_id=batch,grid=[4,4],source_image='source_images/'+batch+'-grid-001.png',references=refs,generation_reference_images=inputs,generation_reference_note='직접 첨부한 시트가 인물 외형의 기준이며 앞 그리드는 동일 인물·장소의 연속성 참조다. 병은 source-5299의 파열 직전까지 밀폐 상태다.',scenes=[dict(section='act-02-13',scene_id=p['id'],description=d) for p,d in zip(chosen,descs[i*16:(i+1)*16])])
    (root/('plan-'+batch+'.json')).write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Registered4references and planned32scenes')
