"""Extract reversible sentence draft; never auto-approve attribution or acting."""
from pathlib import Path
import hashlib,json,re
from bs4 import BeautifulSoup
r=Path(__file__).resolve().parents[2];w=Path(__file__).parent
base=json.loads((w/'baseline.json').read_text(encoding='utf-8'));cast=json.loads((r/'voice-cast.json').read_text(encoding='utf-8'))
assert hashlib.sha256((r/'chapter-02.html').read_bytes()).hexdigest()==base['files']['chapter-02.html']
soup=BeautifulSoup((r/'chapter-02.html').read_text(encoding='utf-8'),'html.parser')
segments=[];paragraphs=[];cues=[]
for i,p in enumerate(soup.select('article .adaptation-prose p,article .adaptation-intro p')):
 if 'voice-label' in p.get('class',[]):continue
 raw=p.get_text(' ',strip=True);pid=f'C02-P{len(paragraphs)+1:03}';inner=p.find_parent('aside',class_='inner-voice');scene=p.find_parent('section',class_='illustrated-scene');cid=inner.get('data-cast') if inner else p.get('data-cast');kind='monologue' if inner else p.get('data-role','narration')
 spans=[];start=0
 for m in re.finditer(r'[.!?]+[’”\"]*(?:\s+|$)',raw):spans.append((start,m.end()));start=m.end()
 if start<len(raw):spans.append((start,len(raw)))
 assert ''.join(raw[a:b] for a,b in spans)==raw
 paragraphs.append(dict(paragraph_id=pid,text=raw,scene_id=scene.get('data-scene') if scene else 'c02-intro'))
 for j,(a,b) in enumerate(spans):
  sid=f'{pid}-S{j+1:02}';s=dict(sentence_id=sid,paragraph_id=pid,scene_id=paragraphs[-1]['scene_id'],source_span=[a,b],source_slice=raw[a:b],text=raw[a:b].strip().strip('‘’“”'),declared_cast_id=cid,declared_kind=kind,context_before=[],context_after=[],persona_reference=cast['profiles'].get(cid,{}).get('persona'),voice_reference=cast['profiles'].get(cid,{}).get('voice_name'),review=dict(attribution='pending',classification='pending',performance='pending',speaker_pass='pending',cue_pass='pending',continuity_pass='pending'),status='editorial-review-required');segments.append(s)
  if re.search('웃|울|외치|소리|속삭|말했|물었|대답|고개|한숨|숨을',s['text']):cues.append(dict(source_sentence_id=sid,text=s['text'],target_sentence_ids=[],status='Determine actor/time/target before applying'))
for i,s in enumerate(segments):s['context_before']=[x['sentence_id'] for x in segments[max(0,i-2):i]];s['context_after']=[x['sentence_id'] for x in segments[i+1:i+3]]
doc=dict(chapter=2,status='draft-generation-blocked',paragraphs=paragraphs,sentences=segments,cue_candidates=cues,actual_audio_generated=False)
(w/'chapter-02-sentences.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2),encoding='utf-8')
md=['# 2장 문장별 화자·연기 검토 초안','',f'{len(paragraphs)}문단 → {len(segments)}문장. 본문 복원 일치. 기존 DOM의 화자 정보는 후보이며 검토 확정이 아니다.','모든 문장은 화자·연기·연속성 검토 전이므로 생성 차단.','']
for s in segments:md.extend([f"## {s['sentence_id']} · 기존 표시: {s['declared_cast_id']} / {s['declared_kind']}",s['text'],'',f"- 앞 문장: {', '.join(s['context_before'])}",f"- 뒤 문장: {', '.join(s['context_after'])}",'- 검토: 화자·발화 종류·연기 단서 대상·문단 분위기 확인 필요',''])
md+=['## 연기 단서 후보','']+[f"- {x['source_sentence_id']}: {x['text']}" for x in cues]
(w/'chapter-02-sentences-review.md').write_text('\n'.join(md),encoding='utf-8')
print(f'PASS: {len(paragraphs)} paragraphs reconstructed; {len(segments)} unique sentence drafts; {len(cues)} cue candidates; all generation blocked')
