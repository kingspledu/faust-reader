from pathlib import Path
from bs4 import BeautifulSoup
import json,re
r=Path(__file__).parent;p=r/'chapter-17.html';s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser');de=''.join(x.get_text() for x in s.select('article pre[lang="de"]'))
raw=[('', '''파우스트 혼자.

고귀한 영이여, 당신은 내가 청했던 모든 것을, 모든 것을 주었습니다.
불꽃 속에서 내게 얼굴을 보인 일은 헛되지 않았습니다.
아름다운 자연을 내 왕국으로 주고, 그것을 느끼고 즐길 힘도 주었습니다.
차갑게 놀라워하기만 하는 방문객으로 두지 않고,
친구의 마음속을 들여다보듯 자연의 깊은 가슴을 들여다보게 해 줍니다.
살아 있는 것들을 차례로 내 앞에 지나가게 하며,
고요한 덤불과 공기와 물속에서 내 형제들을 알아보게 가르칩니다.
숲에서 폭풍이 울부짖고 나무들이 삐걱거릴 때,
거대한 전나무가 쓰러지며 곁의 가지와 줄기를 부러뜨리고,
그 쓰러지는 소리가 언덕에 둔하고 깊게 울릴 때,
당신은 나를 안전한 동굴로 이끌어 나 자신을 보게 합니다.
그러면 내 가슴 깊이 숨은 놀라움이 열립니다.
맑은 달이 내 눈앞으로 떠올라 마음을 달래면,
바위 벽과 축축한 덤불에서 아득한 옛 세계의 은빛 형상들이 떠올라,
사색의 엄숙한 기쁨을 부드럽게 해 줍니다.

아, 인간에게는 완전한 것이 주어지지 않는다는 걸 이제 느낍니다.
나를 신들에게 점점 가까이 데려가는 이 기쁨과 함께,
당신은 이제는 없어서는 안 될 동행도 내게 주었습니다.
그는 차갑고 뻔뻔하게 내가 나 자신을 하찮게 여기도록 만들고,
말 한마디로 당신의 선물을 아무것도 아닌 것으로 바꿔 버립니다.
그는 내 가슴에 그 아름다운 모습을 향한 거친 불길을 부지런히 부추깁니다.
그리하여 나는 갈망에서 즐거움으로 비틀거리며 나아가고,
그 즐거움 속에서도 다시 갈망에 목말라 합니다.'''),
('(Mephistopheles tritt auf.)', '''(메피스토펠레스가 등장한다.)

메피스토펠레스
이런 생활도 이제 충분히 해 보지 않으셨습니까?
어떻게 오래도록 즐거울 수 있지요?
한 번쯤 해 보는 건 좋지만, 이제는 다른 걸 해 보셔야죠!

파우스트
좋은 날에 나를 괴롭히는 것 말고 네게 다른 일이 좀 있었으면 좋겠어.

메피스토펠레스
자, 자! 쉬시게 두는 건 좋습니다만, 정말 그렇게 말하실 필요는 없지요.
불친절하고 거칠고 제멋대로인 당신 같은 동행은 잃어도 별로 아쉽지 않아요.
온종일 손이 모자랄 만큼 바쁘게 해 놓고!
무엇이 좋으신지, 무엇을 하지 말아야 하는지 얼굴만 보고는 도무지 알 수가 없어요.

파우스트
참으로 알맞은 말투로군!
나를 지겹게 해 놓고 고맙다는 말까지 바라는군.'''),
('MEPHISTOPHELES.\nWie hättst du', '''메피스토펠레스
가엾은 인간이여, 내가 없었다면 당신은 어떻게 살았을까요?
상상 속의 골칫거리에서 당신을 한동안 벗어나게 해 준 건 나예요.
내가 없었다면 당신은 벌써 이 세상을 떠났겠지요.
왜 동굴과 바위틈에 부엉이처럼 틀어박혀 있나요?
왜 두꺼비처럼 눅눅한 이끼와 물 떨어지는 바위에서 양분을 빨아들이나요?
참 아름답고 달콤한 소일거리네요!
당신 속에는 아직도 박사님이 들어앉아 있군요.'''),
('FAUST.\nVerstehst du', '''파우스트
이 외딴곳을 거닐며 내가 얼마나 새로운 생명력을 얻는지 알기는 해?
네가 조금이라도 짐작할 수 있다면,
악마인 너는 내 행복을 못마땅해하겠지.

메피스토펠레스
세상 밖의 즐거움이로군요.
밤이슬 내리는 산에 누워 땅과 하늘을 기쁘게 끌어안고,
스스로 신이라도 된 듯 부풀어 올라,
예감에 이끌려 대지의 속까지 파헤치고,
창조의 엿새 동안 이루어진 모든 일을 가슴속에 느끼고,
자랑스러운 힘으로 무엇인지도 모를 것을 즐기다가,
사랑의 기쁨으로 만물에 넘쳐흐르지요.
인간의 모습은 완전히 사라지고,
그 높은 깨달음은—
(몸짓을 하며)
어떻게인지는 말할 수 없지만—이렇게 끝나는 거죠.

파우스트
더러운 소리 집어치워!'''),
('MEPHISTOPHELES.\nDas will Euch', '''메피스토펠레스
마음에 안 드시는군요. 점잖게 더럽다고 말할 권리도 있으시지요.
순결한 마음도 없이는 못 사는 것을, 순결한 귀 앞에서는 입에 올릴 수가 없군요.
간단히 말하자면, 가끔 자신에게 거짓말하는 즐거움쯤은 누리셔도 좋아요.
하지만 오래 버티지는 못할 겁니다.
벌써 지치셨고, 더 오래 계속되면 광기나 불안과 공포 속에서 완전히 소진되겠지요.'''),
('Genug damit! Dein Liebchen', '''이쯤 하지요! 당신의 연인은 집 안에 앉아 모든 것이 답답하고 어둡게 느껴집니다.
당신 생각이 머리에서 떠나지 않고, 당신을 주체할 수 없을 만큼 사랑해요.
처음에는 눈 녹은 물로 개울이 넘치듯 당신의 사랑이 쏟아졌고,
그 사랑을 그 아이의 가슴에 부어 넣었지요. 그런데 이제 당신의 개울은 다시 얕아졌군요.
숲에서 왕처럼 앉아 있기보다,
그렇게 앳된 가엾은 아이의 사랑에 보답하는 것이 훌륭한 어른께 더 어울릴 것 같네요.
그 아이에게 시간은 지독히도 더디 갑니다.
창가에 서서 오래된 성벽 위로 구름이 흘러가는 것을 바라봐요.
‘내가 작은 새라면!’ 하고 온종일, 밤의 절반까지 노래하지요.
가끔은 밝지만 대개는 슬퍼하고, 한 번 실컷 울고 나면,
다시 차분해진 듯 보이지만, 언제나 사랑에 빠져 있어요.'''),
('FAUST.\nSchlange!', '''파우스트
뱀 같은 놈! 뱀 같은 놈!

메피스토펠레스(혼잣말로)
이것 봐라! 내가 너를 붙잡았지!

파우스트
몹쓸 놈! 여기서 꺼져. 그 아름다운 사람의 이름을 입에 올리지 마!
가뜩이나 미칠 것 같은 내 감각 앞에 그 몸을 향한 욕망을 다시 불러오지 마!

메피스토펠레스
뭘 그러시나요? 그 아이는 당신이 도망갔다고 생각해요.
사실 당신은 반쯤은 이미 도망친 셈이고요.'''),
('FAUST.\nIch bin ihr nah', '''파우스트
아무리 멀리 있어도 나는 그 아이 곁에 있어.
그 아이를 결코 잊을 수도, 잃을 수도 없어.
지금 그 아이의 입술이 주님의 몸에 닿는다면, 나는 그것마저 질투할 지경이야.

메피스토펠레스
잘 알지요, 친구여! 나도 당신이 부러울 때가 많았어요.
장미 사이에서 노니는 그 한 쌍 때문에요.

파우스트
꺼져, 뚜쟁이 같은 놈!

(‘주님의 몸’은 성찬의 성체를 가리킨다. 메피스토펠레스의 ‘한 쌍’은 그레트헨의 몸을 두고 하는 저속한 농담이다.)'''),
('MEPHISTOPHELES.\nSchön! Ihr schimpft', '''메피스토펠레스
좋군요! 당신은 욕하고 나는 웃을 수밖에요.
남자와 여자를 만든 신도, 둘이 만날 기회를 마련하는 일이 가장 고귀한 일이라는 걸 바로 알았겠지요.
어서 가요. 정말 딱하기도 하지!
연인의 방에 가시라는 거지, 죽으러 가시라는 게 아니잖아요.'''),
('FAUST.\nWas ist die Himmelsfreud', '''파우스트
그 아이 품에 안기는 하늘 같은 기쁨이 무엇인가!
그 가슴에서 온기를 얻고 싶어!
그 아이의 괴로움을 언제나 느끼고 있지 않은가?
나는 도망자 아닌가? 집도 없는 사람 아닌가?
목적도 안식도 없이, 바위에서 바위로 내리쏟아지는 폭포처럼,
욕망에 사납게 휩쓸려 낭떠러지를 향해 달려가는 괴물 아닌가?
그 곁에서 그 아이는 아직 세상 물정도 모른 채,
작은 산속 들판의 오두막에 살며,
자그마한 세상 안에서 집안일을 하고 있었는데.
신에게 버림받은 나는 바위를 붙잡아 산산이 부수는 것으로도 모자라,
그 아이의 평화까지 뒤흔들어야 했구나!
지옥아, 너는 이 희생을 꼭 받아야 했느냐.
악마야, 이 불안한 시간을 짧게 끝내도록 도와줘.
일어나야 할 일이라면 당장 일어나 버려라!
그 아이의 운명이 내 위로 무너져 내리고,
그 아이도 나와 함께 파멸한다 해도!'''),
('MEPHISTOPHELES.\nWie’s wieder siedet', '''메피스토펠레스
또 끓어오르고 또 뜨거워지는군요!
가서 그 아이를 위로해 줘요, 바보 같은 분!
그 조그만 머리로 빠져나갈 길을 못 찾으면 곧장 끝장부터 상상하지요.
용감하게 버티는 사람 만세!
평소에는 제법 악마처럼 구시면서,
세상에서 절망하는 악마만큼 우스운 것도 없어요.''')]
starts=[0]+[de.index(x) for x,k in raw[1:]]+[len(de)]
units=[dict(id=f'C17-T{i:03}',source_start=b,source_end=e,source=de[b:e],ko=row[1].strip()) for i,(row,b,e) in enumerate(zip(raw,starts,starts[1:]),1)]
t=r/'translations/chapter-17.ko.json';assert not t.exists();t.write_text(json.dumps(dict(chapter=17,status='complete_draft_translation',source_total_chars=len(de),covered_end=len(de),segments=units,notes=['숲·폭포·산속 오두막의 후반 표현은 비유이며 그레트헨의 실제 주소나 재난 사건으로 확정하지 않음.','그레트헨의 창가·노래·울음은 메피스토펠레스가 전하는 말. 현재 숲에 등장하지 않음.','숭고한 영에게 감사하는 첫 독백은 영이 현장에 다시 나타나는 장면이 아님.','몸짓의 외설적 암시는 번역에서 유지하되 삽화에서 노골적인 신체·성적 행동을 만들지 않음.']),ensure_ascii=False,indent=2),encoding='utf-8')
blocks=s.select('article pre[lang="de"]');anchor=blocks[0]
for u in units:
 d=s.new_tag('details',attrs={'class':'source-fold','data-translation':u['id']});z=s.new_tag('summary');z.string='독일어 원문 · 한국어 번역 펼치기';d.append(z);z=s.new_tag('pre',lang='de');z.string=u['source'];d.append(z);z=s.new_tag('div',attrs={'class':'ko-translation','lang':'ko'});z.string=u['ko'];d.append(z);anchor.insert_before(d)
for b in blocks:b.decompose()
for b in s.select('article>.translation-note'):b.decompose()
s.select_one('header a[href="scene-plan.html"]').string='삽화 장면 구성';p.write_text(str(s),encoding='utf-8')
text=(r/'render_chapter16.py').read_text(encoding='utf-8').replace('chapter-16','chapter-17').replace('chapter16','chapter17').replace('Chapter16','Chapter17').replace("e['chapter']==16","e['chapter']==17").replace("e.get('chapter')!=16","e.get('chapter')!=17").replace('==3','==11').replace('==6','==21').replace('/6','/21').replace('all 3 bilingual','all 11 bilingual').replace('Chapters 1-16 illustrated','Chapters 1-17 illustrated').replace('Chapters 1-15 complete','Chapters 1-16 complete').replace("['character-010','character-008','character-053','character-054','location-012']","['character-010','character-008','location-013']")
text=re.sub("review_note='[^']*'","review_note='회춘한 파우스트와 귀족복 메피스토펠레스의 숲 대화. 영·그레트헨·폭포 비유는 현장 등장이나 실제 재난으로 그리지 않음. 그레트헨의 상태는 메피스토펠레스의 주장.'",text)
(r/'render_chapter17.py').write_text(text,encoding='utf-8')
text=(r/'verify_chapter16.py').read_text(encoding='utf-8').replace('chapter-16','chapter-17').replace('chapter16','chapter17').replace('C16','C17').replace("e['chapter']==16","e['chapter']==17").replace('chapter=16','chapter=17').replace('bilingual_units=3','bilingual_units=11').replace('==3','==11').replace('(0,6)','(0,16,21)').replace('==6','==21').replace('n==6','n==21').replace('positions[15]+1:positions[16]','positions[16]+1:positions[17]')
(r/'verify_chapter17.py').write_text(text,encoding='utf-8')
print('Chapter17 source and translation prepared:',len(de),'characters,',len(units),'units')
