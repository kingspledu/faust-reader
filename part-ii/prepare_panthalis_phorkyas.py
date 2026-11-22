import json
from pathlib import Path
from bs4 import BeautifulSoup
r=Path(__file__).resolve().parent;a=r.parent/'art-bible';ident='character-iii-panthalis'
assert (a/(ident+'.png')).is_file()
intro='합창을 이끄는 판탈리스는 헬레네가 궁전에서 급히 돌아오는 모습을 먼저 알아차리고 이유를 묻는다. 황토색 드레스와 파란 숄은 시녀들과 이어지고, 관찰하는 표정과 작은 청동 고리로 역할을 구별했다. 외모와 나이·복식의 세부는 창작 시각화다.'
e=dict(id=ident,name='판탈리스',source_name='PANTHALIS / CHORFÜHRERIN',kind='character',image=ident+'.png',sheet_scope='individual',menu_group='heaven',visual_locks=['성숙한 성인 여성·갈색 눈','짙은 밤색 땋은 쪽머리·왼쪽 관자놀이 은빛 가닥','황토색 긴소매 드레스·탁한 파란 숄','오른쪽 어깨의 타원 청동 브로치'],canonical_note=intro,part=2,act_numbers=[3],chapter_numbers=[],source_urls=['../part-ii/act-03-01.html','../part-ii/act-03-02.html'],status='draft_visual')
idx=a/'reference-index.json';data=json.loads(idx.read_text(encoding='utf-8'));data['entries']=[x for x in data['entries'] if x['id']!=ident]+[e];idx.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=a/'index.html';s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser');post=s.new_tag('article',attrs={'class':'post','id':ident,'data-kind':'character','data-group':'heaven'})
for tag,txt in [('h2','판탈리스'),('p',e['source_name']),('h3','기획의도'),('p',intro)]:
 n=s.new_tag(tag);n.string=txt;post.append(n)
fig=s.new_tag('figure');link=s.new_tag('a',href=e['image']);link.append(s.new_tag('img',src=e['image'],alt='판탈리스 일관성 참조 시트',loading='lazy'));fig.append(link);post.append(fig);s.select_one('.journal').append(post);p.write_text(str(s),encoding='utf-8')
parts=[]
for f in ['act-03-01','act-03-02']:
 soup=BeautifulSoup((r/(f+'.html')).read_text(encoding='utf-8'),'html.parser');parts.extend((f,x) for x in soup.select('section.panel-text') if not x.find('img'))
descs=['시녀들이 궁전 앞에서 헬레네의 귀환을 노래한다.','헬레네가 궁전으로 들어간 뒤 시녀들이 문을 바라본다.','합창단이 귀향을 기뻐한다. 신의 몸을 새로 그리지 않는다.','시녀가 해방의 기쁨을 노래한다. 날개나 감옥을 현재에 추가하지 않는다.','합창단이 헬레네의 귀향을 이야기한다.','시녀들이 옛집의 문을 바라본다.','판탈리스가 노래를 멈추라고 손짓한다.','판탈리스가 궁전에서 급히 돌아오는 헬레네를 알아본다.','판탈리스가 헬레네의 놀람과 분노를 보고 이유를 묻는다.','헬레네가 평범한 두려움과 다른 공포를 설명한다.','헬레네가 시녀들에게 겪은 일을 말한다.','헬레네가 햇빛 아래 서서 물러서지 않겠다고 마음먹는다.','판탈리스가 헬레네에게 자세히 말해 달라고 청한다.','헬레네가 말로 겪은 일을 설명하기 시작한다.','궁전의 비어 있는 내부 복도. 헬레네가 들어섰던 기억을 공간으로 보여 준다.','기억 속 헬레네가 텅 빈 난롯가로 다가간다.','기억 속 난롯가에 두건 쓴 포르키아스가 앉아 있다.','두건 쓴 포르키아스가 한쪽 팔을 움직이고 헬레네가 지켜본다.','기억 속 헬레네가 내부 계단으로 향한다.','포르키아스가 일어나 헬레네의 길을 막는다.','현재의 궁전 문턱에 포르키아스가 나타나고 헬레네가 시녀들에게 가리킨다.','시녀들이 문턱의 포르키아스를 보고 동요한다.','합창단이 전쟁의 기억을 말한다. 현재의 얼굴을 보여 준다.','시녀들이 두려움에 서로 가까이 선다. 현재에 전사나 신을 추가하지 않는다.','시녀들의 불안한 눈과 맞잡은 손을 보여 준다.','판탈리스가 합창단의 반응을 살피고 포르키아스를 바라본다.','시녀가 기억 속 거대한 모습을 말한다. 실제 거인을 추가하지 않는다.','시녀가 기억이 사실인지 두려움의 상상인지 망설인다.','시녀들이 현재 문턱의 포르키아스를 바라본다.','합창단이 포르키아스의 정체를 묻는다.','포르키아스의 감은 눈과 붉은 눈, 긴 이 하나가 보인다.','궁전 앞에서 헬레네와 시녀들, 포르키아스가 마주 선다.']
refs=['character-iii-helena','group-iii-helena-chorus',ident,'variant-ii-mephisto-phorkyas','place-iii-sparta-palace']
for i,b in enumerate(['panthalis-return','phorkyas-threshold']):
 chosen=parts[i*16:(i+1)*16];assert len(chosen)==16
 inputs=['art-bible/character-iii-helena.png','art-bible/group-iii-helena-chorus.png','art-bible/character-iii-panthalis.png','art-bible/variant-ii-mephisto-phorkyas.png','art-bible/place-iii-sparta-palace.png']
 plan=dict(batch_id=b,grid=[4,4],source_image='source_images/'+b+'-grid-001.png',references=refs,generation_reference_images=inputs,scenes=[dict(section=f,scene_id=x['id'],description=txt) for (f,x),txt in zip(chosen,descs[i*16:(i+1)*16])])
 (r/('plan-'+b+'.json')).write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Registered Panthalis; planned32panels')
