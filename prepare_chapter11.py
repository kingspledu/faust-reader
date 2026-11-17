from pathlib import Path
from bs4 import BeautifulSoup
import json
r=Path(__file__).parent;s=BeautifulSoup((r/'chapter-11.html').read_text(encoding='utf-8'),'html.parser');source=''.join(x.get_text() for x in s.select('article pre[lang="de"]'))
raw=[('', '''작고 깨끗한 방.

마르가레테가 머리를 땋아 올리며
오늘 그분이 누구였는지 알 수만 있다면 좋겠어!
분명 멋있어 보였고 귀한 집안 출신일 거야.
얼굴만 보아도 알 수 있었지. 그렇지 않으면 그렇게 대담하게 굴지도 못했을 거야.
(퇴장.)

메피스토펠레스
들어오십시오. 아주 조용히, 들어오세요!

파우스트가 잠시 말없이 있다가
부탁이니 나를 혼자 있게 해 주게!

메피스토펠레스가 둘러보며
모든 소녀가 이렇게 깨끗하게 지내지는 않지요.
(퇴장.)'''),
('FAUST (rings aufschauend).', '''파우스트가 주위를 둘러보며
이 성소에 스며든 부드러운 저녁빛이여, 반갑구나!
희망의 이슬을 먹고 애타는 사랑의 괴로움이여, 내 마음을 사로잡아 다오!
주위에는 고요와 질서와 만족이 가득하구나!
이 가난 속에 얼마나 많은 것이 있고, 이 좁은 곳에 얼마나 큰 행복이 있는가!
(침대 곁 가죽 안락의자에 몸을 던진다.)
기쁠 때나 슬플 때나 옛사람들을 두 팔 벌려 맞았던 의자여, 나도 받아 다오!
이 조상들의 의자 둘레에 얼마나 자주 아이들이 모여들었을까!
어쩌면 내 사랑도 어린 시절, 성탄 선물에 감사하며 여기서 할아버지의 마른 손에 경건하게 입을 맞추었겠지.
소녀여, 충만함과 질서를 이루는 너의 마음이 둘레에서 속삭이는 듯하구나.
어머니처럼 너를 날마다 가르치며 탁자에 천을 깨끗이 펴고 발밑의 모래까지 가지런히 무늬 내게 하는 마음이여.
사랑스러운 손이여, 얼마나 신과 같은가!
너로 인해 이 오두막은 천국이 되는구나.
그리고 여기!
(침대의 커튼을 들어 올린다.)
기쁨과 두려움이 함께 밀려드는구나!
여기서 몇 시간이고 머무르고 싶어.
자연이여, 너는 여기서 가벼운 꿈을 통해 천사 같은 아이를 길러 냈구나!
여기 어린아이가 누워 있었지! 따뜻한 생명으로 여린 가슴이 채워지고,
거룩하고 순수하게 자라며 신 같은 모습이 완성되었구나!'''),
('Und du! Was hat dich', '''그리고 너는! 무엇 때문에 여기 왔느냐?
이토록 깊이 마음이 움직이다니!
여기서 무엇을 하려는가? 왜 마음이 무거워지는가?
초라한 파우스트여! 나조차 네가 낯설구나.
마법 같은 향기가 나를 둘러싸고 있나?
곧장 욕망을 채우려고 했는데 이제는 사랑의 꿈에 빠져드는구나!
우리는 공기가 조금만 달라져도 흔들리는 장난감인가?
지금 그녀가 들어온다면 네가 저지른 잘못의 대가를 어떻게 치르겠느냐!
잘난 척하던 사내가 얼마나 초라해질까!
그녀의 발밑에 맥없이 쓰러지겠지.'''),
('MEPHISTOPHELES (kommt).', '''메피스토펠레스가 돌아온다.
어서요! 그녀가 아래에서 오는 것이 보입니다.

파우스트
나가세! 나가세! 다시는 돌아오지 않겠네!

메피스토펠레스
제법 무거운 작은 상자가 여기 있습니다. 다른 곳에서 가져왔지요.
이것을 저 수납장에 넣어 두십시오.
맹세컨대 그녀는 정신을 빼앗길 겁니다.
다른 여자라도 마음을 얻을 만한 물건을 넣어 두었지요.
소녀는 소녀이고 장난감은 장난감 아니겠습니까.

파우스트
모르겠네. 그래도 되나?

메피스토펠레스
뭘 그렇게 묻습니까?
그 보물을 직접 간직하려는 건 아니겠지요?
그렇다면 그 욕심 때문에 이 좋은 시간과 제 수고를 더 낭비하지 마시라고 권하겠습니다.
설마 인색한 것은 아니겠지요!
저는 머리를 긁고 손을 비비며 애쓰는데—
(상자를 수납장에 넣고 자물쇠를 다시 잠근다.)
어서 나갑시다! 빨리요!
그 젊은 소녀를 당신 마음과 뜻대로 움직이려고 애쓰는데,
당신은 마치 강의실에 들어가 물리학과 형이상학을 눈앞에 보는 것 같은 표정이군요!
어서요!
(퇴장.)'''),
('MARGARETE (mit einer Lampe.)', '''마르가레테가 등불을 들고 들어온다.
방이 어쩐지 덥고 답답하네.
(창문을 연다.)
밖은 그리 따뜻하지도 않은데.
왜 이런 기분이 드는지 모르겠어. 어머니가 집에 오셨으면 좋겠는데.
온몸에 소름이 돋네. 나도 참 겁 많고 어리석지!
(옷을 벗어 정리하며 노래를 부르기 시작한다.)'''),
('Es war ein König in Thule', '''툴레에 왕이 살았네.
무덤까지 변함없이 사랑한 왕.
죽어 가던 연인이 그에게 금잔 하나를 주었지.

그 무엇보다 소중했던 잔,
잔치 때마다 그 잔을 비웠네.
그것으로 마실 때면 눈에는 눈물이 가득했지.

자신도 죽을 때가 오자
나라의 도시들을 헤아리고 상속인에게 모두 주었지만,
그 잔만은 함께 주지 않았네.

바닷가 성, 조상들의 높은 연회장에서
기사들이 둘러앉은 왕의 잔치가 열렸지.

늙은 왕은 그곳에서 일어나
마지막 삶의 열기를 마시고,
그 성스러운 잔을 바닷물 속으로 던졌네.

잔이 떨어져 물을 머금고
바다 깊이 가라앉는 것을 바라보았네.
왕의 눈도 감겼고, 다시는 한 방울도 마시지 않았지.'''),
('(Sie eröffnet den Schrein', '''옷을 넣으려고 수납장을 열다가 보석 상자를 발견한다.

이 아름다운 상자가 어떻게 여기에 있지?
분명히 수납장을 잠갔는데.
이상하네! 안에는 무엇이 있을까?
누군가 담보로 맡기고 어머니께 돈을 빌렸나 봐.
끈에 작은 열쇠가 달려 있네. 열어 봐도 되겠지!
이게 뭐지? 세상에! 이런 것은 평생 본 적이 없어!
보석이잖아! 귀한 부인이 가장 큰 축일에 차려입고 나갈 만한 것이네.
이 목걸이가 나에게는 어떻게 어울릴까?
이 멋진 물건은 누구 것일까?

(보석으로 치장하고 거울 앞으로 간다.)

이 귀걸이가 내 것이면 좋겠어!
모습이 정말 달라 보이네.
아름다움과 젊음이 무슨 소용이람?
그것도 좋기는 하지만 사람들은 대수롭지 않게 넘기지.
동정이라도 하듯 조금 칭찬해 줄 뿐이야.
모두가 금을 바라며 금에 매달리는구나.
아, 가난한 우리들이란!''')]
starts=[0]+[source.index(x) for x,k in raw[1:]]+[len(source)];assert starts==sorted(starts)
units=[dict(id=f'C11-T{i:03}',source_start=b,source_end=e,source=source[b:e],ko=row[1].strip()) for i,(row,b,e) in enumerate(zip(raw,starts,starts[1:]),1)]
p=r/'translations/chapter-11.ko.json';assert not p.exists();p.write_text(json.dumps(dict(chapter=11,status='complete_draft_translation',source_total_chars=len(source),covered_end=len(source),segments=units,notes=['의자 주변의 어린 시절은 파우스트의 어쩌면이라는 상상. 확정 회상으로 만들지 않음.','왕과 금잔은 그레트헨이 부르는 노래이며 방에서 일어나는 사건이 아님.','옷 정리 무대지시는 번역에 보존하되 삽화는 완전히 옷을 입은 상태만 표현.']),ensure_ascii=False,indent=2),encoding='utf-8')
blocks=s.select('article pre[lang="de"]');anchor=blocks[0]
for u in units:
 d=s.new_tag('details',attrs={'class':'source-fold','data-translation':u['id']});z=s.new_tag('summary');z.string='독일어 원문 · 한국어 번역 펼치기';d.append(z);z=s.new_tag('pre',lang='de');z.string=u['source'];d.append(z);z=s.new_tag('div',attrs={'class':'ko-translation','lang':'ko'});z.string=u['ko'];d.append(z);anchor.insert_before(d)
for b in blocks:b.decompose()
for b in s.select('article > .translation-note'):b.decompose()
(r/'chapter-11.html').write_text(str(s),encoding='utf-8')
for src,dest in [('render_chapter10.py','render_chapter11.py'),('verify_chapter10.py','verify_chapter11.py')]:
 text=(r/src).read_text(encoding='utf-8').replace('chapter-10','chapter-11').replace('chapter10','chapter11').replace("e['chapter']==10","e['chapter']==11").replace("e.get('chapter')!=10","e.get('chapter')!=11").replace('positions[9]+1:positions[10]','positions[10]+1:positions[11]').replace('==6','==7').replace('==12','==21').replace('n==12','n==21').replace('n<12','n<21').replace('(0,12)','(0,16,21)').replace('/12','/21').replace('==24','==42').replace('C10','C11').replace('chapter=10','chapter=11').replace('planned=12','planned=21').replace('closed_bilingual_units=6','closed_bilingual_units=7').replace('Chapters 1-10','Chapters 1-11').replace('Chapters 1-9 complete; chapter10','Chapters 1-10 complete; chapter11').replace('Chapter10','Chapter11').replace('6 bilingual','7 bilingual').replace('location-007','location-008')
 (r/dest).write_text(text,encoding='utf-8')
print(f'Chapter11 full translation {len(source)} chars,7 units')
