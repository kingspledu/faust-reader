import json
from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parent
ids=['4053','4059','4063','4067','4071','4075','4079','4085','4089','4095','4101','4105','4109','4113','4119','4125']
descs=['세이스모스가 아름다운 지형을 자신이 흔들어 만들었다고 자랑한다.','세이스모스가 자신이 밀어 올린 산을 가리킨다.','세이스모스가 옛 힘을 과시한 일을 말한다. 신이나 티탄을 실제로 추가하지 않는다.','세이스모스가 산을 움직였다는 자랑을 이어 간다. 현재 솟은 지형을 보여 준다.','세이스모스가 신들의 자리까지 높였다고 말한다. 아폴론이나 제우스를 등장시키지 않는다.','세이스모스가 새 땅에 살 존재들을 부른다.','스핑크스가 방금 솟은 지형이 오래된 것처럼 보인다고 말한다.','숲과 바위가 위로 밀려와도 스핑크스는 자리를 지킨다.','그리핀이 바위틈에 비치는 금을 발견하고 개미들을 부른다.','개미들이 솟은 바위를 빠르게 올라간다.','개미들이 틈 안팎을 오가며 작은 금 조각을 모은다.','개미들이 모서리와 구석까지 빠짐없이 살핀다.','개미들이 금을 운반하고 산 자체에는 관심을 두지 않는다.','그리핀들이 모인 금 위에 앞발을 올려 지킨다.','작은 성인 형상의 피그미족이 새 지형에 자리를 잡고 주위를 살핀다.','피그미족이 바위틈을 살 곳으로 여기고 들어간다.']
refs=['character-ii-seismos','character-ii-sphinx','character-ii-griffin','group-ii-gold-ants','group-ii-pygmies']
plan=dict(batch_id='mountain-gold',grid=[4,4],source_image='source_images/act-02-08-grid-002.png',references=refs,generation_reference_images=['art-bible/'+r+'.png' for r in refs],scenes=[dict(section='act-02-08',scene_id='source-'+i,description=d) for i,d in zip(ids,descs)])
(root/'plan-mountain-gold.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
art=root.parent/'art-bible';ident='group-ii-pygmies';assert (art/(ident+'.png')).is_file()
intro='거대한 힘으로 솟은 산에 작은 사람들이 나타난다. 이들은 어디에서 왔는지 묻지 말라며 이미 자리를 잡았다고 말한다. 바위의 틈도 이들에게는 살 곳이 된다. 작품 속 신화적 집단의 대표 형태로 성인의 얼굴과 비례를 유지하고 주변 풀과 돌로 작은 크기를 보여 준다. 실제 민족의 외모나 복식을 재현한 것이 아니며 머리와 의상은 창작 시각화다.'
entry=dict(id=ident,kind='character',name='피그미족',source_name='PYGMÄEN',image=ident+'.png',sheet_scope='collective',menu_group='heaven',visual_locks=['작은 크기·성인 얼굴과 비례','짧은 갈색 곱슬머리와 수염','올리브 회색 튜닉·갈색 바지와 장화'],canonical_note=intro,part=2,act_numbers=[2],chapter_numbers=[],source_urls=['../part-ii/act-02-08.html'],status='draft_visual')
f=art/'reference-index.json';data=json.loads(f.read_text(encoding='utf-8'));data['entries']=[e for e in data['entries'] if e['id']!=ident]+[entry];f.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
f=art/'index.html';soup=BeautifulSoup(f.read_text(encoding='utf-8'),'html.parser');old=soup.find(id=ident)
if old:old.decompose()
post=soup.new_tag('article',attrs={'class':'post','id':ident,'data-kind':'character','data-group':'heaven'})
for tag,txt in [('h2','피그미족'),('p','PYGMÄEN'),('h3','기획의도'),('p',intro)]:
    n=soup.new_tag(tag);n.string=txt;post.append(n)
fig=soup.new_tag('figure');a=soup.new_tag('a',href=entry['image']);a.append(soup.new_tag('img',src=entry['image'],alt='피그미족 일관성 참조 시트',loading='lazy'));fig.append(a);post.append(fig)
details=soup.new_tag('details');summary=soup.new_tag('summary');summary.string='시각적 단서와 원문 근거';details.append(summary);p=soup.new_tag('p');p.string=' · '.join(entry['visual_locks']);details.append(p);post.append(details);soup.select_one('.journal').append(post);f.write_text(str(soup),encoding='utf-8')
print('Registered Pygmies; planned 16 scenes')
