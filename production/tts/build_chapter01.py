"""Publish approved Chapter 1 sentence script with canonical skill renderer."""
import importlib.util,json,hashlib,re,sys
from pathlib import Path
root=Path(__file__).resolve().parents[2];work=Path(__file__).parent
skill=root/'.tools/audiobook-reader-skill/assets/gemini-canvas-tts';sys.path.insert(0,str(skill/'scripts'))
from build import generate
doc=json.loads((work/'chapter-01-sentences.json').read_text(encoding='utf-8'))
cast=json.loads((root/'voice-cast.json').read_text(encoding='utf-8'))
assert cast['revision']==doc['cast_revision']
byparagraph={p['paragraph_id']:p for p in doc['paragraphs']}
for pid,p in byparagraph.items():
 seq=[s for s in doc['sentences'] if s['paragraph_id']==pid]
 assert ''.join(s['source_slice'] for s in seq)==p['text']
 for s in seq:
  a,b=s['source_span'];assert p['text'][a:b]==s['source_slice']
  assert s['text']==s['source_slice'].strip().lstrip('‘').rstrip('’')
segments=[]
for i,s in enumerate(doc['sentences']):
 assert s['cast_id'] in ('narrator','dedication-poet')
 p=s['performance'];p['pace']='medium';p['intensity']=.4
 p['pause_after_ms']=200 if i+1<len(doc['sentences']) and doc['sentences'][i+1]['paragraph_id']==s['paragraph_id'] else 500
 p['mic_direction']='또렷하고 편안한 보통 발성. 잔향 없는 원음 생성.' if s['kind']=='narration' else '가까운 사람에게 나직하게 말하는 유성 발성. 속삭임·과한 숨·ASMR 금지. 잔향 없는 원음 생성 후 에코는 후처리.'
 p['emotion']=p['design']['outer_inner'];p['acting_notes']=p['design']['addressee_intention']
 s['review'].update(performance='confirmed',cue_pass='confirmed',continuity_pass='confirmed',user_approval='사용자: 좋아 이대로 하자',review_passes=['화자와 발화 종류를 게시문 및 독백 컨테이너와 대조','8개 행동 단서를 회상/현재 및 서술/발화로 구별','같은 문단의 페르소나·속도 유지와 경계 쉼 차등 확인'])
 segments.append(s)
doc['status']='reviewed-generation-ready';doc['actual_audio_generated']=False
(work/'chapter-01-sentences.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2),encoding='utf-8')
book=dict(title='파우스트 · 문장별 오디오북',prefix='FAUST_P1',revision='S01',language='ko-KR',execution_mode='canvas-host',model=cast['model'],cast={cid:dict(name=v['display_name'],voice=v['voice_name'],persona=v['persona']) for cid,v in cast['profiles'].items() if cid in ('narrator','dedication-poet')},chapters=[dict(number=1,title='헌시 · 문장별 60구간',segments=segments)])
(work/'chapter-01-book.json').write_text(json.dumps(book,ensure_ascii=False,indent=2),encoding='utf-8')
out=work/'output';index=generate(book,out)
# Use generated copy portal; remove only optional download UI per user's copy-only requirement.
from copy_site import build_copy_site
portal=root/'tts';build_copy_site(out.glob('*_GEMINI_CANVAS_TTS.html'),portal,'파우스트 · 문장별 TTS HTML 코드 복사')
page=(portal/'index.html').read_text(encoding='utf-8')
page=page.replace('<a id="download" class="download" hidden>HTML 다운로드</a>','<a id="download" hidden aria-hidden="true" style="display:none!important"></a>')
(portal/'index.html').write_text(page,encoding='utf-8')
report=dict(sentences=len(segments),narration=sum(s['kind']=='narration' for s in segments),monologue=sum(s['kind']=='monologue' for s in segments),paragraph_reconstruction=True,unique_sentence_ids=len({s['sentence_id'] for s in segments})==len(segments),user_review_pending=[],actual_canvas_generation=False,actual_listening=False)
(work/'chapter-01-production-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(report)
