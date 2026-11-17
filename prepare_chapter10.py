from pathlib import Path
from bs4 import BeautifulSoup
import json
r=Path(__file__).parent;s=BeautifulSoup((r/'chapter-10.html').read_text(encoding='utf-8'),'html.parser');source=''.join(x.get_text() for x in s.select('article pre[lang="de"]'))
raw=[('', '''파우스트. 마르가레테가 지나간다.

파우스트
아름다운 아가씨, 실례가 안 된다면 제 팔을 잡고 함께 가시겠습니까?

마르가레테
저는 귀한 집 아가씨도 아니고 아름답지도 않아요.
혼자 집에 갈 수 있어요.
(몸을 빼고 떠난다.)

파우스트
하늘에 맹세코, 저 소녀는 아름답구나!
저런 사람은 본 적이 없어.
저토록 얌전하고 착하면서도 조금은 새침하군.
붉은 입술과 환한 뺨을 평생 잊지 못하겠어!
눈을 내리깐 모습이 마음속에 깊이 남았네.
짧게 잘라 대답한 것까지 정말 사랑스럽구나!
(메피스토펠레스가 등장한다.)'''),
('FAUST.\nHör, du mußt', '''파우스트
이봐, 저 여자를 내게 데려와야겠네!

메피스토펠레스
누구 말입니까?

파우스트
방금 지나간 여자일세.

메피스토펠레스
저 소녀요? 자기 신부님에게 다녀오는 길입니다.
신부가 죄를 모두 용서해 주었지요.
제가 고해석 바로 곁으로 슬쩍 지나갔는데,
아주 순진해서 아무 일도 없는데 고해하러 갔더군요.
저 아이에게는 제 힘이 미치지 않습니다!

파우스트
그래도 열네 살은 넘었겠지.

메피스토펠레스
모든 예쁜 꽃을 자기 것으로 갖고 싶어 하는 방탕한 사내처럼 말하는군요.
얻지 못할 명예도 호의도 없다고 생각하는 사람 말입니다.
하지만 늘 뜻대로 되는 것은 아닙니다.'''),
('FAUST.\nMein Herr Magister', '''파우스트
이 점잖은 훈장 선생 양반, 규칙 이야기로 나를 귀찮게 하지 말게!
짧고 분명하게 말하지.
오늘 밤 저 젊은 여인이 내 품에 안기지 않는다면,
우리는 자정에 헤어질 걸세.

메피스토펠레스
어떻게 해야 할지 생각해 보십시오!
기회를 알아보는 데만 적어도 열나흘은 필요합니다.

파우스트
일곱 시간만 여유가 있다면 저런 소녀를 유혹하는 데 악마까지 필요하지는 않겠네.'''),
('MEPHISTOPHELES.\nIhr sprecht schon', '''메피스토펠레스
거의 프랑스인처럼 말씀하시는군요.
그래도 부디 성급하게 굴지 마십시오.
곧바로 즐기기만 해서 무엇이 좋겠습니까?
온갖 번거로운 일을 거쳐, 남쪽 나라 이야기들에서 가르치듯 상대를 제 뜻대로 길들이고 준비시켰을 때의 즐거움이 훨씬 크지요.

파우스트
그런 것 없이도 마음은 충분하네.

메피스토펠레스
이제 빈정거림도 농담도 그만하지요.
그 아름다운 소녀에게는 절대로 서둘러서는 안 됩니다.
거칠게 밀어붙여서는 얻을 수 없으니 꾀를 써야 합니다.'''),
('FAUST.\nSchaff mir etwas', '''파우스트
저 천사 같은 여인의 물건이라도 가져다주게!
그녀가 쉬는 곳으로 데려가 주게!
가슴에 둘렀던 목수건이나 사랑하는 마음을 달랠 양말 대님이라도 가져오게!

메피스토펠레스
제가 그 괴로움을 덜어 드리려고 기꺼이 돕는다는 것을 보이겠습니다.
한순간도 지체하지 않고 오늘 안으로 그녀의 방에 모셔다 드리지요.

파우스트
그녀를 만나나? 내 곁에 둘 수 있나?

메피스토펠레스
아닙니다! 그녀는 이웃 여인의 집에 있을 겁니다.
그동안 혼자서 그녀의 흔적이 있는 방에 머물며 앞으로의 기쁨을 마음껏 기대하실 수 있지요.'''),
('FAUST.\nKönnen wir hin?', '''파우스트
갈 수 있나?

메피스토펠레스
아직 너무 이릅니다.

파우스트
그녀에게 줄 선물을 준비해 주게!
(퇴장.)

메피스토펠레스
벌써 선물이라? 훌륭하군! 잘되어 가겠어!
나는 좋은 장소도 알고 오래전에 묻힌 보물도 여럿 알지.
좀 살펴봐야겠군.
(퇴장.)''')]
starts=[0]+[source.index(anchor) for anchor,ko in raw[1:]]+[len(source)];assert starts==sorted(starts)
units=[dict(id=f'C10-T{i:03}',source_start=b,source_end=e,source=source[b:e],ko=row[1].strip()) for i,(row,b,e) in enumerate(zip(raw,starts,starts[1:]),1)]
p=r/'translations/chapter-10.ko.json';assert not p.exists();p.write_text(json.dumps(dict(chapter=10,status='complete_draft_translation',source_total_chars=len(source),covered_end=len(source),segments=units,notes=['Fräulein의 신분 호칭 의미를 대응 번역에 반영.','열네 살 발언은 파우스트의 추측으로 보존하며 성년으로 바꾸지 않음.','목수건·양말 대님 요구는 원문 뜻을 비선정적으로 보존. 실제 획득 사건으로 그리지 않음.','상대를 꾀로 얻으려는 발언은 인물의 태도이며 서술자가 정당화하지 않음.']),ensure_ascii=False,indent=2),encoding='utf-8')
blocks=s.select('article pre[lang="de"]');anchor=blocks[0]
for u in units:
 d=s.new_tag('details',attrs={'class':'source-fold','data-translation':u['id']});z=s.new_tag('summary');z.string='독일어 원문 · 한국어 번역 펼치기';d.append(z);z=s.new_tag('pre',lang='de');z.string=u['source'];d.append(z);z=s.new_tag('div',attrs={'class':'ko-translation','lang':'ko'});z.string=u['ko'];d.append(z);anchor.insert_before(d)
for b in blocks:b.decompose()
for b in s.select('article > .translation-note'):b.decompose()
(r/'chapter-10.html').write_text(str(s),encoding='utf-8')
text=(r/'render_chapter09.py').read_text(encoding='utf-8').replace('chapter-09','chapter-10').replace('chapter09','chapter10').replace("e['chapter']==9","e['chapter']==10").replace("e.get('chapter')!=9","e.get('chapter')!=10").replace('==20','==6').replace('==46','==12').replace('/46','/12').replace('Chapters 1-9','Chapters 1-10').replace('Chapters 1-8 complete; chapter9','Chapters 1-9 complete; chapter10').replace('Chapter9','Chapter10').replace('20 bilingual','6 bilingual').replace("['character-010','character-008','character-050','character-123','character-052','location-006']","['character-010','character-008','character-053','location-007']").replace('복약 전 노학자 상태 유지. 부엌 동물은 원숭이. 거울의 여인은 이름 없는 환영. 실제 생성 그림과 원문 의미 대조.','회춘 이후 파우스트. 그레트헨의 거절을 호의로 서술하지 않음. 원문 속 계획을 실제 침입·선물 전달로 앞당기지 않음.')
(r/'render_chapter10.py').write_text(text,encoding='utf-8')
text=(r/'save_chapter09_final.py').read_text(encoding='utf-8').replace('chapter09','chapter10').replace('c09-','c10-').replace('dense-003','dense-001').replace("e['chapter']==9","e['chapter']==10").replace('[32:]','[:]').replace('==14','==12').replace('i<14','i<12').replace('i-13','i-11').replace('14 scenes and 2','12 scenes and 4')
(r/'save_chapter10_grid.py').write_text(text,encoding='utf-8');print(f'Chapter10 full bilingual draft: {len(source)} chars,6 units; tools prepared')
