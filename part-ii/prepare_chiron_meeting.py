import json
from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parent
ids=['3703','3707','3711','3717','3723','3727','3731','3737','3749','3755','3761','3767','3773','3779','3785','3791']
descs=[
'한 백조가 깃털을 부풀리고 수면을 가르며 잎에 가려진 곳으로 향한다. 여왕은 보이지 않는다.',
'다른 백조들이 깃털을 빛내며 헤엄치다가 부산하게 움직여 님프들의 시선을 끈다.',
'성인 님프가 초록 강둑에 귀를 가까이 대고 다가오는 소리를 듣는다.',
'님프들이 말발굽 소리를 듣고 파우스트도 땅의 울림을 느낀다.',
'파우스트가 다가오는 발굽 소리 쪽을 기대하며 바라본다.',
'멀리 흰 말의 몸을 가진 케이론이 달려온다. 별도 말과 기수가 아니라 켄타우로스로 표현한다.',
'파우스트가 케이론을 알아보고 멈춰 달라고 부른다. 케이론이 고개를 돌린다.',
'멈추지 않는 케이론에게 파우스트가 태워 달라고 청하고 등에 올라탄다.',
'파우스트를 태운 케이론이 강을 건너며 어디로 가는지 묻는다.',
'파우스트가 영웅들을 가르쳤던 케이론을 칭찬한다. 영웅들을 실제 등장시키지 않는다.',
'케이론이 제자들은 결국 제 뜻대로 행동한다며 담담히 답한다. 파우스트가 귀를 기울인다.',
'파우스트가 식물과 뿌리를 알고 상처를 치료하는 케이론의 지식을 칭찬한다.',
'케이론이 예전에 치료를 도왔지만 이제는 다른 이들에게 맡겼다고 답한다. 실제 부상자를 추가하지 않는다.',
'파우스트가 칭찬을 피하는 태도까지 칭찬하자 케이론이 아첨을 잘한다며 받아친다.',
'케이론이 아첨을 지적해도 파우스트는 위대한 영웅들과 함께한 경험에 대해 질문을 이어 간다.',
'파우스트가 그 영웅들 가운데 누가 가장 뛰어났는지 묻는다. 케이론은 강을 건너며 듣는다.']
refs=['character-faust','character-ii-chiron','group-ii-nymphs','group-ii-swans']
plan=dict(batch_id='chiron-meeting',grid=[4,4],source_image='source_images/act-02-06-grid-002.png',references=refs,generation_reference_images=['art-bible/'+x+'.png' for x in refs],scenes=[dict(section='act-02-06',scene_id='source-'+i,description=d) for i,d in zip(ids,descs)])
(root/'plan-chiron-meeting.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
art=root.parent/'art-bible';ident='character-ii-chiron';assert (art/(ident+'.png')).is_file()
intro='발굽 소리를 듣고 돌아본 파우스트는 케이론을 알아본다. 케이론은 멈추지 않는 대신 등에 타라고 권하고 강을 건너 준다. 영웅들을 가르치고 치료한 경험을 칭찬받아도 스스로 대단하다고 말하지 않는다. 흰 말의 몸과 인간의 상반신을 지닌 켄타우로스로 통일했다. 머리와 수염, 의상 색상은 창작 시각화다.'
entry=dict(id=ident,kind='character',name='케이론',source_name='CHIRON',image=ident+'.png',sheet_scope='individual',menu_group='heaven',visual_locks=['철회색 긴 머리와 수염','올리브색·상아색 고전 튜닉','인간 상반신과 흰 말 몸통의 연결','네 개의 말 다리·별도 말 머리 없음'],canonical_note=intro,part=2,act_numbers=[2],chapter_numbers=[],source_urls=['../part-ii/act-02-06.html'],status='draft_visual')
f=art/'reference-index.json';data=json.loads(f.read_text(encoding='utf-8'));data['entries']=[e for e in data['entries'] if e['id']!=ident]+[entry];f.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
f=art/'index.html';soup=BeautifulSoup(f.read_text(encoding='utf-8'),'html.parser');old=soup.find(id=ident)
if old:old.decompose()
post=soup.new_tag('article',attrs={'class':'post','id':ident,'data-kind':'character','data-group':'heaven'})
for tag,txt in [('h2','케이론'),('p','CHIRON'),('h3','기획의도'),('p',intro)]:
    n=soup.new_tag(tag);n.string=txt;post.append(n)
fig=soup.new_tag('figure');a=soup.new_tag('a',href=entry['image']);a.append(soup.new_tag('img',src=entry['image'],alt='케이론 일관성 참조 시트',loading='lazy'));fig.append(a);post.append(fig)
details=soup.new_tag('details');summary=soup.new_tag('summary');summary.string='시각적 단서와 원문 근거';details.append(summary);p=soup.new_tag('p');p.string=' · '.join(entry['visual_locks']);details.append(p);post.append(details);soup.select_one('.journal').append(post);f.write_text(str(soup),encoding='utf-8')
print('Registered Chiron; planned 16 source panels')
