from pathlib import Path
from bs4 import BeautifulSoup
import json
r=Path(__file__).parent;s=BeautifulSoup((r/'chapter-12.html').read_text(encoding='utf-8'),'html.parser');source=''.join(x.get_text() for x in s.select('article pre[lang="de"]'))
raw=[('', '''파우스트가 생각에 잠겨 이리저리 걷는다. 메피스토펠레스가 그에게 다가온다.

메피스토펠레스
거절당한 모든 사랑에 걸고! 지옥의 원소에 걸고!
더 지독하게 저주할 말을 안다면 좋겠군!

파우스트
무슨 일인가? 무엇이 자네를 그렇게 괴롭히나?
그런 얼굴은 평생 처음 보는군!

메피스토펠레스
내가 악마만 아니라면 당장 악마에게 나를 넘겨 버리고 싶습니다!

파우스트
머리가 어떻게 된 건가?
미친 사람처럼 날뛰니 참 자네답군!'''),
('MEPHISTOPHELES.\nDenkt nur', '''메피스토펠레스
생각해 보십시오. 그레트헨을 위해 마련한 보석을 신부가 가져가 버렸습니다!
어머니는 그것을 보자 곧 두려운 생각이 들었지요.
그 여자는 냄새를 잘 맡습니다. 늘 기도서를 들여다보며 물건마다 거룩한지 세속적인지 냄새로 알아내지요.
그 보석에는 축복이 별로 없다는 것도 분명히 느낀 겁니다.
“얘야”, 하고 외쳤답니다. “부정한 재물은 영혼을 붙들고 피를 말린단다.
성모님께 바치자꾸나. 그러면 하늘의 양식으로 우리를 기쁘게 해 주실 거야!”
그레트헨은 못마땅한 표정을 지었습니다.
그녀는 선물 받은 말인데 무엇이 문제냐고 생각했지요.
이렇게 좋은 것을 가져다준 사람이 정말 불경한 사람은 아닐 거라고요.
어머니가 신부를 불렀습니다.
신부는 사정을 듣자 보석을 흐뭇하게 바라보더군요.
그는 말했습니다. “참으로 바른 마음입니다! 욕심을 이기는 사람이 승리하지요.
교회는 위장이 튼튼해서 나라들을 통째로 삼키고도 배탈이 난 적이 없습니다.
사랑하는 여인들이여, 부정한 재물을 소화할 수 있는 것은 오직 교회뿐입니다.”'''),
('FAUST.\nDas ist ein allgemeiner', '''파우스트
흔히들 하는 일이지. 유대인도 왕도 할 수 있네.

메피스토펠레스
그러고는 브로치와 목걸이, 반지를 버섯이라도 되는 듯 쓸어 담았지요.
감사 인사도 호두 한 바구니를 받은 정도였고요.
그들 모두에게 하늘의 보상을 약속하자 두 사람은 크게 감동했답니다.

파우스트
그레트헨은?'''),
('MEPHISTOPHELES.\nSitzt nun unruhvoll', '''메피스토펠레스
지금은 불안하게 앉아서 자기가 무엇을 바라며 어떻게 해야 할지도 모르지요.
밤낮 보석을 생각하고, 그것을 가져온 사람은 더 많이 생각합니다.

파우스트
그녀가 괴롭다니 마음이 아프군.
곧바로 새 보석을 마련해 주게!
첫 번째 것은 그리 대단한 것도 아니었잖나.

메피스토펠레스
아, 물론이지요. 나리께는 모든 것이 아이들 장난이지요!'''),
('FAUST.\nUnd mach, und richt', '''파우스트
어서 내 뜻대로 일을 꾸미게. 그 이웃 여인에게 접근해!
악마면서 그렇게 물러터지게 굴지 말고 새 보석을 가져오게!

메피스토펠레스
예, 높으신 나리. 진심으로 기꺼이 하겠습니다.
(파우스트 퇴장.)

이렇게 사랑에 빠진 바보는 연인을 잠깐 즐겁게 하려고 해와 달과 모든 별도 공중에 터뜨려 버리겠군.
(퇴장.)''')]
starts=[0]+[source.index(x) for x,k in raw[1:]]+[len(source)];assert starts==sorted(starts)
units=[dict(id=f'C12-T{i:03}',source_start=b,source_end=e,source=source[b:e],ko=row[1].strip()) for i,(row,b,e) in enumerate(zip(raw,starts,starts[1:]),1)]
p=r/'translations/chapter-12.ko.json';assert not p.exists();p.write_text(json.dumps(dict(chapter=12,status='complete_draft_translation',source_total_chars=len(source),covered_end=len(source),segments=units,notes=['어머니·신부·그레트헨의 일은 메피스토펠레스의 보고로 구분.','원문의 유대인 언급은 시대적 편견을 포함한 파우스트 발언으로 보존. 각색은 집단에 대한 사실로 일반화하지 않음.','신부의 탐욕과 교회 풍자는 인물 발언이며 신자 전체의 성격으로 확정하지 않음.']),ensure_ascii=False,indent=2),encoding='utf-8')
blocks=s.select('article pre[lang="de"]');anchor=blocks[0]
for u in units:
 d=s.new_tag('details',attrs={'class':'source-fold','data-translation':u['id']});z=s.new_tag('summary');z.string='독일어 원문 · 한국어 번역 펼치기';d.append(z);z=s.new_tag('pre',lang='de');z.string=u['source'];d.append(z);z=s.new_tag('div',attrs={'class':'ko-translation','lang':'ko'});z.string=u['ko'];d.append(z);anchor.insert_before(d)
for b in blocks:b.decompose()
for b in s.select('article > .translation-note'):b.decompose()
(r/'chapter-12.html').write_text(str(s),encoding='utf-8')
for src,dest in [('render_chapter11.py','render_chapter12.py'),('verify_chapter11.py','verify_chapter12.py')]:
 text=(r/src).read_text(encoding='utf-8').replace('chapter-11','chapter-12').replace('chapter11','chapter12').replace("e['chapter']==11","e['chapter']==12").replace("e.get('chapter')!=11","e.get('chapter')!=12").replace('positions[10]+1:positions[11]','positions[11]+1:positions[12]').replace('==7','==5').replace('==21','==9').replace('n==21','n==9').replace('n<21','n<9').replace('(0,16,21)','(0,9)').replace('/21','/9').replace('==42','==18').replace('C11','C12').replace('chapter=11','chapter=12').replace('planned=21','planned=9').replace('closed_bilingual_units=7','closed_bilingual_units=5').replace('Chapters 1-11','Chapters 1-12').replace('Chapters 1-10 complete; chapter12','Chapters 1-11 complete; chapter12').replace('Chapter11','Chapter12').replace('7 bilingual','5 bilingual').replace("['character-010','character-008','character-053','location-008']","['character-010','character-008','location-009']")
 (r/dest).write_text(text,encoding='utf-8')
text=(r/'save_chapter10_grid.py').read_text(encoding='utf-8').replace('chapter10','chapter12').replace('c10-','c12-').replace("e['chapter']==10","e['chapter']==12").replace('==12','==9').replace('i<12','i<9').replace('i-11','i-8').replace('12 scenes and 4','9 scenes and 7');(r/'save_chapter12_grid.py').write_text(text,encoding='utf-8')
print(f'Chapter12 full translation {len(source)} chars,5 units;tools prepared')
