from pathlib import Path
from bs4 import BeautifulSoup
import json,re
r=Path(__file__).parent;p=r/'chapter-16.html';s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser');de=''.join(x.get_text() for x in s.select('article pre[lang="de"]'))
raw=[('', '''마르가레테가 뛰어 들어와 문 뒤에 숨고, 손가락 끝을 입술에 댄 채 문틈으로 내다본다.

마르가레테
그가 와요!

파우스트(들어오며)
아, 장난꾸러기! 그렇게 날 놀리는구나!
잡히기만 해 봐!
(그녀에게 입을 맞춘다.)

마르가레테(그를 붙잡고 입맞춤을 돌려주며)
정말 소중한 사람! 진심으로 당신을 사랑해요!
(메피스토펠레스가 문을 두드린다.)

파우스트(발을 구르며)
누구냐?

메피스토펠레스
좋은 친구지요!'''),
('FAUST.\nEin Tier!', '''파우스트
짐승 같은 놈!

메피스토펠레스
이제 헤어질 시간이 된 것 같군요.

마르테(들어오며)
네, 선생님. 늦었어요.

파우스트
제가 바래다드려도 될까요?

마르가레테
어머니가 저를—안녕히 가세요!

파우스트
정말 가야 하나? 안녕!'''),
('MARTHE.\nAde!', '''마르테
잘 가세요!

마르가레테
곧 다시 만나요!
(파우스트와 메피스토펠레스가 퇴장한다.)

마르가레테
아, 하느님! 저런 분은 얼마나 많은 생각을 할 수 있는지!
저는 그 앞에 서면 부끄러워서, 무슨 말이든 그렇다고만 해요.
저는 아는 것도 없는 어린아이일 뿐인데,
그분이 제 어디를 좋게 보시는지 모르겠어요.
(퇴장한다.)''')]
starts=[0]+[de.index(a) for a,k in raw[1:]]+[len(de)]
units=[dict(id=f'C16-T{i:03}',source_start=b,source_end=e,source=de[b:e],ko=row[1].strip()) for i,(row,b,e) in enumerate(zip(raw,starts,starts[1:]),1)]
t=r/'translations/chapter-16.ko.json';assert not t.exists()
t.write_text(json.dumps(dict(chapter=16,status='complete_draft_translation',source_total_chars=len(de),covered_end=len(de),segments=units,notes=['그레트헨의 어머니 언급은 중간에 끊긴 문장. 실제로 들킨 사건이나 벌을 추가하지 않음.','그레트헨은 마지막에 파우스트의 관심을 의아해하며 자기 지식을 낮게 평가함. 서술자가 그 평가를 사실로 단정하지 않음.','입맞춤과 그레트헨의 응답은 원문 무대지시대로 유지.']),ensure_ascii=False,indent=2),encoding='utf-8')
blocks=s.select('article pre[lang="de"]');anchor=blocks[0]
for u in units:
 d=s.new_tag('details',attrs={'class':'source-fold','data-translation':u['id']});z=s.new_tag('summary');z.string='독일어 원문 · 한국어 번역 펼치기';d.append(z);z=s.new_tag('pre',lang='de');z.string=u['source'];d.append(z);z=s.new_tag('div',attrs={'class':'ko-translation','lang':'ko'});z.string=u['ko'];d.append(z);anchor.insert_before(d)
for b in blocks:b.decompose()
for b in s.select('article>.translation-note'):b.decompose()
s.select_one('header a[href="scene-plan.html"]').string='삽화 장면 구성';p.write_text(str(s),encoding='utf-8')
rows=[
('그레트헨','''그레트헨은 정원의 작은 집으로 뛰어 들어갔다. 문 뒤에 숨어 손가락을 입술에 댄 채 문틈으로 밖을 살폈다.
“온다!”
뒤따라온 파우스트는 그레트헨을 찾아내고 웃었다.
“나 놀리려고 숨은 거야? 이제 찾았다.”''','들어오면 바로 보이려나? 조금만 더 숨어 있어야지.'),
('파우스트','''파우스트가 그레트헨에게 입을 맞췄다. 그레트헨도 그를 붙잡고 입맞춤을 돌려주었다.
“진심으로 사랑해요.”
그때 누군가 문을 두드렸다. 파우스트는 방해받은 게 못마땅해 발을 한 번 구르며 물었다.
“누구야?”
밖에서 메피스토펠레스가 대답했다. “친구죠!”''','하필 지금 와? 조금만 더 있다가 오면 안 되나.'),
('파우스트','''“진짜 눈치도 없네.”
파우스트가 쏘아붙였지만 메피스토펠레스는 이제 헤어질 시간이라고 말했다. 마르테도 다가와 늦었다고 거들었다.
파우스트는 그레트헨과 조금이라도 더 함께 있고 싶었다.
“집까지 바래다줄까?”''','같이 걸어가면 조금은 더 얘기할 수 있잖아.'),
('그레트헨','''그레트헨은 어머니를 떠올렸다. 파우스트와 함께 집에 가는 건 곤란했다.
“어머니가 저를 보면…… 아니에요. 안녕히 가세요.”
파우스트는 정말 가야 하느냐고 아쉬워하다가 작별 인사를 했다.''','같이 가고 싶지만 그럴 수는 없어. 어머니 생각도 해야지.'),
('그레트헨','''마르테도 잘 가라는 인사를 건넸다. 그레트헨은 파우스트에게 다시 말했다.
“곧 또 만나요.”
파우스트와 메피스토펠레스가 떠났다. 두 사람이 가고 나자 그레트헨은 파우스트와 나눴던 이야기를 떠올렸다.''','오늘 얘기를 얼마나 많이 했지. 집에 가서도 계속 생각날 것 같아.'),
('그레트헨','''파우스트는 아는 것도 많고 생각도 깊어 보였다. 그레트헨은 그와 이야기할 때마다 자신이 모르는 게 많다는 생각에 부끄러웠다.
“나는 옆에서 그렇다고만 했네. 저 사람은 내 어떤 점이 좋을까?”
자기를 좋아한다고 말해 준 건 기뻤지만, 왜 그런지는 여전히 잘 알 수 없었다. 그레트헨도 그곳을 떠났다.''','아는 것도 별로 없고 말도 잘 못하는데. 그래도 내 얘기 들을 때는 정말 좋아 보였어.')]
a=dict(title='문 뒤의 웃음과 짧은 작별',persona='K-FAUST_META_PERSONA_v1.0.md',audience='중학생',viewpoint='third-person omniscient',status='draft_pending_visual_review',prose_revision='modern-dialogue-2026-11-18',scenes=[dict(id=f'c16-dense-{i:03}',speaker=sp,narration=n,monologue=m) for i,(sp,n,m) in enumerate(rows,1)])
(r/'adaptations/chapter-16.json').write_text(json.dumps(a,ensure_ascii=False,indent=2),encoding='utf-8')
text=(r/'render_chapter15.py').read_text(encoding='utf-8').replace('chapter-15','chapter-16').replace('chapter15','chapter16').replace('Chapter15','Chapter16').replace("e['chapter']==15","e['chapter']==16").replace("e.get('chapter')!=15","e.get('chapter')!=16").replace('==13','==3').replace('==24','==6').replace('/24','/6').replace('all 13 bilingual','all 3 bilingual').replace('Chapters 1-15 illustrated','Chapters 1-16 illustrated').replace('Chapters 1-14 complete','Chapters 1-15 complete').replace("'location-011'","'location-012'")
text=re.sub("review_note='[^']*'","review_note='정원의 작은 집. 그레트헨의 장난과 상호 입맞춤, 메피스토펠레스의 노크, 작별과 혼자 남은 생각. 어머니의 현장 등장·발각·처벌은 없음. 공간 배치는 연출용.'",text)
(r/'render_chapter16.py').write_text(text,encoding='utf-8')
text=(r/'verify_chapter15.py').read_text(encoding='utf-8').replace('chapter-15','chapter-16').replace('chapter15','chapter16').replace('C15','C16').replace("e['chapter']==15","e['chapter']==16").replace('chapter=15','chapter=16').replace('bilingual_units=13','bilingual_units=3').replace('==13','==3').replace('(0,16,24)','(0,6)').replace('==24','==6').replace('n==24','n==6').replace('positions[14]+1:positions[15]','positions[15]+1:positions[16]')
(r/'verify_chapter16.py').write_text(text,encoding='utf-8')
print(f'Chapter16: {len(de)} source characters,3 translations,6 adaptation scenes')
