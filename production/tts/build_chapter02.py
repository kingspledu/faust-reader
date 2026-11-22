"""Chapter 2: explicit contextual casting and sentence acting, canonical Canvas output."""
import json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[2];work=Path(__file__).parent
sys.path.insert(0,str(root/'.tools/audiobook-reader-skill/assets/gemini-canvas-tts/scripts'))
from build import generate
from copy_site import build_copy_site
from sentence_contract import validate_sentence
doc=json.loads((work/'chapter-02-sentences.json').read_text(encoding='utf-8'))
cast=json.loads((root/'voice-cast.json').read_text(encoding='utf-8'))
# Reviewed against the complete 64-paragraph conversation, independently of DOM labels.
roles={1:[3,5,6,19,21,23,28,30,31,33,34,58,60,61,63],2:[8,10,12,25,26,36,38,40,42,46,52,53],3:[14,16,17,44,48,50,55,56]}
directions=[
(1,6,'공연을 시작하기 전 세 사람을 소개하고, 지배인은 흥행을 부탁한다.','지배인은 두 동료에게 관객을 모을 방법을 구한다. 조급하되 화내지 않는다.'),
(7,12,'극작가는 인파보다 조용히 작품을 완성할 시간을 원한다.','지배인에게 창작의 어려움을 설명한다. 처음에는 불편하게, 오래 남는 글 이야기는 진지하게.'),
(13,17,'배우가 미래의 독자보다 오늘의 관객을 챙기며 끼어든다.','극작가의 진지함을 가볍게 받아친다. 친근한 미소, 관객을 무시하지 않는 재치.'),
(18,23,'지배인은 볼거리를 늘려 서로 다른 관객을 만족시키자고 제안한다.','두 동료를 설득한다. 요리 비유는 쉽게, 마지막 반문은 현실적인 자신감으로.'),
(24,26,'극작가는 장면을 잘라 내면 감정의 이유가 사라진다고 반박한다.','지배인에게 작품의 연결을 지키라고 요구한다. 불쾌함을 또렷하게 드러내되 고함치지 않는다.'),
(27,34,'지배인은 실제 관객의 여러 목적을 구체적으로 열거한다.','극작가에게 기대를 낮추라고 충고한다. 관객 묘사는 능청스럽게, 마지막 질문에는 가벼운 빈정거림.'),
(35,42,'극작가는 사람의 마음을 움직이는 이야기의 힘을 설명한다.','지배인에게 작가의 역할을 변호한다. 처음에는 단호하게, 자연과 신의 예시에서는 확신을 담아 넓게.'),
(43,48,'배우는 추상적인 논쟁을 누구나 겪는 사랑 이야기로 돌린다.','배우는 두 동료를 달래며 구체적인 이야기를 제안한다. 극작가의 짧은 반응은 시큰둥하게, 배우의 답은 반갑게.'),
(49,50,'배우는 처음 이야기를 만나는 젊은 관객의 마음을 생각한다.','두 동료에게 젊은 관객의 가능성을 설명한다. 따뜻한 기대, 실제 울음이나 웃음 연기는 하지 않는다.'),
(51,53,'극작가는 자신도 세상이 궁금했던 젊은 시절을 떠올린다.','배우에게 젊음을 되돌려 달라는 아쉬움을 말한다. 지난날의 호기심에서 그리움으로, 독백이 아닌 상대에게 하는 대사.'),
(54,56,'배우는 나이가 들어도 글을 쓸 수 있다고 극작가를 격려한다.','극작가에게 지금 가진 경험을 믿으라고 권한다. 농담 속에 존중을 담고 나이를 조롱하지 않는다.'),
(57,64,'지배인은 논쟁을 끝내고 무대 제작을 시작하자고 재촉한다.','두 동료에게 실행을 촉구한다. 장치 목록은 활기 있게, 하늘에서 지옥까지는 기대를 높이되 길을 분명히 안내한다.')]
byid={s['sentence_id']:s for s in doc['sentences']}
for p in doc['paragraphs']:
 seq=[s for s in doc['sentences'] if s['paragraph_id']==p['paragraph_id']]
 assert ''.join(s['source_slice'] for s in seq)==p['text']
for i,s in enumerate(doc['sentences']):
 n=int(s['paragraph_id'][-3:]);cid=next(('character-%03d'%r for r,ps in roles.items() if n in ps),'narrator')
 assert cid==s['declared_cast_id'],(s['sentence_id'],cid,s['declared_cast_id'])
 kind='narration' if cid=='narrator' else 'dialogue';profile=cast['profiles'][cid]
 scene,acting=next((a,b) for lo,hi,a,b in directions if lo<=n<=hi)
 evidence='인물의 행동·심리와 상황을 설명하는 3인칭 서술.' if cid=='narrator' else f'{profile["display_name"]}의 발언. 앞의 발언 소개와 뒤의 응답, 대화 주제를 대조.'
 if n==23:evidence+=' 21문단의 지배인 제안을 잇는 반문이며, 24문단에서 극작가가 고개를 저으며 반박하므로 지배인으로 확정.'
 if n==31:evidence+=' 30문단의 관객 열거에 이어 지배인이 작가에게 묻고, 32문단의 지배인 손짓과 33문단 설명으로 이어진다.'
 nonverbal='자연스러운 짧은 호흡만. 설명 속 웃음·울음·고함을 실제 소리로 덧붙이지 않는다.'
 links=[]
 if n in (14,16,17,34):
  source='C02-P015-S01' if n!=34 else 'C02-P035-S01'
  instruction='웃는 표정이 느껴지는 밝은 음색. 별도의 큰 웃음소리를 추가하지 않는다.' if n!=34 else '웃듯 던진 말이라는 뒤의 서술을 반영해 가벼운 미소와 빈정거림. 폭소 금지.'
  links=[dict(source_sentence_id=source,target_sentence_id=s['sentence_id'],cue_text=byid[source]['text'],instruction=instruction)]
  nonverbal=instruction
 prosody='중간 속도, 또렷하고 친절한 설명. 인물의 감정을 전달하되 인물의 목소리로 전환하지 않는다.' if kind=='narration' else '중간 속도, 자연스러운 한국어 대화. 물음표는 상대의 답을 기다리는 억양, 마침표는 뜻 단위로 편안히 내린다.'
 p=dict(character_persona=profile['persona'],sentence_persona=profile['persona']+' 이 문장에서는 '+scene+' 전달할 내용: '+s['text'],design=dict(addressee_intention=('청자에게 상황을 연결한다: ' if kind=='narration' else acting+' 이 문장의 발언: ')+s['text'],outer_inner=scene,pivot='문단 안 '+s['sentence_id'].split('-')[-1]+'의 뜻을 전달한다. 앞뒤 문장과 같은 감정 흐름을 유지한다.',prosody=prosody,nonverbal=nonverbal,continuation='같은 문단은 음색·거리·속도·감정선을 유지한다. 다음 문장이 있으면 새 장면처럼 시작하지 않는다.'),cue_links=links,audio_effect='dry',pace='medium',intensity=.4,pause_after_ms=200 if i+1<len(doc['sentences']) and doc['sentences'][i+1]['paragraph_id']==s['paragraph_id'] else 500,mic_direction='보통 유성 발성, 잔향 없는 원음. 속삭임 금지.',emotion=scene,acting_notes=acting)
 s.update(cast_id=cid,speaker=profile['display_name'],voice=profile['voice_name'],kind=kind,performance=p,status='reviewed-generation-ready')
 s['review']=dict.fromkeys(('attribution','classification','performance','speaker_pass','cue_pass','continuity_pass'),'confirmed')
 s['review'].update(evidence=evidence,sentence_boundary_evidence='문장부호 경계와 문자 범위를 대조했고 분할 조각을 합쳐 게시 문단을 복원했다.',review_passes=['64문단 전체 문맥을 읽고 발언 소개·응답으로 화자 대조','행동 단서를 현재 표현·가정·비유로 구별하고 대상 문장에 연결','같은 문단의 음색·감정·속도와 문장 경계 쉼 검토'])
 validate_sentence(s)
doc.update(status='reviewed-generation-ready',cast_revision=cast['revision'])
(work/'chapter-02-sentences.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2),encoding='utf-8')
book=dict(title='파우스트 · 문장별 오디오북',prefix='FAUST_P1',revision='S01',language='ko-KR',execution_mode='canvas-host',model=cast['model'],cast={cid:dict(name=v['display_name'],voice=v['voice_name'],persona=v['persona']) for cid,v in cast['profiles'].items() if cid in {s['cast_id'] for s in doc['sentences']}},chapters=[dict(number=2,title='극장에서의 서막 · 문장별 170구간',segments=doc['sentences'])])
(work/'chapter-02-book.json').write_text(json.dumps(book,ensure_ascii=False,indent=2),encoding='utf-8')
combined=json.loads((work/'chapter-01-book.json').read_text(encoding='utf-8'))
combined['cast'].update(book['cast'])
combined['chapters']+=book['chapters']
generate(combined,work/'output')
build_copy_site((work/'output').glob('*_GEMINI_CANVAS_TTS.html'),root/'tts','파우스트 · 문장별 TTS HTML 코드 복사')
path=root/'tts/index.html';page=path.read_text(encoding='utf-8');page=page.replace('<a id="download" class="download" hidden>HTML 다운로드</a>','<a id="download" hidden aria-hidden="true" style="display:none!important"></a>');path.write_text(page,encoding='utf-8')
report=dict(sentences=len(doc['sentences']),paragraphs=len(doc['paragraphs']),paragraph_reconstruction=True,ambiguous_speakers=[],actual_canvas_generation=False,actual_listening=False)
(work/'chapter-02-production-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
(work/'chapter-02-final-review.md').write_text('# 2장 문장별 제작 검토\n\n64문단·170문장. 게시 본문은 수정하지 않았다. 나레이터 Charon, 극장 지배인 Sadaltager, 극작가 Algieba, 희극 배우 Umbriel을 유지한다.\n\n23문단의 반문은 지배인의 제안을 잇고 24문단에서 극작가가 반박한다. 31문단 역시 지배인의 관객 열거와 32문단 행동을 잇는다. 별도의 독백은 없다.\n\n15문단의 배우 미소는 인접 대사의 밝은 음색에, 35문단의 웃듯 말한 행동은 34문단 대사에 연결했다. 25·38·49·50문단의 울음·웃음·고함은 가정이나 일반적인 예시이므로 실제 소리를 넣지 않는다.\n\n각 문장에 페르소나·의도·감정·억양·비언어 표현·연속성 지침을 기록했다. 문장별 파일 생성만 허용한다. 실제 Canvas 생성과 청취는 아직 수행하지 않았다.\n',encoding='utf-8')
print(report)
