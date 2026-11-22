import json
from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parent;art=root.parent/'art-bible'
specs=[
('variant-ii-empuse-donkey','엠푸사 · 당나귀 머리 변신','EMPUSE','variant','당나귀 머리·자주색 먹빛 로브·세이지 띠·한쪽 당나귀 발굽','엠푸사는 메피스토를 위해 당나귀 머리를 썼다고 말한다. 기존 로브와 발의 차이는 유지하고 머리만 바뀌게 해 같은 인물의 변신임을 보여 준다.'),
('character-ii-oreas','오레아스','OREAS','character','바위와 이어진 성인 여성 얼굴·참나무 잎·회녹색 망토','길을 잃은 메피스토에게 위로 올라오라고 부르는 산의 정령이다. 오레아스는 자신의 오래된 산과 방금 솟은 지형을 구별한다. 바위에서 드러난 얼굴과 참나무 잎은 창작 시각화다.'),
('character-ii-anaxagoras','아낙사고라스','ANAXAGORAS','character','긴 은회색 머리·각진 긴 수염·황토와 적갈색 고전 로브','산이 생겨난 이유를 두고 탈레스와 논쟁한다. 바위가 불의 기운으로 만들어졌다고 주장하는 태도를 강한 시선과 손짓으로 담았다. 얼굴과 의상 색상은 창작 시각화이며 실제 초상 복원이 아니다.'),
('character-ii-thales','탈레스','THALES','character','짧은 회색 곱슬머리·둥근 짧은 수염·푸른 로브와 상아색 숄','탈레스는 생명이 습기에서 생겨났다고 말하고 자연의 형성은 짧은 시간이나 폭력에 매이지 않는다고 답한다. 차분한 표정과 푸른 의상으로 아낙사고라스와 구별했다. 외모는 창작 시각화다.'),
('variant-ii-lamiae-bats','라미아 · 박쥐 변신','LAMIEN / FLEDERMÄUSE','variant','자연형 짙은 갈색 박쥐·막날개·큰 귀·발톱','라미아의 아름다운 겉모습을 붙잡으려던 메피스토의 주위에 박쥐 같은 검은 비행이 펼쳐진다. 인간 연구자가 아니라 자연형 박쥐의 날개와 비행으로 원문의 변화를 담는다. 색상은 창작 시각화다.')]
f=art/'reference-index.json';data=json.loads(f.read_text(encoding='utf-8'));html=art/'index.html';soup=BeautifulSoup(html.read_text(encoding='utf-8'),'html.parser')
for ident,name,source,kind,locks,intro in specs:
    assert (art/(ident+'.png')).is_file(),ident
    entry=dict(id=ident,kind=kind,name=name,source_name=source,image=ident+'.png',sheet_scope='collective' if 'bats' in ident else 'individual',menu_group='heaven',visual_locks=locks.split('·'),canonical_note=intro,part=2,act_numbers=[2],chapter_numbers=[],source_urls=['../part-ii/act-02-09.html'],status='draft_visual')
    data['entries']=[e for e in data['entries'] if e['id']!=ident]+[entry]
    old=soup.find(id=ident)
    if old:old.decompose()
    post=soup.new_tag('article',attrs={'class':'post','id':ident,'data-kind':kind,'data-group':'heaven'})
    for tag,txt in [('h2',name),('p',source),('h3','기획의도'),('p',intro)]:
        n=soup.new_tag(tag);n.string=txt;post.append(n)
    fig=soup.new_tag('figure');a=soup.new_tag('a',href=entry['image']);a.append(soup.new_tag('img',src=entry['image'],alt=name+' 일관성 참조 시트',loading='lazy'));fig.append(a);post.append(fig)
    det=soup.new_tag('details');s=soup.new_tag('summary');s.string='시각적 단서와 원문 근거';det.append(s);p=soup.new_tag('p');p.string=locks;det.append(p);post.append(det);soup.select_one('.journal').append(post)
f.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');html.write_text(str(soup),encoding='utf-8')
descs1=['메피스토가 엠푸사의 친척 인사를 못마땅해한다.','엠푸사가 당나귀 머리로 변신해 메피스토에게 보여 준다.','메피스토가 당나귀 머리는 인정하고 싶지 않다고 반응한다.','라미아들이 엠푸사 때문에 분위기가 깨진다고 불평한다.','메피스토가 라미아들의 얼굴 뒤에도 변신이 있을까 의심한다.','라미아들이 직접 골라 보라며 메피스토를 재촉한다.','메피스토가 무리 속으로 들어가자 라미아들이 가면을 벗으려 한다.','아름다운 얼굴 대신 마른 빗자루 같은 형상을 발견한 메피스토가 놀란다.','도마뱀이 메피스토 손에서 빠져나가고 뱀 같은 머리카락이 스친다.','메피스토 손에 솔방울이 달린 티르소스 지팡이가 잡힌다.','메피스토가 마지막으로 둥근 버섯 형상에 손을 뻗는다.','말불버섯이 터지며 라미아들이 흩어진다. 인체 손상은 없다.','검은 박쥐 무리가 메피스토 주위를 돈다.','메피스토가 북쪽이나 이곳이나 다르지 않다며 짜증을 낸다.','메피스토가 아름다운 가면을 잡으려다 기이한 형상을 잡았다고 되돌아본다.','메피스토가 사라진 길과 새 바위 지형을 보고 당황한다.']
descs2=['메피스토가 바위 사이를 오르내리며 스핑크스를 찾는다.','산의 정령 오레아스가 위로 올라오라고 부른다.','오레아스가 자신의 오래된 바위길과 산을 설명한다.','오레아스가 새로 솟은 환상의 산은 곧 사라질 것이라고 말한다.','메피스토가 참나무 잎에 둘러싸인 오레아스에게 인사한다.','덤불 옆에서 희미한 빛이 움직인다.','메피스토가 밀폐 유리병 안의 호문쿨루스를 알아본다.','호문쿨루스가 유리를 깨고 태어나고 싶지만 아직 위험하다고 말한다. 병은 깨지지 않는다.','호문쿨루스가 자연을 논하는 두 철학자를 뒤따르고 있다고 말한다. 두 사람은 아직 가까이 보이지 않는다.','메피스토가 스스로 판단해 보라고 답한다.','메피스토가 철학자에 대한 비꼬는 말을 이어 간다.','호문쿨루스가 조언도 쓸모 있다며 떠나고 메피스토가 배웅한다.','아낙사고라스가 탈레스에게 논쟁을 건다.','탈레스가 물의 성질과 생명의 기원을 말하며 아낙사고라스에게 답한다.','호문쿨루스가 두 철학자 곁에 떠서 함께 가고 싶다고 말한다.','탈레스가 자연은 긴 시간에 걸쳐 형성되며 폭력으로만 만들어지지 않는다고 설명한다.']
parts1=[('09',p) for p in BeautifulSoup((root/'act-02-09.html').read_text(encoding='utf-8'),'html.parser').select('section.panel-text')[16:32]]
parts2=[('09',p) for p in BeautifulSoup((root/'act-02-09.html').read_text(encoding='utf-8'),'html.parser').select('section.panel-text')[32:]]+[('10',p) for p in BeautifulSoup((root/'act-02-10.html').read_text(encoding='utf-8'),'html.parser').select('section.panel-text')[:2]]
for batch,parts,descs,refs in [('lamiae-metamorphosis',parts1,descs1,['character-mephistopheles-scholar','group-ii-lamiae','variant-ii-empuse-donkey','variant-ii-lamiae-bats']),('oreas-philosophers',parts2,descs2,['character-mephistopheles-scholar','character-ii-oreas','character-ii-homunculus','character-ii-anaxagoras','character-ii-thales'])]:
    assert len(parts)==16 and all(not p.find('img') for _,p in parts)
    plan=dict(batch_id=batch,grid=[4,4],source_image='source_images/'+batch+'-grid-001.png',references=refs,generation_reference_images=['art-bible/'+r+'.png' for r in refs],scenes=[dict(section='act-02-'+n,scene_id=p['id'],description=d) for (n,p),d in zip(parts,descs)])
    (root/f'plan-{batch}.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Registered 5 references; planned 2 batches / 32 source sections')
