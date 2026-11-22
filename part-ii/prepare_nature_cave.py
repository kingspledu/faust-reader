import json
from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parent;art=root.parent/'art-bible'
specs=[('character-ii-dryas','드리아스','DRYAS','individual','성인 여성·참나무 껍질빛 피부·밤색 땋은 머리·뿌리와 이어진 로브','고향의 냄새를 찾는 메피스토에게 이곳의 참나무를 존중하라고 말하는 정령이다. 나무껍질의 질감과 뿌리로 참나무와 이어진 존재임을 표현했다. 구체적인 외모와 의상은 창작 시각화다.'),('group-ii-phorkyads','포르키아데스','PHORKYADEN','collective','늙은 성인 여성·흰 잔머리·굽은 자세·먹빛 로브·공유하는 눈 구슬','메피스토는 동굴의 희미한 빛 속에 웅크린 세 자매를 본다. 한 자매가 낯선 방문객을 보려고 눈을 달라고 청한다. 같은 집단의 대표 외형으로 통일하고, 공유하는 눈은 상처 없이 작은 빛나는 구슬로 표현한다. 세부 얼굴과 색상은 창작 시각화다.')]
f=art/'reference-index.json';data=json.loads(f.read_text(encoding='utf-8'));html=art/'index.html';soup=BeautifulSoup(html.read_text(encoding='utf-8'),'html.parser')
for ident,name,source,scope,locks,intro in specs:
    assert (art/(ident+'.png')).is_file(),ident
    entry=dict(id=ident,kind='character',name=name,source_name=source,image=ident+'.png',sheet_scope=scope,menu_group='heaven',visual_locks=locks.split('·'),canonical_note=intro,part=2,act_numbers=[2],chapter_numbers=[],source_urls=['../part-ii/act-02-10.html'],status='draft_visual')
    data['entries']=[e for e in data['entries'] if e['id']!=ident]+[entry]
    old=soup.find(id=ident)
    if old:old.decompose()
    post=soup.new_tag('article',attrs={'class':'post','id':ident,'data-kind':'character','data-group':'heaven'})
    for tag,txt in [('h2',name),('p',source),('h3','기획의도'),('p',intro)]:
        n=soup.new_tag(tag);n.string=txt;post.append(n)
    fig=soup.new_tag('figure');a=soup.new_tag('a',href=entry['image']);a.append(soup.new_tag('img',src=entry['image'],alt=name+' 일관성 참조 시트',loading='lazy'));fig.append(a);post.append(fig)
    det=soup.new_tag('details');s=soup.new_tag('summary');s.string='시각적 단서와 원문 근거';det.append(s);p=soup.new_tag('p');p.string=locks;det.append(p);post.append(det);soup.select_one('.journal').append(post)
f.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');html.write_text(str(soup),encoding='utf-8')
d1=['아낙사고라스가 불과 증기로 산이 생겼다고 주장하며 바위를 가리킨다.','탈레스가 논쟁을 오래 해도 소용없다고 답한다.','아낙사고라스가 새 산에 작은 존재들이 모였다고 말한다.','아낙사고라스가 호문쿨루스에게 왕이 될 수 있다고 제안한다. 실제 왕관은 씌우지 않는다.','호문쿨루스가 탈레스에게 의견을 묻고 탈레스가 권하지 않는다고 답한다.','탈레스가 다가오는 검은 두루미 무리를 가리킨다.','두루미들이 작은 정착지를 향해 내려온다. 상처는 그리지 않는다.','두루미들의 반격을 피하며 작은 존재들이 흩어진다.','피그미족의 무장이 쓸모없게 되고 무리가 도망간다.','아낙사고라스가 하늘을 향해 도움을 청한다.','아낙사고라스가 달을 부르며 두 손을 올린다. 여신은 실제로 나타나지 않는다.','아낙사고라스의 시점에서 달의 어두운 그림자가 크게 느껴진다.','그가 보는 달이 점점 커져 위협적으로 다가온다. 이 현상은 인물의 시점이다.','그의 시야에서 거대한 달이 붉고 어둡게 변한다.','아낙사고라스가 가까워진 달을 보고 물러서며 겁을 낸다.','그의 시야에서 어두운 달빛이 번쩍이고 바람과 먼지가 몰아친다.']
d2=['아낙사고라스가 자신이 불렀다며 몸을 낮추고 탈레스는 의아해한다.','탈레스의 시야에서는 달이 원래 자리에 평온하게 떠 있다.','호문쿨루스가 모양이 달라진 산을 가리킨다.','호문쿨루스가 충돌에 대해 말한다. 직접 희생자를 그리지 않는다.','탈레스가 상상한 일이라고 답하며 호문쿨루스를 진정시킨다.','탈레스가 바다 축제로 가자고 하고 장면이 메피스토의 바위길로 이어진다.','메피스토가 가파른 바위 계단과 참나무 뿌리를 넘는다.','참나무 정령 드리아스가 메피스토에게 말을 건다.','드리아스가 이곳 참나무를 존중하라고 하고 메피스토가 답한다.','메피스토가 희미한 동굴 안의 세 형상을 가리키고 드리아스가 포르키아데스라고 알려 준다.','메피스토가 동굴로 다가가 멈춰 살핀다.','세 자매의 형상을 본 메피스토가 놀란다.','메피스토가 어두운 동굴 입구에서 기이한 모습에 대해 혼잣말한다.','포르키아데스 한 자매가 눈을 달라고 청하고 다른 자매가 빛나는 눈 구슬을 건넨다.','메피스토가 세 자매에게 정중히 인사한다.','메피스토가 여러 옛 신들을 보았다고 말한다. 언급한 신들을 실제로 등장시키지 않는다.']
for batch,start,descs,refs in [('nature-moon',2,d1,['character-ii-anaxagoras','character-ii-thales','character-ii-homunculus','group-ii-cranes','group-ii-pygmies']),('oak-cave',18,d2,['character-ii-anaxagoras','character-ii-thales','character-ii-homunculus','character-mephistopheles-scholar','character-ii-dryas','group-ii-phorkyads'])]:
    ps=BeautifulSoup((root/'act-02-10.html').read_text(encoding='utf-8'),'html.parser').select('section.panel-text')[start:start+16]
    assert len(ps)==16 and all(not p.find('img') for p in ps)
    images=['art-bible/'+r+'.png' for r in refs]
    if batch=='oak-cave': images=['part-ii/source_images/nature-moon-grid-001.png']+['art-bible/'+r+'.png' for r in ['character-ii-homunculus','character-mephistopheles-scholar','character-ii-dryas','group-ii-phorkyads']]
    plan=dict(batch_id=batch,grid=[4,4],source_image='source_images/'+batch+'-grid-001.png',references=refs,generation_reference_images=images,scenes=[dict(section='act-02-10',scene_id=p['id'],description=d) for p,d in zip(ps,descs)])
    (root/f'plan-{batch}.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Registered 2 references; planned 32 source sections')
