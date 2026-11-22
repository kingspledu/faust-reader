import json
from pathlib import Path
from bs4 import BeautifulSoup
r=Path(__file__).resolve().parent;a=r.parent/'art-bible'
specs=[('character-iii-helena','헬레네','HELENA','character','individual','꿀빛 금발·호박색 눈·금 월계관·상아색 긴소매 드레스·버건디 망토','스파르타 궁전으로 돌아온 헬레네는 남편이 자신을 어떻게 맞이할지 알지 못한다. 이름과 아름다움에 붙은 소문보다 지금 문턱 앞에서 느끼는 불안에 시선을 두었다. 외모와 복식은 창작 시각화다.'),('group-iii-helena-chorus','헬레네의 시녀 합창단','CHOR','character','collective','짙은 밤색 땋은 머리·황토색 긴소매 드레스·탁한 파란 숄·청동 허리띠','헬레네를 따라 궁전 앞에 선 여성들의 합창이다. 그녀를 위로하면서 자신들이 겪은 일도 이야기한다. 같은 계열 복식으로 역할을 구분하며 외모는 창작 디자인이다.'),('place-iii-sparta-palace','스파르타의 메넬라오스 궁전','PALAST DES MENELAS','place','place','한 쌍의 청동 문·밝은 석회암 기둥·넓은 일곱 계단·적갈색 인방·왼쪽 올리브나무','제3막은 귀향한 헬레네가 궁전 문 앞에 선 장면으로 시작한다. 문턱과 계단을 중심으로 바깥 마당과 내부 공간을 연결했다. 지도와 건축은 창작 무대 설계이며 고대 궁전 실물 복원이 아니다.')]
idx=a/'reference-index.json';d=json.loads(idx.read_text(encoding='utf-8'));p=a/'index.html';s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser')
for ident,name,src,kind,scope,locks,intro in specs:
 assert (a/(ident+'.png')).is_file()
 group='places' if kind=='place' else 'heaven'
 e=dict(id=ident,name=name,source_name=src,kind=kind,image=ident+'.png',sheet_scope=scope,menu_group=group,visual_locks=locks.split('·'),canonical_note=intro,part=2,act_numbers=[3],chapter_numbers=[],source_urls=['../part-ii/act-03-01.html'],status='draft_visual')
 d['entries']=[x for x in d['entries'] if x['id']!=ident]+[e]
 old=s.find(id=ident)
 if old:old.decompose()
 post=s.new_tag('article',attrs={'class':'post','id':ident,'data-kind':kind,'data-group':group})
 for tag,txt in [('h2',name),('p',src),('h3','기획의도'),('p',intro)]:
  n=s.new_tag(tag);n.string=txt;post.append(n)
 fig=s.new_tag('figure');link=s.new_tag('a',href=e['image']);link.append(s.new_tag('img',src=e['image'],alt=name+' 일관성 참조 시트',loading='lazy'));fig.append(link);post.append(fig)
 det=s.new_tag('details');su=s.new_tag('summary');su.string='시각적 단서와 원문 근거';det.append(su);n=s.new_tag('p');n.string=locks;det.append(n);post.append(det);s.select_one('.journal').append(post)
idx.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');p.write_text(str(s),encoding='utf-8')
parts=[]
for f in ['act-02-13','act-03-01']:
 soup=BeautifulSoup((r/(f+'.html')).read_text(encoding='utf-8'),'html.parser');parts.extend((f,x) for x in soup.select('section.panel-text') if not x.find('img'))
descs=['빛나는 밤바다에서 바다 무리가 마지막 합창을 한다.','새 장면의 낮, 헬레네가 스파르타 궁전 문 앞에 도착한다.','헬레네가 항해의 흔들림을 떠올리며 궁전 앞에 선다.','헬레네가 고향의 궁전에 인사한다.','헬레네가 어린 시절의 기억을 떠올리며 청동 문을 본다. 과거 인물을 추가하지 않는다.','헬레네가 문을 열어 달라며 손을 뻗는다.','헬레네가 불안을 감추고 문턱 앞에서 마음을 다잡는다.','헬레네가 소문과 과거를 말한다. 현재의 궁전 앞 장면을 유지한다.','시녀 합창단이 헬레네를 위로한다.','시녀들이 아름다움의 명성을 이야기하며 응답한다.','헬레네가 남편의 뜻을 모르겠다며 시녀들에게 말한다.','헬레네가 자신의 처지가 왕비인지 포로인지 고민한다.','궁전의 큰 문 아래에서 헬레네가 불길한 예감을 느낀다.','헬레네가 남편의 침묵을 회상한다. 남편을 현재에 등장시키지 않는다.','헬레네가 남편의 명령을 시녀들에게 전한다.','헬레네가 강을 따라오라는 명령을 이야기한다. 현재의 궁전 앞을 유지한다.','헬레네가 궁전을 살피라는 명령을 이어 전한다.','헬레네가 시녀와 보물을 확인하라는 말을 전한다.','헬레네가 집 안의 질서를 말하며 문을 바라본다.','시녀 합창단이 장신구를 말하며 헬레네에게 응답한다.','시녀들이 헬레네에게 궁전 안으로 들어가자고 권한다.','헬레네가 제사용 그릇을 준비하라는 말을 전한다.','헬레네가 세발솥과 물항아리를 열거한다. 상징적 소품 세부로 표현한다.','물항아리와 마른 나무, 덮인 의식용 칼의 세부를 보여 준다. 유혈 장면은 추가하지 않는다.','헬레네가 제물의 정체를 명시하지 않은 명령을 걱정한다.','헬레네가 신들의 뜻에 맡기겠다고 말한다. 신의 형체는 추가하지 않는다.','헬레네가 제사가 중단된 일을 예로 든다. 실제 도살을 그리지 않는다.','시녀들이 헬레네를 격려한다.','시녀들이 트로이에서 겪은 일을 말한다. 현재의 얼굴과 반응만 그린다.','시녀 합창단이 낮의 햇빛 아래 헬레네를 바라본다.','헬레네가 궁전으로 올라갈 결심을 한다.','헬레네가 돌계단에 발을 올리며 머뭇거리고 시녀들이 따른다.']
for i,b in enumerate(['sea-sparta-threshold','helena-palace-orders']):
 chosen=parts[i*16:(i+1)*16];assert len(chosen)==16
 refs=['character-iii-helena','group-iii-helena-chorus','place-iii-sparta-palace']+(['character-ii-galatea','group-ii-dorids','group-ii-sirens'] if i==0 else [])
 inputs=['art-bible/character-iii-helena.png','art-bible/group-iii-helena-chorus.png','art-bible/place-iii-sparta-palace.png']+(['part-ii/source_images/shell-throne-radiance-grid-001.png'] if i==0 else ['part-ii/source_images/sea-sparta-threshold-grid-001.png'])
 plan=dict(batch_id=b,grid=[4,4],source_image='source_images/'+b+'-grid-001.png',references=refs,generation_reference_images=inputs,scenes=[dict(section=f,scene_id=x['id'],description=txt) for (f,x),txt in zip(chosen,descs[i*16:(i+1)*16])])
 (r/('plan-'+b+'.json')).write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Registered3references; planned32panels')
