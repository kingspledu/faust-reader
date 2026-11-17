from pathlib import Path
r=Path(__file__).parent;p=r/'build_tts_canvas.py';old=p.read_text(encoding='utf-8')
tail=old[old.index(" s=re.sub(r'const originalEpisode = "):]
head='''from pathlib import Path
import re,json,csv,hashlib
from bs4 import BeautifulSoup
root=Path(__file__).parent;out=root/'tts-canvas';out.mkdir(exist_ok=True)
template=(root/'gemini_tts.html').read_text(encoding='utf-8');allindex=[]
cast=json.loads((root/'voice-cast.json').read_text(encoding='utf-8'));profiles=cast['profiles'];model=cast['model'];cast_hash=hashlib.sha256(json.dumps(cast,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
voice_names={name:profiles[id]['voice_name'] for name,id in cast['aliases'].items()}
chapters_to_build=list(range(1,18))
for ch in chapters_to_build:
 soup=BeautifulSoup((root/f'chapter-{ch:02}.html').read_text(encoding='utf-8'),'html.parser');units=[]
 adaptation=json.loads((root/f'adaptations/chapter-{ch:02}.json').read_text(encoding='utf-8'))
 for section in soup.select('article .adaptation-intro, article .adaptation-prose'):
  parent=section.find_parent('section',class_='illustrated-scene');sid=parent.get('data-scene') if parent else f'c{ch:02}-intro'
  for paragraph in section.find_all('p'):
   if 'voice-label' in paragraph.get('class',[]):continue
   inner=paragraph.find_parent('aside',class_='inner-voice');role='monologue' if inner else paragraph.get('data-role','narration')
   speaker=inner['data-speaker'] if inner else paragraph.get('data-speaker','나레이터')
   cid=inner['data-cast'] if inner else paragraph.get('data-cast','narrator')
   profile=profiles[cid];text=paragraph.get_text(' ',strip=True).strip('‘’“”')
   if not text:continue
   assert role in ('narration','dialogue','monologue') and profile['mode']!='non_speaking',(sid,cid,role)
   idx=len(units);voice=profile['voice_name'];code=cid.upper().replace('CHARACTER-','C').replace('-','_')
   filename=f'FAUST_C{ch:02}_V04_{idx:04}_{sid}_{code}.wav'
   stage=('回春前の老学者' if ch<=8 or ch==9 and int(sid[-3:])<42 else 'rejuvenated') if cid=='character-010' else 'same identity'
   stage='回春前の老学者'.replace('回春前の老学者','회춘 전 노학자: 지치고 약간 느린 호흡, 목을 긁는 노인 흉내 금지') if stage=='回春前の老学者' else '회춘 후: 생기와 속도만 늘리고 같은 음색 유지' if stage=='rejuvenated' else stage
   if role=='monologue':
    mic='가까운 사람에게 속마음을 털어놓듯 나직하게. 성대가 울리는 보통 말소리와 또렷한 자음을 유지한다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. ASMR 입소리·과도한 숨소리 금지. 잔향 없이 생성하고 짧은 에코는 후처리한다.'
    delivery='quiet_intimate_natural_voiced_speech'
   elif role=='dialogue':
    mic='장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.';delivery='natural_character_dialogue'
   else:mic='중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.';delivery='warm_storytelling'
   context='앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.'
   if cid=='character-008':context+=' 파우스트에게 느긋한 반말, 주와 마르테·낯선 사람 앞에서는 공손한 척하는 말투. 상대가 진지할수록 혼자 재미있어하는 온도 차이. 과도한 킬킬거림·특정 배우나 작품의 목소리 모방 금지.'
   performance=dict(emotion='본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음',intensity=.42 if role=='narration' else .55,pace='medium',delivery=delivery,pause_after_ms=450 if role=='narration' else 280 if role=='dialogue' else 500,character_persona=profile['persona'],character_state=stage,acting_notes=context,mic_direction=mic,nonverbal='필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.',cough_rule='원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.',audio_effect='echo-v4' if role=='monologue' else 'dry')
   seg=dict(id=f'C{ch:02}_{idx:04}',speaker=speaker,kind=role,cast_id=cid,text=text,scene_id=sid,filename=filename,voice=voice,model=model,cast_revision=cast['revision'],cast_sha256=cast_hash,performance=performance)
   units.append(seg);allindex.append(dict(chapter=ch,order=idx,scene_id=sid,segment_id=seg['id'],speaker=speaker,kind=role,cast_id=cid,filename=filename,voice=voice,model=model,cast_revision=cast['revision'],text_sha256=hashlib.sha256(text.encode()).hexdigest(),text=text))
 assert units,f'Chapter{ch}: missing adaptation'
 episode=dict(schema_version='faust-tts-2.0',chapter=ch,title=adaptation['title'],language='ko-KR',revision='V04',script_revision='dialogue-cast-v3',model=model,cast_revision=cast['revision'],cast_sha256=cast_hash,voices=voice_names,scenes=[dict(scene_id=f'C{ch:02}',title=f'파우스트 {ch}장',segments=units)])
'''
# 위 상태 문자열은 한국어로만 보관한다.
head=head.replace("('回春前の老学者'", "('old-scholar'").replace("stage='回春前の老学者'.replace('回春前の老学者','회춘 전 노학자: 지치고 약간 느린 호흡, 목을 긁는 노인 흉내 금지') if stage=='回春前の老学者'", "stage='회춘 전 노학자: 지치고 약간 느린 호흡, 목을 긁는 노인 흉내 금지' if stage=='old-scholar'")
tail=tail.replace("turn.speaker!=='나레이터'","turn.kind==='monologue'").replace("turns[index].speaker!=='나레이터'","turns[index].kind==='monologue'").replace("unit['speaker']!='나레이터'","unit['kind']=='monologue'")
tail=tail.replace('감정: ${p.emotion};', '고정 음색: ${turn.voice}; 배역 ID: ${turn.cast_id}; 발화 종류: ${turn.kind}.\n배역 페르소나: ${p.character_persona}\n현재 인물 상태: ${p.character_state}\n감정: ${p.emotion};')
tail=tail.replace("return turns[index].voice || hostVoiceSelect.value;","if (!turns[index].voice) throw new Error('배역 음성 누락'); return turns[index].voice;")
tail=tail.replace("나레이션·인물 독백 · 구간별 연기 지침","나레이션·인물 대사·독백 · 고정 배역표와 구간별 연기 지침")
tail=tail.replace("unit['performance']['mic_direction']+=", "unit['performance']['mic_direction']+=")
tail=tail.replace("for unit in units:\n  unit['performance']['audio_effect']='echo-v4' if unit['kind']=='monologue' else 'dry'\n  unit['performance']['mic_direction']+=' 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.'", "for unit in units:\n  unit['performance']['audio_effect']='echo-v4' if unit['kind']=='monologue' else 'dry'")
# 모델·배역 정보는 프롬프트 지문에 포함되어 이전 음성과 캐시가 섞이지 않는다.
tail=tail.replace(" # Apply the approved monologue effect", " s=re.sub(r'gemini-[a-zA-Z0-9.\\-]+preview-tts',model,s)\n # Apply the approved monologue effect")
p.write_text(head+tail,encoding='utf-8')
print('TTS builder now uses locked cast and narration/dialogue/monologue roles')
