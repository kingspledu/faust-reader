import json
from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parent
ids=['3882','3888','3892','3898','3902','3906','3912','3916','3920','3928','3936','3940','3946','3956','3966','3972']
descs=[
'케이론이 신화 속 인물의 시간은 시인의 필요에 따라 달라진다고 설명한다.',
'케이론이 시인에게는 시간이 구속이 되지 않는다고 말을 잇는다. 헬레네의 모습을 새로 그리지 않는다.',
'파우스트가 헬레네 또한 시간에 묶이지 않기를 바라며 반응한다.',
'파우스트가 헬레네를 삶으로 불러오고 싶다는 열망을 말한다.',
'파우스트가 그녀를 얻지 못하면 살 수 없다며 집착을 드러낸다.',
'케이론이 파우스트의 격한 상태를 걱정하며 도울 방법을 말한다.',
'케이론이 만토를 찾아가는 일을 설명한다. 아직 만토를 현재 장면에 넣지 않는다.',
'케이론이 만토의 온화함을 말하며 앞으로 향한다.',
'케이론이 치유를 권하지만 파우스트는 낫고 싶지 않다고 거절한다.',
'강을 건너 도착한 케이론이 파우스트에게 내리라고 하고 파우스트가 강둑에 선다.',
'케이론이 강과 산 사이의 옛 전투에 대해 설명한다. 현재 전쟁 장면으로 만들지 않는다.',
'달빛 아래 신전이 드러나고 만토가 계단에서 발굽 소리를 듣는다.',
'만토가 케이론을 맞이하고 케이론이 답한다. 파우스트는 곁에 서 있다.',
'돌아다니는 케이론과 자리를 지키는 만토가 서로의 생활을 이야기한다.',
'만토가 파우스트를 묻자 케이론이 그가 헬레네를 찾고 있다고 설명한다.',
'케이론이 치유가 필요하다고 말하지만 만토는 불가능한 것을 바라는 파우스트에게 관심을 보인다.']
refs=['character-faust','character-ii-chiron','character-ii-manto']
plan=dict(batch_id='manto-arrival',grid=[4,4],source_image='source_images/act-02-07-grid-002.png',references=refs,generation_reference_images=['art-bible/'+x+'.png' for x in refs],scenes=[dict(section='act-02-07',scene_id='source-'+i,description=d) for i,d in zip(ids,descs)])
(root/'plan-manto-arrival.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
art=root.parent/'art-bible';ident='character-ii-manto';assert (art/(ident+'.png')).is_file()
intro='케이론이 멈춘 곳에는 달빛을 받은 신전이 있다. 계단에 울리는 발굽 소리를 들은 만토는 익숙한 방문객을 맞이하고 낯선 파우스트를 바라본다. 케이론은 파우스트를 치료받아야 할 사람으로 소개하지만 만토는 불가능한 것을 바라는 마음에 주목한다. 차분한 눈빛과 단정한 옷차림으로 두 사람의 말을 듣는 태도를 담았다. 머리와 의상, 색상은 창작 시각화다.'
entry=dict(id=ident,kind='character',name='만토',source_name='MANTO',image=ident+'.png',sheet_scope='individual',menu_group='heaven',visual_locks=['짙은 잿빛 갈색 땋은 머리','회녹색 눈과 온화한 표정','상아색 고전 드레이프·세이지 숄'],canonical_note=intro,part=2,act_numbers=[2],chapter_numbers=[],source_urls=['../part-ii/act-02-07.html'],status='draft_visual')
f=art/'reference-index.json';data=json.loads(f.read_text(encoding='utf-8'));data['entries']=[e for e in data['entries'] if e['id']!=ident]+[entry];f.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
f=art/'index.html';soup=BeautifulSoup(f.read_text(encoding='utf-8'),'html.parser');old=soup.find(id=ident)
if old:old.decompose()
post=soup.new_tag('article',attrs={'class':'post','id':ident,'data-kind':'character','data-group':'heaven'})
for tag,txt in [('h2','만토'),('p','MANTO'),('h3','기획의도'),('p',intro)]:
    node=soup.new_tag(tag);node.string=txt;post.append(node)
figure=soup.new_tag('figure');a=soup.new_tag('a',href=entry['image']);a.append(soup.new_tag('img',src=entry['image'],alt='만토 일관성 참조 시트',loading='lazy'));figure.append(a);post.append(figure)
details=soup.new_tag('details');summary=soup.new_tag('summary');summary.string='시각적 단서와 원문 근거';details.append(summary);p=soup.new_tag('p');p.string=' · '.join(entry['visual_locks']);details.append(p);post.append(details);soup.select_one('.journal').append(post);f.write_text(str(soup),encoding='utf-8')
print('Registered Manto and planned 16 source panels')
