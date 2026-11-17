from pathlib import Path
from bs4 import BeautifulSoup
import json,html,hashlib
r=Path(__file__).resolve().parents[1];out=r/'review'
rows=[
('''그레첸은 머리를 땋으며 낮에 만난 남자를 떠올렸다. 처음 보는 사람인데 집까지 데려다주겠다고 팔을 내밀었다. 거절하고 돌아서긴 했지만, 누구였는지 자꾸 궁금했다.
옷차림을 보니 귀한 집 사람 같았다. 그래서 그렇게 자신 있게 말을 걸었을까. 그레첸은 머리를 묶고 방을 나갔다.''', '그레첸','그 사람, 누구였을까? 이름이라도 알면 좋을 텐데.'),
('''그레첸이 나간 사이 메피스토가 파우스트를 데려왔다. 두 사람은 그레첸에게 허락을 받지 않았다.
“들어와. 조용히.”
파우스트는 방에 들어서고도 한동안 말이 없었다. 창가와 탁자, 가지런히 놓인 물건들에 눈이 갔다.
“잠깐 혼자 있고 싶어. 나가 있어 줄래?”
메피스토는 방 안을 한 번 더 훑었다.
“깨끗하게도 해 놨네. 다들 이렇게 해 놓고 살지는 않는데.”
그는 그 말을 남기고 나갔다.''',None,None),
('''저녁빛이 방 안에 번졌다. 비싼 가구도 화려한 장식도 없는데, 파우스트는 이곳이 편안했다. 깨끗이 정리된 물건들에서 이 방을 쓰는 사람의 손길이 느껴졌다.
그는 침대 옆 가죽 안락의자에 앉았다. 오래된 의자는 그레첸보다 훨씬 전부터 이 집에 있었을 것 같았다.''',None,None),
('''파우스트는 의자 팔걸이에 손을 얹었다. 어린 그레첸이 이 의자 주변에서 놀았을까. 성탄 선물을 받고 할아버지에게 고맙다고 인사하는 모습도 상상했다.
탁자에 깔린 천과 깨끗한 바닥이 눈에 들어왔다. 어머니에게 배운 대로 이 방을 정리했을 그레첸이 떠올랐다. 파우스트는 평범한 살림살이에서도 자꾸 그녀를 찾았다.''',None,None),
('''파우스트는 자리에서 일어나 침대 쪽으로 다가갔다. 커튼을 살짝 들어 올리자 가슴이 두근거렸다.
그레첸이 매일 잠드는 곳이었다. 그는 한동안 빈 침대에서 눈을 떼지 못했다.''',None,None),
('''그레첸은 이 방에서 어린 시절을 보냈을 것이다. 파우스트는 그때도 지금처럼 순한 아이였으리라 생각했다. 잠깐 마주친 것밖에 없으면서, 그녀가 어떻게 자랐을지까지 궁금해졌다.
이곳에 더 머무르고 싶었다.''',None,None),
('''그러다 문득 자신이 왜 여기에 있는지 돌아봤다. 거리에서는 당장 그레첸을 만나게 해 달라고 메피스토를 다그쳤다. 그런데 방에 들어오니 그때처럼 밀어붙일 수가 없었다.
그레첸은 낯선 남자가 자기 방을 둘러보고 있다는 사실조차 몰랐다.''','파우스트','나 지금 뭐 하는 거야. 들어와도 되냐고 묻지도 않았잖아.'),
('''파우스트는 들어 올렸던 커튼을 내려다봤다. 조금 전까지는 그레첸을 만날 생각뿐이었는데, 이제는 여기 있는 것부터 부끄러웠다.
어떻게 이렇게 마음이 달라질 수 있을까. 그는 낯선 사람을 보듯 자기 행동을 돌아봤다.''',None,None),
('''닫힌 문으로 눈이 갔다. 지금 그레첸이 들어오면 뭐라고 해야 할까. 남의 방에서 무엇을 하느냐고 물으면 할 말이 없었다.
파우스트는 더 머무를 자신이 없어졌다.''',None,None),
('''그때 메피스토가 돌아왔다.
“빨리 와. 아래에 그레첸이 보여. 돌아오고 있어.”
파우스트가 곧장 문으로 돌아섰다.
“나가자. 빨리. 나 여기 다시는 안 와.”''',None,None),
('''메피스토는 나가는 대신 작은 상자를 내밀었다.
“잠깐. 이건 두고 가야지. 제법 묵직하지?”
파우스트의 걸음이 멎었다.
“다른 데서 구해 왔어. 저 수납장에 넣어. 안에 든 걸 보면 그레첸도 그냥 지나치진 못할걸.”
파우스트는 선뜻 손을 내밀지 않았다. 메피스토는 상자를 내민 채 그의 얼굴을 살폈다.''',None,None),
('''“글쎄. 이걸 두고 가도 될까?”
메피스토가 파우스트를 보더니 웃었다.
“왜, 이제 아까워? 네가 가지려고?”
파우스트의 얼굴이 굳었다. 보석이 아까워서 하는 말이 아니었다. 메피스토는 그가 왜 망설이는지 물을 생각도 없었다.''',None,None),
('''메피스토는 파우스트가 머뭇거리는 모습이 재미있었다. 만나게 해 달라고 재촉하던 사람이 상자 하나 앞에서 말이 없어졌다.
“설마 아까운 건 아니지? 이거 구하느라 내가 얼마나 애썼는데.”
그는 대답을 기다리지 않고 수납장을 열어 상자를 넣었다. 잠금쇠를 다시 누른 뒤 문 쪽으로 몸을 돌렸다.
“됐어. 이제 가자.”''',None,None),
('''메피스토는 문 앞에서 파우스트를 돌아봤다. 여전히 굳은 얼굴을 보니 한마디 더 놀리고 싶어졌다.
“그렇게 만나고 싶다더니 왜 말이 없어? 강의 들으러 끌려가는 사람 같네.”
파우스트는 대꾸하지 않았다. 두 사람이 떠난 뒤, 그레첸이 등불을 들고 돌아왔다.
방 안이 유난히 덥고 답답했다. 그레첸은 창문을 열었다.
“밖은 그렇게 덥지도 않은데. 왜 이러지?”
어머니가 빨리 돌아왔으면 좋겠다는 생각이 들었다.''',None,None),
('''그레첸은 온몸에 소름이 돋자 스스로를 달랬다.
“괜히 겁내는 거야.”
그녀는 옷을 갈아입으며 노래를 불렀다. 멀리 툴레라는 나라에 살던 왕의 이야기였다.
왕의 연인은 죽기 전 금잔을 남겼다. 왕은 그 잔을 무엇보다 소중히 여겼고, 잔치에서 그걸로 마실 때마다 눈물을 흘렸다. 나라를 물려줄 때도 금잔만은 남에게 주지 않았다.''',None,None),
('''노래 속 왕은 바닷가 성에서 마지막 잔치를 열었다. 기사들이 둘러앉은 자리에서 금잔으로 술을 마신 뒤, 잔을 바다로 던졌다. 잔이 깊이 가라앉는 모습을 보고 눈을 감았다. 그 뒤로는 한 모금도 마시지 않았다.
노래를 마친 그레첸은 옷을 넣으려고 수납장을 열었다. 안에 낯선 상자가 있었다.
“이게 왜 여기 있지? 분명히 잠가 뒀는데.”''',None,None),
('''그레첸은 상자를 살펴봤다. 어머니에게 돈을 빌리면서 누군가 맡겨 놓은 물건일까. 돈을 빌릴 때 귀한 물건을 맡겼다가 갚은 뒤 찾아가는 일도 있었다.
“엄마가 받아 두셨나?”
그렇다면 잠긴 수납장 안에 있는 것도 이상하지 않았다.''',None,None),
('''상자에는 끈에 매달린 작은 열쇠가 달려 있었다.
“잠깐 열어 볼까?”
그레첸은 열쇠를 돌리고 뚜껑을 들었다. 안에 든 보석을 보자 눈이 커졌다.
“세상에. 이런 건 처음 봐.”''',None,None),
('''그레첸은 목걸이를 조심스럽게 들어 올렸다. 귀한 집 부인이 큰 명절에나 하고 나갈 것 같았다.
“대체 누구 거지?”
누가 맡긴 물건인지 궁금했다. 그러면서도 거울에 비춰 보고 싶어졌다.''','그레첸','나한테는 어떨까? 잠깐 걸어 보기만 하자.'),
('''그레첸은 목걸이와 귀걸이를 하고 거울 앞에 섰다. 옷은 같은데 얼굴까지 달라 보였다.
“이 귀걸이가 내 거면 좋겠다.”
거울을 보고 있자니 사람들이 가난한 처녀를 어떻게 대하는지 떠올랐다. 예쁘다고 칭찬하면서도 어딘가 불쌍히 여기는 말투였다. 젊고 예쁘다는 것만으로 형편이 달라지지는 않았다.''',None,None),
('''“결국 다들 돈을 찾는구나. 돈이 있어야 하는 거야.”
그레첸은 거울 속 목걸이를 바라봤다. 처음에는 신기하기만 했는데, 이제는 갖고 싶었다. 누구 것인지도 모르는 보석을 한 채 그녀는 한숨을 쉬었다.''',None,None)]
assert len(rows)==21
current=json.loads((r/'adaptations/chapter-11.json').read_text(encoding='utf-8'))
scenes=[dict(id=f'c11-dense-{i:03}',narration=n,monologue_speaker=sp,monologue=m) for i,(n,sp,m) in enumerate(rows,1)]
sample=dict(chapter=11,title='방에 남겨진 보석 상자',status='review_only',method='Humanizer v4 editorial principles; source-grounded Korean dialogue rewrite',scenes=scenes)
(out/'chapter-11-dialogue-v3-sample.json').write_text(json.dumps(sample,ensure_ascii=False,indent=2),encoding='utf-8')
md=['# 11장 · 방에 남겨진 보석 상자','검토용 시범본. 공개 본문과 TTS는 바꾸지 않았습니다.','']
for i,b in enumerate(scenes,1):
 md.extend([f'## {i:02}',b['narration'],''])
 if b['monologue']:md.extend([f'[독백: {b["monologue_speaker"]}]',f'‘{b["monologue"]}’',''])
(out/'CHAPTER11_DIALOGUE_V3_SAMPLE.md').write_text('\n\n'.join(md),encoding='utf-8')
page=BeautifulSoup((r/'chapter-11.html').read_text(encoding='utf-8'),'html.parser');sections=page.select('article>.illustrated-scene')
css='''*{box-sizing:border-box}body{margin:0;background:#f6f2e9;color:#292b26;font:18px/1.95 system-ui,sans-serif}header,main{max-width:1120px;margin:auto;padding:24px}header{border-bottom:1px solid #d0c7b5}h1{font-size:30px}h2{font-size:21px}h3{font-size:17px;color:#536444}.scene{padding:30px 0;border-bottom:1px solid #d0c7b5;scroll-margin-top:16px}img{display:block;width:min(100%,840px);height:auto;margin:20px auto}.versions{display:grid;grid-template-columns:1fr 1fr;gap:32px}.versions>section{min-width:0}p{white-space:pre-wrap;overflow-wrap:anywhere}aside{border-left:3px solid #a8af94;padding:4px 16px;background:#eeeade;font-size:.96em}button,select{font:inherit;padding:8px 12px;border:1px solid #bbb4a6;background:#fffdf8;margin:4px;cursor:pointer}.note,summary{font-size:15px;color:#655f53}a{color:inherit}.only-new .old{display:none}.only-new .versions{display:block}.only-new .new{max-width:800px;margin:auto}details{margin:25px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:17px/1.9 Georgia,serif}.ko-translation{white-space:pre-wrap;font-size:17px;border-left:2px solid #b3987c;padding:12px 18px;background:#eee7db}@media(max-width:760px){header,main{padding:18px}.versions{display:block}.old{border-bottom:1px dashed #bbb;padding-bottom:15px}.versions>section{margin-bottom:20px}body{font-size:17px}}'''
parts=['<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>11장 대화 강화 시범본</title><style>'+css+'</style><body class="only-new"><header><h1>11장 · 방에 남겨진 보석 상자</h1><p class="note">대화·문체 검토용 시범본입니다. 공개 본문과 TTS는 변경하지 않았습니다. <a href="HUMANIZER_RESEARCH_AND_REVIEW.md">참고 자료와 검토 기록</a></p><button id="read">수정안만 읽기</button><button id="compare">현재 본문과 비교</button><label>장면 <select id="jump">'+''.join(f'<option value="{i}">{i:02}</option>' for i in range(1,22))+'</select></label></header><main>']
def paragraphs(text):return ''.join('<p>'+html.escape(x)+'</p>' for x in text.split('\n') if x)
for i,(b,old,sec) in enumerate(zip(scenes,current['scenes'],sections),1):
 img=sec.img;parts.append(f'<article class="scene" id="s{i}"><h2>{i:02}</h2><a href="../{img["src"]}" target="_blank" rel="noopener"><img src="../{img["src"]}" alt="{i}번 장면 삽화" loading="lazy"></a><div class="versions"><section class="old"><h3>현재 공개본</h3>'+paragraphs(old['narration'])+'<aside><b>[독백: '+html.escape(old['speaker'])+']</b>'+paragraphs(old['monologue'])+'</aside></section><section class="new"><h3>대화 강화 시범본</h3>'+paragraphs(b['narration']))
 if b['monologue']:parts.append('<aside><b>[독백: '+html.escape(b['monologue_speaker'])+']</b>'+paragraphs('‘'+b['monologue']+'’')+'</aside>')
 parts.append('</section></div>')
 for fold in sec.select('details.source-fold'):parts.append(str(fold))
 parts.append('</article>')
parts.append('''</main><script>document.getElementById('read').onclick=()=>document.body.classList.add('only-new');document.getElementById('compare').onclick=()=>document.body.classList.remove('only-new');document.getElementById('jump').onchange=e=>document.getElementById('s'+e.target.value).scrollIntoView();</script></body></html>''')
dest=out/'chapter-11-dialogue-v3-comparison.html';dest.write_text(''.join(parts),encoding='utf-8')
new=BeautifulSoup(dest.read_text(encoding='utf-8'),'html.parser')
assert len(new.select('article.scene'))==21 and len(new.select('.new aside'))==3
assert ''.join(x.get_text() for x in new.select('pre[lang=de]'))==''.join(x.get_text() for x in page.select('pre[lang=de]'))
assert [x.get_text() for x in new.select('.ko-translation')]==[x.get_text() for x in page.select('.ko-translation')]
assert not new.select('details[open]')
for im in new.select('img'):assert (out/im['src']).is_file()
metrics=dict(chapter=11,scenes=21,monologues_before=21,monologues_after=3,quoted_turns_before=sum(b['narration'].count('“') for b in current['scenes']),quoted_turns_after=sum(b['narration'].count('“') for b in scenes),source_preserved=True,translations_preserved=True,images_preserved=True,public_chapter_sha256=hashlib.sha256((r/'chapter-11.html').read_bytes()).hexdigest(),tts_changed=False,quality_judgment='editorial review; no AI-detector score or human-user evaluation')
(out/'chapter11-dialogue-v3-review-audit.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(metrics,ensure_ascii=False))
