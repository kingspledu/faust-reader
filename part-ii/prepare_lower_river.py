import json
from pathlib import Path
from bs4 import BeautifulSoup

root=Path(__file__).resolve().parent
descriptions=[
('05','source-3630','스핑크스가 움직이지 않고 달과 해의 시간을 말한다. 피라미드는 대화 속 설명이므로 현재 강가를 유지한다.'),
('05','source-3633','스핑크스가 홍수와 전쟁과 평화에도 표정을 바꾸지 않는 태도로 강가에 앉아 있다. 실제 전쟁을 추가하지 않는다.'),
('06','source-3639','페네이오스가 갈대와 버드나무에 조용히 속삭이라고 말한다. 강의 신과 하류의 갈대숲을 보여 준다.'),
('06','source-3645','포플러 잎이 떨리고 페네이오스가 불안한 기운에 잠에서 깬다.'),
('06','source-3649','파우스트가 덤불과 나뭇가지 너머에서 들리는 소리에 귀를 기울인다.'),
('06','source-3655','물결과 바람이 사람 목소리처럼 들리는 가운데 님프가 파우스트에게 말을 건다.'),
('06','source-3661','님프가 서늘한 강가에서 피곤한 몸을 쉬라고 파우스트를 초대한다.'),
('06','source-3665','님프들이 물소리와 함께 속삭이지만 파우스트는 깨어 있다고 답한다.'),
('06','source-3671','파우스트가 강가의 형상을 바라보며 꿈인지 기억인지 생각한다.'),
('06','source-3675','천천히 흐르는 물이 무성한 덤불 사이를 지난다. 잎과 물의 디테일을 담는다.'),
('06','source-3679','작은 샘들이 맑은 얕은 물가로 모인다. 성인 님프는 단정한 드레이프 차림으로 물에 있다.'),
('06','source-3683','단정한 드레이프 차림의 성인 님프들이 물을 헤엄치거나 얕은 곳을 걷고 수면에 비친다.'),
('06','source-3687','성인 님프들의 물장난에도 파우스트의 시선은 더 먼 곳으로 향한다.'),
('06','source-3691','잎이 무성한 곳에 가려진 여왕을 찾는 파우스트의 시선과 다가오는 백조를 보여 준다. 여왕의 얼굴은 드러내지 않는다.'),
('06','source-3695','백조들이 만에서 고요하고 우아하게 헤엄쳐 나온다.'),
('06','source-3699','한 백조가 목과 가슴을 당당히 세우고 무리 사이를 빠르게 지나간다.')]
refs=['character-ii-sphinx','character-faust','character-ii-peneios','group-ii-nymphs','group-ii-swans']
plan=dict(batch_id='lower-peneios-arrival',grid=[4,4],source_image='source_images/act-02-transition-005-006-grid-001.png',references=refs,generation_reference_images=['art-bible/'+x+'.png' for x in refs],scenes=[dict(section='act-02-'+n,scene_id=ident,description=desc) for n,ident,desc in descriptions])
(root/'plan-lower-peneios-arrival.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
specs=[
('character-ii-peneios','페네이오스','PENEIOS','individual','은회색 머리와 짧은 수염·청록 드레이프·갈대 관','강가의 갈대와 버드나무가 속삭이는 곳에서 페네이오스가 말을 건넨다. 고요히 쉬고 싶지만 수면 아래로 전해지는 떨림 때문에 잠에서 깬다. 강과 이어진 옷자락과 차분한 색상은 창작 시각화이며 원문은 목소리와 주변의 움직임을 기준으로 삼았다.'),
('group-ii-nymphs','님프','NYMPHEN','collective','성인 여성·긴 청록 머리·상아색과 옅은 물빛의 단정한 드레이프','님프들은 지친 파우스트에게 쉬라고 권한다. 물소리와 속삭임이 겹치는 분위기를 부드러운 자세와 흐르는 옷자락으로 그렸다. 얼굴과 색상은 창작 시각화다. 목욕 장면도 성인 인물의 단정한 차림과 물의 반사로 표현한다.'),
('group-ii-swans','백조','SCHWÄNE','collective','흰 깃털·긴 목·주황색과 검은색 부리·물갈퀴 발','파우스트가 무성한 잎 너머를 바라볼 때 백조들이 만에서 헤엄쳐 나온다. 그중 한 마리가 가슴을 세우고 무리 사이를 빠르게 지난다. 신화적 정체를 확정하지 않고 원문에 보이는 백조의 자세와 움직임을 기준으로 삼았다.')]
art=root.parent/'art-bible';index=art/'reference-index.json';data=json.loads(index.read_text(encoding='utf-8'));page=art/'index.html';soup=BeautifulSoup(page.read_text(encoding='utf-8'),'html.parser')
for ident,name,source,scope,locks,intro in specs:
    assert (art/(ident+'.png')).is_file()
    entry=dict(id=ident,kind='character',name=name,source_name=source,image=ident+'.png',sheet_scope=scope,menu_group='heaven',visual_locks=locks.split('·'),canonical_note=intro,part=2,act_numbers=[2],chapter_numbers=[],source_urls=['../part-ii/act-02-06.html'],status='draft_visual')
    data['entries']=[e for e in data['entries'] if e['id']!=ident]+[entry]
    old=soup.find(id=ident)
    if old:old.decompose()
    post=soup.new_tag('article',attrs={'class':'post','id':ident,'data-kind':'character','data-group':'heaven'})
    for tag,txt in [('h2',name),('p',source),('h3','기획의도'),('p',intro)]:
        node=soup.new_tag(tag);node.string=txt;post.append(node)
    figure=soup.new_tag('figure');link=soup.new_tag('a',href=entry['image']);link.append(soup.new_tag('img',src=entry['image'],alt=name+' 일관성 참조 시트',loading='lazy'));figure.append(link);post.append(figure)
    details=soup.new_tag('details');summary=soup.new_tag('summary');summary.string='시각적 단서와 원문 근거';details.append(summary);p=soup.new_tag('p');p.string=locks;details.append(p);post.append(details);soup.select_one('.journal').append(post)
index.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');page.write_text(str(soup),encoding='utf-8')
print('Registered 3 references and planned 16 scenes')
