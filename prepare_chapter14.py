from pathlib import Path
from bs4 import BeautifulSoup
import json
r=Path(__file__).parent;s=BeautifulSoup((r/'chapter-14.html').read_text(encoding='utf-8'),'html.parser');source=''.join(x.get_text() for x in s.select('article pre[lang="de"]'))
raw=[('', '''파우스트와 메피스토펠레스.

파우스트
어떻게 됐나? 잘되어 가나? 곧 만날 수 있나?

메피스토펠레스
훌륭하군요! 아주 열이 올랐네요?
머지않아 그레트헨을 얻으실 겁니다.
오늘 저녁 이웃 마르테의 집에서 만나게 될 겁니다.
그 여자는 중매와 수작을 꾸미는 데 아주 알맞은 사람이더군요!

파우스트
잘됐네!

메피스토펠레스
다만 우리에게 부탁하는 일도 있습니다.

파우스트
도움을 받았으면 도와줘야지.'''),
('MEPHISTOPHELES.\nWir legen nur', '''메피스토펠레스
마르테의 남편이 파도바의 거룩한 땅에 묻혀 있다고 유효한 증언만 해 주면 됩니다.

파우스트
참 똑똑하군! 그러려면 먼저 그곳으로 가 봐야겠지!

메피스토펠레스
이런 순진함이라니! 그럴 필요 없습니다.
잘 몰라도 그냥 증언하면 됩니다.

파우스트
더 나은 방법이 없다면 그 계획은 끝이야.

메피스토펠레스
아, 거룩한 분이시여! 이제 와서 그러십니까!'''),
('Ist es das erstemal', '''살면서 거짓 증언을 한 적이 처음입니까?
하느님과 세상, 그 안에서 움직이는 것들, 인간의 머리와 마음속 일들에 대해
뻔뻔하고 대담하게 확신에 차서 정의하지 않았습니까?
정말 속까지 살펴보면, 인정하셔야지요.
그 일들에 대해서도 슈베르트라인 씨의 죽음만큼밖에 모르셨잖습니까!

파우스트
너는 언제나 거짓말쟁이이고 말로 속이는 궤변가야.

메피스토펠레스
조금 더 깊이 생각하면 다르지요.
내일은 그 순진한 그레트헨을 유혹하면서 온 마음으로 사랑한다고 맹세하지 않으시겠습니까?'''),
('FAUST.\nUnd zwar von Herzen.', '''파우스트
정말 진심으로 말할 걸세.

메피스토펠레스
좋습니다! 그러면 영원한 성실과 사랑, 무엇보다 강한 단 하나의 마음이라고 말하겠지요.
그것도 진심이겠습니까?

파우스트
그만해! 진심이야! 내가 느끼는 이 복잡한 감정에 이름을 붙이려 해도 찾지 못하고,
온 세상을 온몸으로 헤매며 가장 높은 말을 모두 끌어와,
나를 태우는 이 뜨거움을 무한하고 영원하다고 부른다면,
그게 악마 같은 거짓말 놀음인가?

메피스토펠레스
그러니 제 말이 맞잖습니까!'''),
('FAUST.\nHör! merk dir dies', '''파우스트
들어! 이것만 알아 둬. 부탁이니 내 목을 좀 쉬게 해 주게.
자기가 옳다고 끝까지 우기는 사람은 혀 하나만 있어도 결국 옳다는 소리를 듣는 법이지.
자, 가세. 더 떠드는 것은 지긋지긋해.
네 말이 맞아. 특히 내가 그렇게 해야 하니까 맞는 거겠지.''')]
starts=[0]+[source.index(x) for x,k in raw[1:]]+[len(source)]
units=[dict(id=f'C14-T{i:03}',source_start=b,source_end=e,source=source[b:e],ko=row[1].strip()) for i,(row,b,e) in enumerate(zip(raw,starts,starts[1:]),1)]
p=r/'translations/chapter-14.ko.json';assert not p.exists();p.write_text(json.dumps(dict(chapter=14,status='complete_draft_translation',source_total_chars=len(source),covered_end=len(source),segments=units,notes=['13장 사망증명 계획과 연결. 파우스트는 아직 사망 사실을 확인하지 못함.','원문 민족명에 기대어 속임수를 비하하는 표현은 뜻을 옮기되 민족의 실제 특성으로 일반화하지 않음.','마지막 동의는 논쟁에 설득된 것과 구분.']),ensure_ascii=False,indent=2),encoding='utf-8')
blocks=s.select('article pre[lang="de"]');anchor=blocks[0]
for u in units:
 d=s.new_tag('details',attrs={'class':'source-fold','data-translation':u['id']});z=s.new_tag('summary');z.string='독일어 원문 · 한국어 번역 펼치기';d.append(z);z=s.new_tag('pre',lang='de');z.string=u['source'];d.append(z);z=s.new_tag('div',attrs={'class':'ko-translation','lang':'ko'});z.string=u['ko'];d.append(z);anchor.insert_before(d)
for b in blocks:b.decompose()
for b in s.select('article>.translation-note'):b.decompose()
(r/'chapter-14.html').write_text(str(s),encoding='utf-8')
text=(r/'render_chapter13.py').read_text(encoding='utf-8').replace('chapter-13','chapter-14').replace('chapter13','chapter14').replace("e['chapter']==13","e['chapter']==14").replace("e.get('chapter')!=13","e.get('chapter')!=14").replace('==9','==5').replace('==31','==10').replace('/31','/10').replace('Chapters 1-13','Chapters 1-14').replace('Chapters 1-12 complete; chapter14','Chapters 1-13 complete; chapter14').replace('Chapter13','Chapter14').replace('9 bilingual','5 bilingual').replace("['character-008','character-053','character-054','location-010']","['character-010','character-008','location-007']")
(r/'render_chapter14.py').write_text(text,encoding='utf-8')
text=(r/'save_chapter10_grid.py').read_text(encoding='utf-8').replace('chapter10','chapter14').replace('c10-','c14-').replace("e['chapter']==10","e['chapter']==14").replace('==12','==10').replace('i<12','i<10').replace('i-11','i-9').replace('12 scenes and 4','10 scenes and 6');(r/'save_chapter14_grid.py').write_text(text,encoding='utf-8')
print(f'Chapter14 translation {len(source)} chars,5 units prepared')
