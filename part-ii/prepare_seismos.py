import json
from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parent
ids=['3978','3983','3989','3995','3999','4005','4009','4013','4017','4023','4029','4033','4037','4041','4045','4049']
descs=['만토가 파우스트에게 어두운 통로로 들어오라고 권한다. 페르세포네는 아직 보이지 않는다.','만토가 예전에 오르페우스를 도왔던 길이라고 말하며 파우스트를 안내한다. 오르페우스를 실제로 추가하지 않는다.','페네이오스 상류에서 세이렌들이 물과 노래로 초대한다.','세이렌들이 에게해로 향하자며 날개를 펼친다.','물결이 거꾸로 밀려오고 지면이 떨리기 시작한다.','자갈과 강둑이 갈라지고 세이렌들이 떠나라고 재촉한다.','세이렌들이 달빛이 비치는 물길 쪽으로 향한다.','떨리는 땅을 뒤로하고 세이렌들이 서둘러 물가를 떠난다.','세이스모스가 땅 아래에서 어깨로 지면을 밀어 올린다.','스핑크스들이 떨리는 지면을 불쾌하게 느끼며 내려다본다.','스핑크스들은 큰 진동에도 자리를 바꾸지 않는다.','땅이 둥글게 솟아오르고 늙은 거인의 형상이 드러난다.','세이스모스가 팔에 힘을 주고 등을 굽혀 땅을 민다.','세이스모스가 흙과 잔디와 자갈을 들어 올린다. 아틀라스를 별도로 등장시키지 않는다.','골짜기를 가로질러 지층이 찢어지고 돌 구조물이 솟는다.','가슴까지 땅에 묻힌 세이스모스가 돌을 떠받치고 스핑크스들은 위에 자리를 잡는다.']
refs=['character-faust','character-ii-manto','group-ii-sirens','character-ii-sphinx','character-ii-seismos']
plan=dict(batch_id='seismos-upheaval',grid=[4,4],source_image='source_images/act-02-transition-007-008-grid-001.png',references=refs,generation_reference_images=['art-bible/'+x+'.png' for x in refs],scenes=[dict(section='act-02-'+('07' if i<2 else '08'),scene_id='source-'+ident,description=d) for i,(ident,d) in enumerate(zip(ids,descs))])
(root/'plan-seismos-upheaval.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
art=root.parent/'art-bible';ident='character-ii-seismos';assert (art/(ident+'.png')).is_file()
intro='강의 물결이 밀려오고 자갈밭이 갈라지자 땅 아래에서 늙은 거인의 형상이 드러난다. 세이스모스는 팔과 어깨에 힘을 주어 지면을 들어 올린다. 떠나려는 세이렌들과 자리를 지키는 스핑크스 사이에서, 풍경 자체를 바꾸는 힘을 보여 주는 존재다. 회색 피부와 거친 천, 돌가루가 묻은 모습은 창작 시각화다.'
entry=dict(id=ident,kind='character',name='세이스모스',source_name='SEISMOS',image=ident+'.png',sheet_scope='individual',menu_group='heaven',visual_locks=['늙은 회색 머리와 수염','강한 어깨와 팔·굽은 등','황토색·회색 거친 천','가슴까지 땅에 묻혀 지면을 떠받침'],canonical_note=intro,part=2,act_numbers=[2],chapter_numbers=[],source_urls=['../part-ii/act-02-08.html'],status='draft_visual')
f=art/'reference-index.json';data=json.loads(f.read_text(encoding='utf-8'));data['entries']=[e for e in data['entries'] if e['id']!=ident]+[entry];f.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
f=art/'index.html';soup=BeautifulSoup(f.read_text(encoding='utf-8'),'html.parser');old=soup.find(id=ident)
if old:old.decompose()
post=soup.new_tag('article',attrs={'class':'post','id':ident,'data-kind':'character','data-group':'heaven'})
for tag,txt in [('h2','세이스모스'),('p','SEISMOS'),('h3','기획의도'),('p',intro)]:
    n=soup.new_tag(tag);n.string=txt;post.append(n)
fig=soup.new_tag('figure');a=soup.new_tag('a',href=entry['image']);a.append(soup.new_tag('img',src=entry['image'],alt='세이스모스 일관성 참조 시트',loading='lazy'));fig.append(a);post.append(fig)
details=soup.new_tag('details');summary=soup.new_tag('summary');summary.string='시각적 단서와 원문 근거';details.append(summary);p=soup.new_tag('p');p.string=' · '.join(entry['visual_locks']);details.append(p);post.append(details);soup.select_one('.journal').append(post);f.write_text(str(soup),encoding='utf-8')
print('Registered Seismos; planned 16 scenes')
