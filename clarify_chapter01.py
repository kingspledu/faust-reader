from pathlib import Path
import json,re,html
root=Path(__file__).parent;p=root/'adaptations/chapter-01.json';d=json.loads(p.read_text(encoding='utf-8'))
thoughts=['분명 잊었다고 생각했는데. 왜 지금 다시 떠오르는 걸까.','이번에는 붙잡을 수 있을까. 아니면 또 놓치게 될까.','내가 기억하는 모습과 달라도 괜찮아. 잠깐만 곁에 있어 줘.','이렇게 오래 지났는데도 마음은 그때처럼 흔들리는구나.','그때는 함께 걷는 일이 이렇게 소중한 줄 몰랐어.','나는 그 사람들뿐 아니라, 그들과 함께였던 나도 그리운 거구나.','그때 다른 길을 골랐다면, 우리는 헤어지지 않았을까.','다음에 말하면 된다고 생각했는데. 그 다음이 오지 않을 수도 있었어.','이 노래를 가장 먼저 들려주고 싶던 사람들은 이제 없구나.','목소리는 잊혀도, 그 말이 내게 준 용기는 남아 있어.','낯선 사람들이 내 노래를 좋아해 준다면 기쁠 거야. 그래도 그들이 그 빈자리를 대신할 수는 없겠지.','어딘가에서 살아 있다면, 부디 잘 지내기를.','잊어야만 견딜 수 있는 건 아닐지도 몰라.','내 노래도 저 소리처럼 흔들려도 괜찮을까.','지금은 울어도 괜찮아. 아직 소중하다는 뜻이니까.','돌아오지 않는다는 건 알아. 그래도 나는 너희를 기억하며 노래할 수 있어.']
explanations={0:'여기서 나타나는 형상은 실제로 돌아온 사람들이 아니라, 시인의 마음속에서 되살아난 기억이다. 헌시는 본격적인 이야기가 시작되기 전에 지난 삶과 소중한 사람들에게 마음을 전하는 시다.',5:'첫사랑과 우정은 서로 다른 관계지만, 시인에게는 자신이 누군가를 믿고 마음을 나눌 수 있었던 시간을 뜻했다.',6:'삶이 미로 같다는 말은, 살아갈 때는 어느 선택이 어디로 이어질지 쉽게 알 수 없다는 뜻이다. 시인도 이별의 이유를 모두 설명할 수는 없었다.',10:'박수를 받으면 누구나 기쁠 것 같지만, 시인의 감정은 단순하지 않았다. 새로운 인정이 반가워도, 함께 기뻐해 줄 옛 벗들이 없다는 슬픔까지 사라지지는 않았다.',13:'바람이 현을 울리는 악기를 에올리아 하프라고 한다. 시인은 스스로 완전히 조절할 수 없는 그 소리에서, 기억과 감정에 이끌려 나오는 자신의 노래를 떠올렸다.',15:'기억이 현실이 된다는 말은 죽은 사람이 정말 살아났다는 뜻이 아니다. 오래전의 사랑과 우정이 지금의 시인에게 다시 힘을 주기 시작했다는 뜻에 가깝다.'}
sections=[]
for i,text in enumerate(d['passages']):
 pars=text.split('\n');body='<section class="adaptation-prose" lang="ko"><p class="voice-label">[나레이션: 전지적 서술자]</p>'+''.join('<p>'+html.escape(x)+'</p>' for x in pars)
 if i in explanations:body+='<p class="friendly-note">'+html.escape(explanations[i])+'</p>'
 body+='<aside class="inner-voice"><p class="voice-label">[독백: 시인]</p><p>‘'+html.escape(thoughts[i])+'’</p></aside></section>';sections.append(body)
for directory in [root,root/'dist']:
 f=directory/'chapter-01.html';s=f.read_text(encoding='utf-8');de=re.findall(r'<pre lang="de">(.*?)</pre>',s,re.S);ko=re.findall(r'<div class="ko-translation" lang="ko">(.*?)</div>',s,re.S);cursor=[0]
 def replace(m):
  v=sections[cursor[0]];cursor[0]+=1;return v
 s=re.sub(r'<section class="adaptation-prose" lang="ko">.*?</section>',replace,s,flags=re.S);assert cursor[0]==16
 css='.voice-label{font:600 13px/1.7 system-ui;color:#80584b;letter-spacing:.03em}.inner-voice{margin:22px 0;padding:16px 22px;background:#eee5d8;border-left:3px solid #997b68}.inner-voice p:last-child{margin-bottom:0}.friendly-note{color:#675c51}.source-fold:not([open])>*:not(summary){display:none}'
 s=s.replace('</style>',css+'</style>');s=s.replace('이름 없는 시인은 파우스트와 별개입니다.','이름 없는 시인은 파우스트와 별개입니다. [나레이션]은 서술자의 설명이고, [독백]은 시인이 마음속으로 하는 말입니다. 독백과 보충 설명은 이해를 돕기 위한 각색입니다.')
 assert re.findall(r'<pre lang="de">(.*?)</pre>',s,re.S)==de;assert re.findall(r'<div class="ko-translation" lang="ko">(.*?)</div>',s,re.S)==ko;assert not re.search(r'<details class="source-fold"[^>]*\bopen\b',s)
 f.write_text(s,encoding='utf-8')
d['voice_policy']={'narrator':'전지적 서술자 · 중학생 대상 친절한 묘사와 설명','monologue_speaker':'시인 · 본문에 화자 명시','source_policy':'독일어 원문과 번역 문구 보존·기본 접힘'};d['monologues']=thoughts;d['explanations']=explanations;p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
p=root/'AGENTS.md';s=p.read_text(encoding='utf-8');s+='\n## Adaptation reader policy\n\nFor persona prose, use accessible, friendly webnovel narration and explanatory description for middle school readers. Include both narration and interior monologue and explicitly label their speakers (e.g. [나레이션: 전지적 서술자], [독백: 시인]). User requested omniscient narration overrides persona limited viewpoint defaults. Preserve German source and existing Korean translation verbatim inside closed-by-default expandable sections. Clarify that added monologues and explanation are adaptations, not source quotations. Current application scope is chapter 1 only until further instruction.\n';p.write_text(s,encoding='utf-8');print('16 narrator labels, 16 named monologues; source and translation unchanged; folds closed')
