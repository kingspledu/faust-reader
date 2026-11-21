import json
from pathlib import Path
from bs4 import BeautifulSoup

root=Path(__file__).resolve().parents[1]/'art-bible'
specs=[
('group-ii-sirens','세이렌','SIRENEN','character','collective','성인 여성 얼굴·짙은 청록 곱슬머리·청록 날개·상아색 드레이프·매의 발톱','강가의 나뭇가지에서 노래가 들려온다. 세이렌은 즐거운 밤을 함께하자고 초대하지만 스핑크스는 가지에 숨은 발톱을 조심하라고 경고한다. 아름다운 얼굴과 새의 몸을 함께 그려 초대와 경계가 부딪치는 장면을 보여 준다. 원문의 발톱과 나뭇가지 묘사를 바탕으로 삼았으며 색상과 의상은 창작 시각화다.'),
('character-ii-sphinx','스핑크스','SPHINX / SPHINXE','character','individual','어두운 곱슬머리의 성인 여성 얼굴·황갈색 사자 몸·청동빛 날개·상아색 가슴 드레이프','페네이오스 상류에서 메피스토에게 이름을 묻는 존재다. 말로 상대를 시험하는 장면에 맞춰 차분하고 또렷한 눈빛으로 그렸다. 인간의 얼굴과 사자의 몸, 날개가 결합된 고대의 낯선 모습을 유지하며 얼굴과 색상은 창작 시각화다.'),
('character-ii-griffin','그리핀','GREIF / GREIFE','character','individual','상아빛 독수리 머리·황갈색 사자 몸·금갈색 날개·독수리 앞발','메피스토의 인사를 듣자 이름부터 바로잡는다. 그리핀은 단어의 소리를 따지다가 움켜쥐는 자의 행운을 말한다. 독수리 부리와 날개, 사자의 몸을 결합하고 눈과 부리의 움직임으로 자존심과 불쾌함을 보여 준다. 세부 색상은 창작 시각화다.'),
('group-ii-gold-ants','금을 모으는 개미','AMEISEN','character','collective','적갈색 외골격·여섯 다리·더듬이·바위틈에 모은 금알갱이','작은 개미들이 끼어드는 까닭은 대화에서 금 이야기가 나왔기 때문이다. 개미들은 바위와 동굴에 모아 둔 금을 빼앗겼다고 호소한다. 이름 붙인 새 인물을 만들지 않고 같은 형태의 개미들이 함께 움직이도록 정했다. 크기와 색상은 연출을 위한 시각화다.'),
('group-ii-arimaspians','아리마스포이족','ARIMASPEN','character','collective','외눈·짙은 곱슬머리·회녹색 고대 튜닉·갈색 망토·금주머니','개미들이 도둑을 지목하자 아리마스포이족은 축제의 밤을 방해하지 말라며 받아친다. 금주머니를 손에 쥔 태도에서 개미들의 다급함과 이들의 느긋함이 대비된다. 외눈은 신화적 도상을 참고한 시각화이며 실제 민족의 복식이나 외모를 재현한 것이 아니다. 집단의 대표 형태로 통일한다.')
]
index=root/'reference-index.json'
data=json.loads(index.read_text(encoding='utf-8'))
html=root/'index.html'
soup=BeautifulSoup(html.read_text(encoding='utf-8'),'html.parser')
for ident,name,source,kind,scope,locks,intro in specs:
    filename=ident+'.png'
    assert (root/filename).is_file(), filename
    item=dict(id=ident,kind=kind,name=name,source_name=source,image=filename,sheet_scope=scope,menu_group='heaven',visual_locks=locks.split('·'),canonical_note=intro,part=2,act_numbers=[2],chapter_numbers=[],source_urls=['../part-ii/act-02-05.html'],status='draft_visual')
    data['entries']=[e for e in data['entries'] if e['id']!=ident]+[item]
    old=soup.find(id=ident)
    if old: old.decompose()
    article=soup.new_tag('article',attrs={'class':'post','id':ident,'data-kind':kind,'data-group':'heaven'})
    for tag,txt in [('h2',name),('p',source),('h3','기획의도'),('p',intro)]:
        node=soup.new_tag(tag);node.string=txt;article.append(node)
    figure=soup.new_tag('figure');link=soup.new_tag('a',href=filename)
    link.append(soup.new_tag('img',src=filename,alt=name+' 일관성 참조 시트',loading='lazy'));figure.append(link);article.append(figure)
    details=soup.new_tag('details');summary=soup.new_tag('summary');summary.string='시각적 단서와 원문 근거';details.append(summary)
    p=soup.new_tag('p');p.string=locks;details.append(p)
    a=soup.new_tag('a',href='../part-ii/act-02-05.html');a.string='2-5막 원문';details.append(a);article.append(details)
    soup.select_one('.journal').append(article)
index.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
html.write_text(str(soup),encoding='utf-8')
print(f'Registered {len(specs)} reference sheets')
