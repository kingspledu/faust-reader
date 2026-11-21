import json
from pathlib import Path
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'art-bible'; f=p/'reference-index.json'
d=json.loads(f.read_text(encoding='utf-8'))
entry=dict(id='character-ii-homunculus',kind='character',name='호문쿨루스',source_name='HOMUNCULUS',part=2,act_numbers=[2],chapter_numbers=[],image='character-ii-homunculus.png',status='draft_visual',sheet_scope='individual',sheet_template='character-faust.png',menu_group='heaven',visual_locks=['밀폐된 투명 유리병 속 작은 인간 형상','은발과 아이보리 튜닉은 시각화 설정','백금빛 발광과 금빛 눈','병 밖에 독립적으로 서 있는 인간으로 그리지 않음'],canonical_note='바그너가 만든 존재. 유리 용기 안에서 말하며 잠든 파우스트의 꿈을 읽는다. 외형·복식·장식은 창작 시각화.',source_urls=['../part-ii/act-02-03.html'])
d['entries']=[e for e in d['entries'] if e['id']!=entry['id']]+[entry]
f.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
h=BeautifulSoup((p/'index.html').read_text(encoding='utf-8'),'html.parser')
old=h.find(id=entry['id'])
if old:old.decompose()
markup='''<article class="post" id="character-ii-homunculus" data-group="heaven" data-kind="character"><h2>호문쿨루스</h2><p class="de">HOMUNCULUS</p><figure><a href="character-ii-homunculus.png"><img src="character-ii-homunculus.png" alt="호문쿨루스 캐릭터 시트" loading="lazy"></a></figure><div class="docent"><strong>기획 의도</strong><p>바그너는 실험실에서 사람을 만들겠다고 선언합니다. 병 속에서 태어난 작은 존재는 눈을 뜨자마자 세상을 보러 나가고 싶어 하지요. 그래서 몸의 크기보다 유리 안에서 번지는 빛과 적극적인 손짓에 눈이 가도록 구성했습니다. 병은 호문쿨루스를 지키는 공간인 동시에 아직 넘어설 수 없는 경계입니다.</p></div><details><summary>시각적 단서와 참고 자료</summary><p>원문 근거: 밀폐 용기가 필요하고, 말하고 생각하며 파우스트의 꿈을 읽는다. 은발·튜닉·병목 장식은 제작상 외형 선택이다.</p><a href="../part-ii/act-02-03.html">2-3막 원문</a></details></article>'''
h.select_one('.journal').append(BeautifulSoup(markup,'html.parser'))
(p/'index.html').write_text(str(h),encoding='utf-8')
print('Registered',entry['id'])
