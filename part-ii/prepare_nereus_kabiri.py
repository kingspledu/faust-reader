import json
from pathlib import Path
from bs4 import BeautifulSoup

root = Path(__file__).resolve().parent
art = root.parent / 'art-bible'
ident = 'group-ii-kabiri-effigies'
intro = '바다의 무리가 거대한 거북 껍질에 실어 오는 작은 신상들이다. 노래는 이들을 난파한 사람을 구하는 오래된 신들이라고 부른다. 세 개를 가져왔다는 다음 구간의 말에 맞춰 세 신상을 한 묶음으로 정했다. 투박한 도기와 조각된 얼굴은 원문의 표현을 바탕으로 한 창작 시각화이며, 고대 유물의 실물 복원은 아니다.'
entry = dict(id=ident, kind='character', name='카비로이 신상', source_name='KABIREN', image=ident+'.png', sheet_scope='collective', menu_group='heaven', visual_locks=['작은 테라코타 신상 세 개','둥근 머리·각진 머리·골이 있는 머리','갈색·녹슨 황토색·투박한 도기 질감','거대한 거북 껍질에 실어 운반','살아 움직이는 인간으로 표현하지 않음'], canonical_note=intro, part=2, act_numbers=[2], chapter_numbers=[], source_urls=['../part-ii/act-02-11.html','../part-ii/act-02-12.html'], status='draft_visual')
assert (art/entry['image']).is_file()
idx=art/'reference-index.json'
data=json.loads(idx.read_text(encoding='utf-8'))
data['entries']=[e for e in data['entries'] if e['id']!=ident]+[entry]
idx.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
page=art/'index.html'
soup=BeautifulSoup(page.read_text(encoding='utf-8'),'html.parser')
old=soup.find(id=ident)
if old: old.decompose()
post=soup.new_tag('article',attrs={'class':'post','id':ident,'data-kind':'character','data-group':'heaven'})
for tag,txt in [('h2',entry['name']),('p','KABIREN'),('h3','기획의도'),('p',intro)]:
    n=soup.new_tag(tag);n.string=txt;post.append(n)
fig=soup.new_tag('figure');a=soup.new_tag('a',href=entry['image']);a.append(soup.new_tag('img',src=entry['image'],alt='카비로이 신상 일관성 참조 시트',loading='lazy'));fig.append(a);post.append(fig)
det=soup.new_tag('details');su=soup.new_tag('summary');su.string='시각적 단서와 원문 근거';det.append(su)
p=soup.new_tag('p');p.string=' · '.join(entry['visual_locks']);det.append(p);post.append(det);soup.select_one('.journal').append(post)
page.write_text(str(soup),encoding='utf-8')
parts=[]
for filename in ['act-02-11','act-02-12']:
    s=BeautifulSoup((root/(filename+'.html')).read_text(encoding='utf-8'),'html.parser')
    parts.extend((filename,p) for p in s.select('section.panel-text') if not p.find('img'))
descs=[
'네레우스가 파리스에게 경고했던 트로이의 파멸을 회상한다. 현재의 동굴과 대화만 그린다.',
'네레우스가 경고를 무시한 파리스의 선택을 못마땅해한다.',
'네레우스가 오디세우스에게 했던 경고까지 떠올린다. 회상 속 인물을 새로 등장시키지 않는다.',
'탈레스가 현자의 조언이 외면받는 고통에 공감하며 대화를 잇는다.',
'탈레스가 적은 감사도 큰 위로가 된다며 다시 도움을 청한다.',
'탈레스가 병 속 생명을 가리키지만 네레우스는 딸들을 기다린다고 답한다.',
'네레우스가 바다의 딸들을 이야기하며 처음으로 온화한 표정을 짓는다.',
'네레우스가 바다의 축제를 묘사하며 수면 쪽으로 손을 뻗는다. 딸들은 아직 등장시키지 않는다.',
'네레우스가 갈라테이아의 도착을 기대하며 바다를 바라본다. 아직 갈라테이아를 그리지 않는다.',
'네레우스가 탈레스에게 프로테우스를 찾아가라고 손짓한다.',
'탈레스가 병을 든 채 동굴에서 돌아서며 다음 조언자를 걱정한다.',
'탈레스가 길을 옮기고 멀리 바다를 보던 세이렌들이 움직임을 발견한다.',
'달빛 속 바다 무리가 멀리서 다가온다. 흰 옷자락이 돛처럼 보인다.',
'세이렌들이 바위에서 내려가고 네레이데스와 트리톤들이 받쳐 든 짐이 보인다.',
'바다 무리가 큰 거북 껍질에 실은 작은 도기 신상 세 개를 보여 준다.',
'세이렌들이 작은 신상들을 향해 노래한다. 신상은 움직이지 않는다.',
'네레이데스와 트리톤들이 카비로이 신상을 가져왔다며 축제를 알린다.',
'바다 무리가 신상들을 받쳐 들고 세이렌들의 노래에 응답한다.',
'세이렌들이 난파한 이들을 구하는 신들을 노래한다. 실제 난파 장면은 추가하지 않는다.',
'바다 무리가 가져온 세 신상을 가리키며 오지 않은 넷째를 이야기한다. 넷째는 그리지 않는다.',
'세이렌들이 바다 무리의 설명에 짓궂게 응답한다.',
'바다 무리와 세이렌들이 신들의 수를 두고 주고받는다. 보이는 신상은 세 개다.',
'네레이데스가 알 수 없는 나머지 신들을 말하며 어깨를 살짝 으쓱한다.',
'바다 무리가 세 신상에 관한 설명을 이어 간다.',
'세이렌들이 하늘의 달을 향해 노래한다.',
'바다 무리가 신상을 받쳐 든 채 축제를 이끈다는 자부심을 드러낸다.',
'세이렌들이 노래로 응답한다. 황금 양털이나 영웅은 비유 속 대상이므로 새로 그리지 않는다.',
'세이렌의 합창 뒤 병 속 호문쿨루스가 도기 신상들을 관찰한다.',
'호문쿨루스와 탈레스가 오래된 신상의 가치에 관해 이야기한다.',
'보이지 않는 프로테우스의 목소리에 탈레스가 이쪽저쪽을 돌아본다. 새 형체는 그리지 않는다.',
'탈레스가 목소리가 들린 쪽을 찾지만 프로테우스는 모습을 감춘다.',
'탈레스가 호문쿨루스에게 밝게 빛나라고 청한다. 밀폐된 병은 깨지지 않는다.'
]
refs=['character-ii-thales','character-ii-homunculus','character-ii-nereus','group-ii-sirens','group-ii-nereids','group-ii-tritons',ident,'place-ii-aegean-coves']
for j,batch in enumerate(['nereus-kabiri','kabiri-hidden-proteus']):
    chosen=parts[j*16:(j+1)*16];assert len(chosen)==16
    plan=dict(batch_id=batch,grid=[4,4],source_image='source_images/'+batch+'-grid-001.png',references=refs,scenes=[dict(section=f,scene_id=p['id'],description=d) for (f,p),d in zip(chosen,descs[j*16:(j+1)*16])])
    (root/('plan-'+batch+'.json')).write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Registered Kabiri reference; planned 32 source-aligned illustrations')
