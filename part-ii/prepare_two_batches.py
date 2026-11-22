import json
from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parent;art=root.parent/'art-bible'
specs=[
('group-ii-daktyls','다크틸족','DAKTYLE','collective','작은 성인 장인·그을음색과 황토색 튜닉·나뭇가지 묶음','작은 존재들 사이에서 더욱 작은 다크틸족이 등장한다. 이들은 나무와 숯을 준비하라는 명령을 받지만, 자신들이 마련한 쇠가 사슬로 바뀔 것을 걱정한다. 성인 비례와 주변 소품의 크기로 작음을 표현했다. 복식과 색상은 창작 시각화다.'),
('group-ii-herons','왜가리','REIHER','collective','회백색 깃털·긴 노란 부리·가는 다리·머리 장식깃','연못에 둥지를 튼 왜가리들이 장식깃을 노리는 공격의 대상이 된다. 새의 형태와 깃털을 구분해 뒤에 등장하는 두루미와 혼동하지 않도록 했다. 공격의 결과는 직접적인 상처보다 깃털과 조용해진 물가로 보여 준다.'),
('group-ii-cranes','이비코스의 두루미','KRANICHE DES IBYKUS','collective','회색 깃털·긴 목과 다리·검은 목·흰 뺨·작은 붉은 정수리','하늘을 지나던 두루미들이 물가에서 들리는 비명을 듣는다. 이들은 왜가리의 죽음을 애도하고 동료 새들을 부른다. 긴 날개의 대열과 아래를 내려다보는 자세로 집단의 목소리를 담는다. 세부 색상은 창작 시각화다.'),
('character-ii-empuse','엠푸사','EMPUSE','individual','성인 여성·흐트러진 회흑색 머리·자주색과 먹빛 로브·한쪽 당나귀 발굽','라미아들 사이에 엠푸사가 끼어들자 무리가 달가워하지 않는다. 엠푸사는 메피스토를 친척처럼 부르며 서로의 발을 비교한다. 한쪽 당나귀 발굽이 옷자락 아래 보이게 하여 대화의 단서를 남겼다. 머리와 얼굴, 의상 색상은 창작 시각화다.')]
f=art/'reference-index.json';data=json.loads(f.read_text(encoding='utf-8'));html=art/'index.html';soup=BeautifulSoup(html.read_text(encoding='utf-8'),'html.parser')
for ident,name,source,scope,locks,intro in specs:
    assert (art/(ident+'.png')).is_file(),ident
    entry=dict(id=ident,kind='character',name=name,source_name=source,image=ident+'.png',sheet_scope=scope,menu_group='heaven',visual_locks=locks.split('·'),canonical_note=intro,part=2,act_numbers=[2],chapter_numbers=[],source_urls=['../part-ii/act-02-'+('09' if 'empuse' in ident else '08')+'.html'],status='draft_visual')
    data['entries']=[e for e in data['entries'] if e['id']!=ident]+[entry]
    old=soup.find(id=ident)
    if old:old.decompose()
    post=soup.new_tag('article',attrs={'class':'post','id':ident,'data-kind':'character','data-group':'heaven'})
    for tag,txt in [('h2',name),('p',source),('h3','기획의도'),('p',intro)]:
        n=soup.new_tag(tag);n.string=txt;post.append(n)
    fig=soup.new_tag('figure');a=soup.new_tag('a',href=entry['image']);a.append(soup.new_tag('img',src=entry['image'],alt=name+' 일관성 참조 시트',loading='lazy'));fig.append(a);post.append(fig)
    det=soup.new_tag('details');s=soup.new_tag('summary');s.string='시각적 단서와 원문 근거';det.append(s);p=soup.new_tag('p');p.string=locks;det.append(p);post.append(det);soup.select_one('.journal').append(post)
f.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');html.write_text(str(soup),encoding='utf-8')
descs1=['작은 성인 피그미족들이 짝을 지어 새 터를 정돈한다.','피그미족이 새 땅의 풍요에 만족하며 바위틈을 살핀다.','더 작은 성인 다크틸족이 나타난다.','피그미족 장로가 자리를 잡고 서둘러 일하라고 지시한다.','아직 평화로울 때 대장간을 마련하고 무장을 준비하라고 한다.','개미들에게 금속을 가져오라고 지시한다.','다크틸족이 나뭇가지를 모은다.','숯불을 준비하는 일꾼들 곁에서 지휘관이 활을 들고 출동을 명한다.','지휘관이 연못의 왜가리들을 가리킨다.','피그미족 무리가 장식깃을 얻으려는 공격을 준비한다. 직접 명중은 그리지 않는다.','개미와 다크틸족이 쇠가 사슬이 될 것을 걱정한다.','두루미들이 비명을 듣고 내려다본다.','두루미들이 조용해진 연못과 흩어진 깃털을 보며 애도한다. 상처와 시체는 그리지 않는다.','깃털 장식이 달린 피그미족의 투구와 이를 내려다보는 두루미를 보여 준다.','두루미들이 하늘의 동료들을 부른다.','두루미들이 무리를 이루며 반격을 다짐한다. 실제 공격 장면은 아직 없다.']
descs2=['메피스토가 낯선 존재들 속에서 북쪽 마녀들의 산을 떠올린다. 회상 인물을 추가하지 않는다.','메피스토가 익숙했던 곳을 생각하며 밤길을 걷는다.','발밑의 지형이 바뀌는 것을 메피스토가 경계한다.','솟아오른 산이 스핑크스와 메피스토 사이를 가른다.','메피스토가 앞서 춤추는 라미아 무리를 따라간다.','라미아들이 빠르게 움직였다가 멈추며 말을 나눈다.','라미아들이 메피스토를 끌고 가는 일을 즐긴다.','메피스토가 뻣뻣한 한쪽 다리를 끌며 뒤따른다.','도망가는 라미아를 보며 메피스토가 짜증을 낸다.','메피스토가 오래 살아도 현명해지지 않는다며 자조한다.','알면서도 따라가는 자기 행동에 메피스토가 불평한다.','라미아들이 멈칫한 메피스토에게 다시 다가온다.','라미아들이 메피스토를 둘러싸고 춤춘다.','불확실한 불빛 속에서 메피스토가 라미아의 얼굴을 살핀다.','엠푸사가 끼어들자 라미아들이 불만을 보인다.','엠푸사가 한쪽 당나귀 발굽을 드러내며 메피스토에게 인사한다.']
for batch,section,start,descs,refs in [('pygmy-forge','08',30,descs1,['group-ii-pygmies','group-ii-daktyls','group-ii-gold-ants','group-ii-herons','group-ii-cranes']),('lamiae-pursuit','09',0,descs2,['character-mephistopheles-scholar','group-ii-lamiae','character-ii-empuse'])]:
    panels=BeautifulSoup((root/f'act-02-{section}.html').read_text(encoding='utf-8'),'html.parser').select('section.panel-text')[start:start+16]
    assert len(panels)==16 and all(not p.find('img') for p in panels)
    plan=dict(batch_id=batch,grid=[4,4],source_image=f'source_images/act-02-{section}-grid-'+('003' if section=='08' else '001')+'.png',references=refs,generation_reference_images=['art-bible/'+r+'.png' for r in refs],scenes=[dict(section='act-02-'+section,scene_id=p['id'],description=d) for p,d in zip(panels,descs)])
    (root/f'plan-{batch}.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Registered 4 references and planned 2 batches / 32 source sections')
