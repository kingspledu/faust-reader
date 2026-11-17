from pathlib import Path
import json
r=Path(__file__).parent
raw=r'''
파우스트|메피스토가 마르테의 집을 나온 뒤 파우스트를 만났다. 파우스트는 기다렸다는 듯 일이 어떻게 됐는지 물었다.
“잘됐어? 이제 만날 수 있어?”|왜 이렇게 오래 걸려. 약속을 잡았다는 건지부터 말해 줬으면 좋겠네.
메피스토|메피스토는 파우스트의 조급함을 보고 웃었다.
“아주 기다리셨네요. 곧 그레첸을 만나게 될 거예요.”
그는 그레첸의 마음도 얻을 수 있다는 듯 자신 있게 말했다.|저 표정 좀 봐. 만날 수만 있다면 뭐든 하겠어.
파우스트|메피스토는 오늘 저녁 마르테의 집에서 그레첸을 만날 거라고 했다. 마르테가 만남을 주선하기에 딱 좋은 사람이라며 빈정거렸다.
파우스트가 좋아하자 한 가지 조건을 덧붙였다. 마르테의 부탁도 들어줘야 했다.
“도움을 받았으면 도와줘야지. 뭔데?”|별로 어려운 일은 아니겠지. 어쨌든 오늘 저녁에 볼 수 있다잖아.
파우스트|메피스토는 마르테의 남편이 파도바에 묻혔다고 증언해 주면 된다고 말했다. 앞서 마르테에게 약속한 두 번째 증인으로 파우스트를 쓰려는 것이다.
파우스트가 되물었다.
“그러려면 먼저 가서 확인해야겠네?”|난 그 사람을 본 적도 없는데. 어디 묻혔는지 어떻게 안다고 해?
메피스토|“그럴 필요 없어요. 그냥 그렇다고 말하면 돼요.”
파우스트는 듣자마자 거절했다.
“다른 방법이 없으면 그 약속은 취소해.”
메피스토는 갑자기 성인군자라도 된 것처럼 군다며 비꼬았다.|이제 와서 거짓말은 못 하겠다? 언제부터 그렇게 확인하고 말했대?
파우스트|메피스토는 그동안 파우스트가 신과 세상, 사람의 생각과 마음을 얼마나 자신 있게 설명했는지 들춰냈다.
“그때는 전부 확인하고 말했어요? 정말 다 알고 있었어요?”
모르는 것을 아는 것처럼 말한 적이 없느냐고 몰아붙이는 질문이었다.|내가 다 안다고 한 적이 있어? 학문 얘기를 왜 여기다 갖다 붙여?
메피스토|메피스토는 남편의 죽음에 대해서도 그만큼밖에 모르는 것 아니냐고 했다. 파우스트는 말을 비튼다며 화를 냈다.
그러자 메피스토는 그레첸에게 온 마음으로 사랑한다고 맹세할 것 아니냐고 물었다. 사랑을 고백할 때도 확신할 수 없는 말을 하지 않겠느냐는 공격이었다.|이번에는 사랑 얘기를 해 보자고. 그건 절대 거짓말 아니라고 하겠지?
파우스트|“그건 진심으로 말할 거야.”
파우스트가 대답하자 메피스토는 다시 물었다.
“영원히 사랑하고 절대 변하지 않겠다고요? 그것도 진심이에요?”
지금의 마음이 진짜라는 것과 앞으로도 절대 바뀌지 않는다고 장담하는 것은 같지 않다는 지적이었다.|아직 고백도 안 했는데 벌써 거짓말 취급이야. 내가 느끼는 걸 왜 자꾸 부정하지?
파우스트|파우스트는 그만하라며 말을 이었다. 느끼는 감정은 크고 복잡한데 맞는 말을 찾을 수 없다고 했다. 그래서 가장 큰 말들을 골라 무한하다거나 영원하다고 부르는 것이라고 설명했다.
“그게 전부 거짓말이야?”
메피스토는 오히려 자기 말이 맞지 않느냐고 받아쳤다.|마음을 설명하려는 건데. 영원하다는 말밖에 생각 안 나면 어떻게 하라고?
파우스트|파우스트는 더 말해 봐야 끝나지 않을 것 같았다.
“그래, 네가 맞다고 해. 계속 우기면 결국 네 말이 맞겠지. 이제 그만하고 가자.”
그는 메피스토의 도움이 있어야 그레첸을 만날 수 있었다. 그걸 포기하지 못해 대화를 끝냈지만, 거짓 증언이 옳다고 납득한 것은 아니었다.|말싸움만 하다가 저녁을 놓치겠어. 일단 가자. 지금은 저 사람 도움이 필요하니까.
'''
records=[];current=''
for line in raw.strip().splitlines():
 if any(line.startswith(name+'|') for name in ['파우스트','메피스토']) and current:records.append(current);current=line
 elif not current:current=line
 else:current+='\n'+line
if current:records.append(current)
assert len(records)==10
scenes=[]
for i,row in enumerate(records,1):
 speaker,narration,monologue=row.split('|');scenes.append(dict(id=f'c14-dense-{i:03}',speaker=speaker,narration=narration,monologue=monologue))
p=r/'adaptations/chapter-14.json';assert not p.exists();p.write_text(json.dumps(dict(title='확인하지 않은 증언',persona='K-FAUST_META_PERSONA_v1.0.md',audience='중학생',viewpoint='third-person omniscient',status='draft_pending_visual_review',prose_revision='modern-dialogue-2026-11-17',scenes=scenes),ensure_ascii=False,indent=2),encoding='utf-8')
p=r/'build_tts_canvas.py';s=p.read_text(encoding='utf-8').replace('chapters_to_build=[1,2,3,4,5,6,7,8,9,10,11,12,13]','chapters_to_build=[1,2,3,4,5,6,7,8,9,10,11,12,13,14]').replace("'이웃집에서 꾸민 약속'][ch-1]","'이웃집에서 꾸민 약속','확인하지 않은 증언'][ch-1]")
s=s.replace('   units.append(seg);allindex.append',"   if ch==14:\n    seg['performance']['emotion']='기대에서 당혹감·분노·마지못한 동의로' if speaker=='파우스트' else '예의 있는 말투 속 빈정거림과 논쟁의 여유' if speaker=='메피스토' else '논쟁의 쟁점과 말이 바뀌는 이유를 친절하고 또렷하게 전달'\n    seg['performance']['acting_notes']+=' 파우스트는 자연스러운 반말, 메피스토는 빈정거리는 해요체다. 말다툼의 속도는 살리되 소리를 지르지 않는다. 독백은 나직한 보통 말소리로 유지한다. 마지막 양보는 납득보다 지치고 조급한 느낌이다.'\n   units.append(seg);allindex.append")
p.write_text(s,encoding='utf-8')
for name in ('test_tts_effects.cjs','test_tts_batch_v04.cjs'):
 p=r/name;s=p.read_text(encoding='utf-8').replace('ch<=13','ch<=14').replace('chapters:[1,2,3,4,5,6,7,8,9,10,11,12,13]','chapters:[1,2,3,4,5,6,7,8,9,10,11,12,13,14]').replace('thirteen chapter routes','fourteen chapter routes');p.write_text(s,encoding='utf-8')
print('Chapter14 prose10 and TTS tools prepared')
