import json
from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parent; art=root.parent/'art-bible'
specs=[('character-ii-proteus','프로테우스','PROTEUS','individual',['긴 짙은 청록 머리·오른쪽 은빛 가닥','짧고 뾰족한 어두운 수염','긴소매 바다색 로브·상아색 허리띠·구리 나선 고리','돌고래형: 청록 등·은회색 배·초록 눈·자연스러운 지느러미'], '탈레스와 호문쿨루스는 모습을 감추고 말하던 프로테우스를 빛으로 유인한다. 그는 바다에서 작은 생명으로 시작하라고 조언하고 돌고래로 변해 길을 안내한다. 인간형과 돌고래형은 별개 인물이 아니라 같은 존재의 변신이다. 얼굴·복식·눈가 무늬는 장면의 일관성을 위한 창작 시각화다.'),('group-ii-telchines','텔키네스','TELCHINEN','collective',['짧은 구릿빛 갈색 머리·네모난 짧은 갈색 수염','먹색 긴소매 튜닉·적갈색 가죽 앞치마','구리 팔보호구·세 갈래 청동 삼지창'], '바다의 장인들이 자신들이 벼린 넵투누스의 삼지창과 신의 형상을 만든 솜씨를 노래한다. 현재 장면은 달빛 아래의 행렬이다. 대장간 작업이나 넵투누스의 직접 등장을 추가하지 않는다. 대표 장인과 같은 계열의 복식으로 합창 무리를 표현했으며, 외모·도구의 세부는 창작 시각화다.')]
idx=art/'reference-index.json';data=json.loads(idx.read_text(encoding='utf-8'));page=art/'index.html';soup=BeautifulSoup(page.read_text(encoding='utf-8'),'html.parser')
for ident,name,source,scope,locks,intro in specs:
    assert (art/(ident+'.png')).is_file()
    entry=dict(id=ident,name=name,source_name=source,kind='character',image=ident+'.png',sheet_scope=scope,menu_group='heaven',visual_locks=locks,canonical_note=intro,part=2,act_numbers=[2],chapter_numbers=[],source_urls=['../part-ii/act-02-12.html'],status='draft_visual')
    data['entries']=[e for e in data['entries'] if e['id']!=ident]+[entry]
    old=soup.find(id=ident)
    if old:old.decompose()
    post=soup.new_tag('article',attrs={'class':'post','id':ident,'data-kind':'character','data-group':'heaven'})
    for tag,txt in [('h2',name),('p',source),('h3','기획의도'),('p',intro)]:
        n=soup.new_tag(tag);n.string=txt;post.append(n)
    fig=soup.new_tag('figure');a=soup.new_tag('a',href=entry['image']);a.append(soup.new_tag('img',src=entry['image'],alt=name+' 일관성 참조 시트',loading='lazy'));fig.append(a);post.append(fig)
    det=soup.new_tag('details');su=soup.new_tag('summary');su.string='시각적 단서와 원문 근거';det.append(su);p=soup.new_tag('p');p.string=' · '.join(locks);det.append(p);post.append(det);soup.select_one('.journal').append(post)
idx.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');page.write_text(str(soup),encoding='utf-8')
parts=[]
for filename in ['act-02-12','act-02-13']:
    soup=BeautifulSoup((root/(filename+'.html')).read_text(encoding='utf-8'),'html.parser')
    parts.extend((filename,p) for p in soup.select('section.panel-text') if not p.find('img'))
descs=['호문쿨루스가 밀폐된 병 안에서 빛을 높이고 탈레스가 보이지 않는 목소리에 응답한다.','탈레스가 프로테우스에게 인간 모습으로 나타나라고 청한다.','긴 청록 머리의 프로테우스가 모습을 드러내 병 속 존재를 살핀다.','탈레스가 호문쿨루스의 정신과 몸의 차이를 설명한다.','프로테우스가 닫힌 유리병 속 존재에게 말을 건넨다.','탈레스와 프로테우스가 병 속 생명의 성질을 이야기한다.','프로테우스가 바다를 가리키며 작은 생명부터 시작하라고 조언한다.','호문쿨루스가 병 안에서 바다의 공기와 향기를 느낀다.','프로테우스가 물가의 좁은 모래턱을 가리킨다.','프로테우스와 탈레스가 멀리 다가오는 행렬 쪽으로 향한다.','세 존재가 이동하는 가운데 삼지창을 든 텔키네스의 합창이 시작된다.','텔키네스가 달빛 아래 삼지창을 들고 노래한다. 실제 폭풍이나 넵투누스를 추가하지 않는다.','장인 행렬의 삼지창을 향해 세이렌들이 노래로 인사한다.','텔키네스가 달을 향해 인사하며 노래한다.','텔키네스가 로도스와 태양을 노래한다. 현재 장면은 밤이다.','텔키네스가 밝은 태양을 노래하지만 달빛 바위 만의 현재 장면을 유지한다.','텔키네스가 신상을 만들었던 솜씨를 자랑한다. 현재에 거대 신상을 추가하지 않는다.','프로테우스가 장인들의 자부심을 두고 탈레스와 이야기한다.','프로테우스가 청동 신상의 덧없음을 설명한다. 주조 작업 장면으로 바꾸지 않는다.','프로테우스가 바다 쪽으로 몸을 돌려 호문쿨루스를 안내한다.','프로테우스가 돌고래 모습으로 변한다. 인간형을 동시에 별개 인물로 그리지 않는다.','돌고래형 프로테우스가 병 속 존재를 등에 태우겠다고 제안하고 탈레스가 권한다.','탈레스가 밀폐된 병 속 호문쿨루스에게 새로운 시작을 권한다.','돌고래형 프로테우스와 닫힌 병이 수면 가까이 이동한다.','돌고래형 프로테우스가 병 속 호문쿨루스에게 바다의 삶을 설명한다.','탈레스가 물가에서 마지막 말에 응답한다.','돌고래형 프로테우스가 물가의 탈레스에게 답한다.','세이렌들이 달 둘레를 둥글게 나는 흰 비둘기 무리를 본다.','달빛 속 비둘기들의 무리가 바다 축제 위를 난다.','네레우스가 달 둘레의 흰 새들을 바라보며 말을 꺼낸다.','네레우스가 딸의 행렬에 앞서는 비둘기들을 설명한다. 딸의 모습은 아직 그리지 않는다.','탈레스가 물가에서 비둘기 행렬을 바라보며 응답한다.']
refs=['character-ii-thales','character-ii-homunculus','character-ii-proteus','group-ii-telchines','group-ii-sirens','character-ii-nereus','place-ii-aegean-coves']
for i,batch in enumerate(['proteus-telchines','dolphin-moon-procession']):
    chosen=parts[i*16:(i+1)*16];assert len(chosen)==16
    plan=dict(batch_id=batch,grid=[4,4],source_image='source_images/'+batch+'-grid-001.png',references=refs,scenes=[dict(section=f,scene_id=p['id'],description=d) for (f,p),d in zip(chosen,descs[i*16:(i+1)*16])])
    (root/('plan-'+batch+'.json')).write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Registered two references; planned32scenes')
