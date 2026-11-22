import json
from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parent;art=root.parent/'art-bible'
specs=[
('variant-ii-mephisto-phorkyas','메피스토 · 포르키아스 차림','MEPHISTOPHELES / PHORKYAS','variant','늙은 자매의 형상·한쪽 눈을 감음·붉은 눈·긴 이 하나·먹빛 로브','메피스토는 세 자매 중 하나의 모습을 잠시 빌리자고 제안한다. 한쪽 눈을 감고 긴 이를 드러낸 옆얼굴로 닮은꼴을 만들라는 조언을 받아들인다. 새 인물이 아니라 메피스토의 변신 모습이다.'),
('group-ii-nereids','네레이데스','NEREIDEN','character','성인 여성·은빛 물빛 머리·바다색 눈·상아색 청록 드레이프·금사슬','바다의 무리가 노래에 이끌려 물결 위로 모습을 드러낸다. 네레이데스는 트리톤들과 함께 금사슬과 보석 장식을 자랑한다. 인간형 다리와 밝은 물빛 의상으로 구별하며 외형과 색상은 창작 시각화다.'),
('group-ii-tritons','트리톤들','TRITONEN','character','성인 남성·짙은 청록 머리·청록 물고기 꼬리·소라·금사슬','네레이데스와 함께 바다 축제의 합창에 참여한다. 낮은 물결에서 올라오는 소리와 소라, 물고기 꼬리로 해양 존재의 모습을 표현했다. 세부 외모와 복식은 창작 시각화다.'),
('character-ii-nereus','네레우스','NEREUS','character','노년 남성·긴 흰 머리와 수염·청록 눈·먹빛 푸른 로브·바다색 숄','탈레스는 인간을 못마땅해하지만 미래를 아는 바다의 노인에게 호문쿨루스를 데려간다. 네레우스는 사람들에게 조언해도 듣지 않았던 경험을 말한다. 동굴 입구의 엄격한 표정과 긴 수염, 의상 색상은 창작 시각화다.'),
('place-ii-aegean-coves','에게해의 바위 만','FELSBUCHTEN DES ÄGÄISCHEN MEERS','place','달빛 수면·석회암 바위 만·동굴 입구·젖은 바위턱','산과 동굴을 지나 이야기는 달빛이 비치는 에게해의 바위 만으로 옮겨 간다. 세이렌의 노래와 바다 무리의 등장, 네레우스의 동굴을 한 공간에서 이어 볼 수 있게 배치했다. 지도는 연출용 배치도이며 실제 지형 복원은 아니다.')]
f=art/'reference-index.json';data=json.loads(f.read_text(encoding='utf-8'));html=art/'index.html';soup=BeautifulSoup(html.read_text(encoding='utf-8'),'html.parser')
for ident,name,source,kind,locks,intro in specs:
    assert (art/(ident+'.png')).is_file(),ident
    scope='place' if kind=='place' else ('collective' if ident.startswith('group') else 'individual');group='places' if kind=='place' else 'heaven'
    entry=dict(id=ident,kind=kind,name=name,source_name=source,image=ident+'.png',sheet_scope=scope,menu_group=group,visual_locks=locks.split('·'),canonical_note=intro,part=2,act_numbers=[2],chapter_numbers=[],source_urls=['../part-ii/act-02-11.html'],status='draft_visual')
    data['entries']=[e for e in data['entries'] if e['id']!=ident]+[entry]
    old=soup.find(id=ident)
    if old:old.decompose()
    post=soup.new_tag('article',attrs={'class':'post','id':ident,'data-kind':kind,'data-group':group})
    for tag,txt in [('h2',name),('p',source),('h3','기획의도'),('p',intro)]:
        n=soup.new_tag(tag);n.string=txt;post.append(n)
    fig=soup.new_tag('figure');a=soup.new_tag('a',href=entry['image']);a.append(soup.new_tag('img',src=entry['image'],alt=name+' 일관성 참조 시트',loading='lazy'));fig.append(a);post.append(fig)
    det=soup.new_tag('details');su=soup.new_tag('summary');su.string='시각적 단서와 원문 근거';det.append(su);p=soup.new_tag('p');p.string=locks;det.append(p);post.append(det);soup.select_one('.journal').append(post)
f.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');html.write_text(str(soup),encoding='utf-8')
descs1=['메피스토가 자매들을 칭찬하고 시인이 왜 노래하지 않는지 묻는다.','메피스토가 조각가도 그들을 표현해야 한다고 아첨한다. 실제 조각가를 추가하지 않는다.','자매들이 고독과 밤 속에서 그런 생각을 하지 않았다고 답한다.','메피스토가 예술과 화려함이 있는 곳을 말한다. 현재 동굴을 유지한다.','자매들이 욕심나게 하지 말라며 말을 끊는다.','메피스토가 세 자매가 공유하는 눈과 이를 언급하며 제안한다.','메피스토가 한 자매의 형상을 잠시 빌리자고 청한다.','자매들이 의논하며 눈과 이는 빌려줄 수 없다고 한다.','한 자매가 한쪽 눈을 감고 긴 이를 보이라며 조언한다.','메피스토가 포르키아스의 늙은 형상으로 변한다.','새 자매 형상과 두 자매가 변신 모습을 두고 이야기한다.','변신한 메피스토가 다른 이들을 놀라게 하겠다며 몸을 숨긴다.','에게해 바위 만에서 세이렌들이 달을 향해 노래한다.','세이렌들이 평온한 달빛이 물결을 비추기를 빈다.','네레이데스와 트리톤들이 노래에 응답하며 물 위로 나온다.','바다 무리가 바다에 울릴 소리를 높인다.']
descs2=['네레이데스와 트리톤들이 금사슬과 보석으로 몸을 장식한다.','바다 무리가 팔찌와 허리 장식을 보여 주며 보물을 이야기한다.','세이렌들이 바다 무리를 향해 응답한다.','세이렌들이 물고기 이상의 존재임을 보여 달라고 청한다.','네레이데스와 트리톤들이 짧은 여행을 준비한다.','바다 무리가 사모트라케 방향으로 떠나고 세이렌들이 바라본다.','세이렌들이 카비로이의 신비를 말한다. 카비로이는 아직 그리지 않는다.','세이렌들이 밤이 지속되길 바라며 달을 올려다본다.','탈레스가 호문쿨루스를 네레우스의 동굴로 이끈다.','탈레스가 네레우스의 까다로운 성격을 설명한다.','호문쿨루스가 직접 찾아가 보자고 한다. 유리병은 밀폐 상태다.','네레우스가 사람 목소리를 듣고 못마땅하게 동굴에서 반응한다.','네레우스가 인간에 대한 실망을 이야기한다.','탈레스가 호문쿨루스의 불빛을 보여 주며 조언을 청한다.','네레우스가 사람들이 조언을 듣지 않는다고 불평한다.','네레우스가 파리스에게 했던 경고를 말한다. 파리스나 헬레네를 새로 등장시키지 않는다.']
ps10=BeautifulSoup((root/'act-02-10.html').read_text(encoding='utf-8'),'html.parser').select('section.panel-text')
ps11=BeautifulSoup((root/'act-02-11.html').read_text(encoding='utf-8'),'html.parser').select('section.panel-text')
for batch,parts,descs,refs in [('phorkyas-sea', [('10',p) for p in ps10[34:]]+[('11',p) for p in ps11[:4]],descs1,['character-mephistopheles-scholar','group-ii-phorkyads','variant-ii-mephisto-phorkyas','group-ii-sirens','group-ii-nereids','group-ii-tritons','place-ii-aegean-coves']),('sea-nereus',[('11',p) for p in ps11[4:20]],descs2,['group-ii-sirens','group-ii-nereids','group-ii-tritons','place-ii-aegean-coves','character-ii-thales','character-ii-homunculus','character-ii-nereus'])]:
    assert len(parts)==16 and all(not p.find('img') for _,p in parts)
    plan=dict(batch_id=batch,grid=[4,4],source_image='source_images/'+batch+'-grid-001.png',references=refs,scenes=[dict(section='act-02-'+n,scene_id=p['id'],description=d) for (n,p),d in zip(parts,descs)])
    (root/f'plan-{batch}.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Registered 5 references; planned 32 source sections')
