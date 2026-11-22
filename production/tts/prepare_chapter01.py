"""Chapter 1 editorial sentence draft with reversible source offsets."""
from pathlib import Path
import hashlib,json,re
from bs4 import BeautifulSoup
r=Path(__file__).resolve().parents[2];out=Path(__file__).parent
baseline=json.loads((out/'baseline.json').read_text(encoding='utf-8'))
required=['chapter-01.html','voice-cast.json','cleanroom-novel.txt']
for path in required:
 assert hashlib.sha256((r/path).read_bytes()).hexdigest()==baseline['files'][path], 'Baseline changed: '+path
soup=BeautifulSoup((r/'chapter-01.html').read_text(encoding='utf-8'),'html.parser')
cast=json.loads((r/'voice-cast.json').read_text(encoding='utf-8'))
paragraphs=[p for p in soup.select('article .adaptation-prose p, article .adaptation-intro p') if 'voice-label' not in p.get('class',[])]
# Explicitly authored paragraph arcs; individual sentences get their own textual target.
arcs=[
'파우스트 본편 전에 이야기를 오래 품어 온 시인이 등장함을 소개',
'시인이 기억을 붙잡고 다시 쓸 수 있을지 스스로 확인하는 망설임',
'시인 자신의 뜻밖의 설렘에서 끝까지 쓸 수 있을지 묻는 불안으로',
'밀려오는 얼굴들을 억지로 붙잡지 않고 기다리기로 하는 수용',
'젊은 시절 창작의 설렘이 다시 살아남',
'안개 속 현재에서 옛 친구들과 웃던 기억으로 이동',
'첫사랑과 친구들의 얼굴을 더듬되 기억의 빈틈과 가까움을 함께 전달',
'좋았던 기억에서 하지 못한 말과 되살아나는 아픔으로',
'떠난 이들의 이름과 다시 만날 수 없는 빈자리를 천천히 짚음',
'첫 독자였던 친구들이 이제 다음 이야기를 들을 수 없다는 상실',
'과거의 웃음과 질문을 기억하는 회상. 현재의 실제 웃음이 아님',
'낯선 청중의 박수와 옛 친구를 그리워하는 마음의 간극',
'먼저 들어 주었던 사람들이 다시 들어 주길 바라는 시인 자신의 소망',
'살아 있어도 흩어져 다시 모이기 어려운 친구들을 떠올림',
'시끄러운 객석보다 그리운 얼굴들과 조용히 머물고 싶은 마음',
'낮게 읊는 시와 바람 하프의 비유를 차분하게 설명',
'기억과 재회한 시인의 떨림과 눈물을 서술. 나레이터가 대신 울지 않음',
'그리움이 현재를 밀어내고 기억이 가까워지는 마무리'
]
arcs[0]='파우스트 본편 전에 이야기를 오래 품어 온 시인이 등장함을 소개'
assert len(arcs)==len(paragraphs)
records=[];sources=[]
for pi,p in enumerate(paragraphs):
 original=p.get_text(' ',strip=True);inner=p.find_parent('aside',class_='inner-voice')
 cid=inner.get('data-cast') if inner else p.get('data-cast','narrator');kind='monologue' if inner else p.get('data-role','narration')
 assert cid in ('narrator','dedication-poet')
 scene=p.find_parent('section',class_='illustrated-scene')['data-scene'];pid=f'C01-P{pi+1:03}'
 # Explicit Korean prose punctuation only; this chapter has no decimal/abbreviation cases.
 spans=[];start=0
 for m in re.finditer(r'[.!?]+[’”\"]*(?:\s+|$)',original):
  end=m.end();spans.append((start,end));start=end
 if start<len(original):spans.append((start,len(original)))
 assert ''.join(original[a:b] for a,b in spans)==original
 sources.append(dict(paragraph_id=pid,scene_id=scene,text=original,spans=spans))
 for si,(a,b) in enumerate(spans):
  sid=f'{pid}-S{si+1:02}';raw=original[a:b];spoken=raw.strip().lstrip('‘').rstrip('’')
  intent=f'청자에게 다음 내용을 전달: {spoken}' if kind=='narration' else ('다시 쓰고 싶어진 자신에게 놀라며 속으로 인정한다.' if si==0 and pi==2 else '이번에는 끝까지 쓸 수 있을지 자신에게 조심스럽게 묻는다.' if pi==2 else '옛 첫 독자들이 다음 이야기도 들어 주기를 혼자 바란다.')
  design=dict(addressee_intention=intent,outer_inner=arcs[pi],pivot='같은 문단의 '+str(si+1)+'번째 문장. '+('앞 문장의 여운을 이어받는다.' if si else '장면의 감정 출발점을 잡는다.'),prosody='중간 속도, 선명한 자음, 설명 끝은 편안하게 내린다. 질문 서술도 인물의 직접 대사로 전환하지 않는다.' if kind=='narration' else '나직하지만 성대가 울리는 보통 발성. 질문 끝을 과도하게 올리지 않는다. 속삭임·ASMR 금지.',nonverbal='짧은 자연 호흡만. 웃음·울음·기침·고함을 새로 추가하지 않는다.',continuation=arcs[pi]+' 분위기를 유지하고 '+('같은 문단 다음 문장에 과한 종결감을 주지 않는다.' if si<len(spans)-1 else '다음 문단 전환을 위한 여유를 둔다.'))
  records.append(dict(sentence_id=sid,paragraph_id=pid,scene_id=scene,source_span=[a,b],source_slice=raw,text=spoken,cast_id=cid,speaker='시인' if inner else '나레이터',voice=cast['profiles'][cid]['voice_name'],kind=kind,context_before=[],context_after=[],performance=dict(character_persona=cast['profiles'][cid]['persona'],sentence_persona=cast['profiles'][cid]['persona']+' 이 문장에서는 '+arcs[pi],design=design,cue_links=[],audio_effect='echo-v4' if inner else 'dry'),review=dict(attribution='confirmed',classification='confirmed',performance='draft',speaker_pass='confirmed',cue_pass='pending',continuity_pass='pending',evidence=f'{scene}의 '+('aside.inner-voice에 data-speaker=시인/data-cast=dedication-poet가 있고, 앞 문단이 시인의 내적 의문을 설명함.' if inner else '3인칭 행동·심리 또는 비유 설명이다. 인용된 직접 발화가 아니라 독자에게 설명하는 서술.'),sentence_boundary_evidence='원문 문장부호와 닫는 인용부호를 포함한 문자 범위 대조. 분할 조각을 합치면 문단 원문 일치.')))
for i,s in enumerate(records):
 s['context_before']=[x['sentence_id'] for x in records[max(0,i-2):i]];s['context_after']=[x['sentence_id'] for x in records[i+1:i+3]]
cue_report=[]
for s in records:
 if any(w in s['text'] for w in ['웃','눈물','울음','읊','떨렸']):
  why='과거 친구들의 웃음을 회상하는 서술. 현재 나레이터/시인의 웃음 삽입 근거가 아님.' if '웃' in s['text'] else '시인의 현재 행동·상태를 설명하는 나레이션. 인접한 시인의 발화가 없어 임의 대사나 울음 음원을 만들지 않음.'
  cue_report.append(dict(source_sentence_id=s['sentence_id'],text=s['text'],decision=why,target_sentence_id=s['sentence_id']))
  s['performance']['cue_links'].append(dict(source_sentence_id=s['sentence_id'],target_sentence_id=s['sentence_id'],cue_text=s['text'],instruction=why))
doc=dict(chapter=1,baseline_id=baseline['baseline_id'],cast_revision=cast['revision'],status='editorial-draft-not-generation-ready',paragraphs=sources,sentences=records,acting_cue_review=cue_report,ambiguous_speakers=[],actual_audio_generated=False)
(out/'chapter-01-sentences.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2),encoding='utf-8')
md=['# 1장 문장별 제작 대본 · 검토 초안','',f'{len(sources)}문단 → {len(records)}문장. 문단 복원 검사 통과. 새 HTML·음성 생성 전 단계.','화자는 나레이터와 헌시의 시인으로 구별했다. 연기·연속성 재검토가 pending이므로 생성하지 않는다.','']
for s in records:
 md.extend([f"## {s['sentence_id']} · {s['speaker']} · {s['kind']}",s['text'],'',f"- 화자 근거: {s['review']['evidence']}",f"- 문장 페르소나: {s['performance']['sentence_persona']}"]+[f'- {k}: {v}' for k,v in s['performance']['design'].items()]+[''])
md+=['## 웃음·눈물·읊조림 근거 대조','']+[f"- {x['source_sentence_id']}: {x['decision']}" for x in cue_report]
(out/'chapter-01-sentences-review.md').write_text('\n'.join(md),encoding='utf-8')
print(f'PASS: baseline source/cast;{len(sources)} paragraph reconstruction;{len(records)} sentence drafts;{len(cue_report)} acting cue checks; generation blocked pending acting/continuity review')
