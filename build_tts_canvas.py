from pathlib import Path
import re,json,csv,hashlib
from bs4 import BeautifulSoup
root=Path(__file__).parent;out=root/'tts-canvas';out.mkdir(exist_ok=True)
template=(root/'gemini_tts.html').read_text(encoding='utf-8');allindex=[]
cast=json.loads((root/'voice-cast.json').read_text(encoding='utf-8'));profiles=cast['profiles'];model=cast['model'];cast_hash=hashlib.sha256(json.dumps(cast,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
voice_names={name:profiles[id]['voice_name'] for name,id in cast['aliases'].items()}
chapters_to_build=range(1,len(json.loads((root/"dialogue-cast-revision-audit.json").read_text(encoding="utf-8"))["chapters"])+1)
for ch in chapters_to_build:
 soup=BeautifulSoup((root/f'chapter-{ch:02}.html').read_text(encoding='utf-8'),'html.parser');units=[]
 adaptation=json.loads((root/f'adaptations/chapter-{ch:02}.json').read_text(encoding='utf-8'))
 for section in soup.select('article .adaptation-intro, article .adaptation-prose'):
  parent=section.find_parent('section',class_='illustrated-scene');sid=parent.get('data-scene') if parent else f'c{ch:02}-intro'
  for paragraph in section.find_all('p'):
   if 'voice-label' in paragraph.get('class',[]):continue
   inner=paragraph.find_parent('aside',class_='inner-voice');role='monologue' if inner else paragraph.get('data-role','narration')
   speaker=(inner.get('data-speaker') or inner.select_one('.voice-label').get_text().split(':',1)[1].rstrip(']').strip()) if inner else paragraph.get('data-speaker','나레이터')
   cid=(inner.get('data-cast') or cast['chapter_alias_overrides'].get(str(ch),{}).get(speaker) or cast['aliases'][speaker]) if inner else paragraph.get('data-cast','narrator')
   profile=profiles[cid];text=paragraph.get_text(' ',strip=True).strip('‘’“”')
   if not text:continue
   assert role in ('narration','dialogue','monologue') and profile['mode']!='non_speaking',(sid,cid,role)
   idx=len(units);voice=profile['voice_name'];code=cid.upper().replace('CHARACTER-','C').replace('-','_')
   filename=f'FAUST_C{ch:02}_V04_{idx:04}_{sid}_{code}.wav'
   stage=('old-scholar' if ch<=8 or ch==9 and int(sid[-3:])<42 else 'rejuvenated') if cid=='character-010' else 'same identity'
   stage='回春前の老学者'.replace('old-scholar','회춘 전 노학자: 지치고 약간 느린 호흡, 목을 긁는 노인 흉내 금지') if stage=='回春前の老学者' else '회춘 후: 생기와 속도만 늘리고 같은 음색 유지' if stage=='rejuvenated' else stage
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
 s=re.sub(r'const originalEpisode = .*?;\s*const originalStory =',lambda m:'const originalEpisode = '+json.dumps(episode,ensure_ascii=False)+';\n        const originalStory =',template,flags=re.S)
 a=s.index('        function parseTurns(');b=s.index("        processBtn.addEventListener",a)
 s=s[:a]+'''        function parseTurns(text) {
            const episode=JSON.parse(text);return episode.scenes.flatMap(scene=>scene.segments.map(segment=>({...segment,phase:scene.title,sceneId:segment.scene_id})));
        }
        function makePrompt(index) {
            const turn=turns[index],p=turn.performance;
            return `한국어 드라마 오디오북. 중학생 청자에게 친절하고 선명한 낭독. 화자: ${turn.speaker}. 목소리 정체성 고정. 전화 효과 없음.
고정 음색: ${turn.voice}; 배역 ID: ${turn.cast_id}; 발화 종류: ${turn.kind}.
배역 페르소나: ${p.character_persona}
현재 인물 상태: ${p.character_state}
감정: ${p.emotion}; 강도 ${p.intensity}; 속도 ${p.pace}; 발성 ${p.delivery}.
마이크 거리와 친밀감: ${p.mic_direction}
연기: ${p.acting_notes}
비언어 연기: ${p.nonverbal}
기침/과잉 연기: ${p.cough_rule}
앞 구간(읽지 않음): ${turns[index-1]?.text||'시작'}
뒤 구간(읽지 않음): ${turns[index+1]?.text||'끝'}
화자명, 괄호 지시, 메타데이터를 읽지 않는다. 본문의 단어를 추가하거나 생략하지 않는다. 비언어음은 단어가 아닌 짧은 실제 연기로만, 필요할 때만. 배경음악과 환경 효과음은 넣지 않는다. 끝 쉼 ${p.pause_after_ms}ms는 후처리한다.
낭독 본문:\n${turn.text}`;
        }
''' +s[b:]
 s=s.replace("turn.speaker==='원장'","false").replace("turns[index].speaker==='원장'","false").replace("turns[index].speaker === '원장' ? voiceSelect.value : hostVoiceSelect.value","turns[index].voice || hostVoiceSelect.value").replace("turns[index].speaker === '원장' ? voiceSelect.value : hostVoiceSelect.value","turns[index].voice || hostVoiceSelect.value")
 s=s.replace("const voice = false ? voiceSelect.value : hostVoiceSelect.value;","const voice = currentVoice(index);")
 s=s.replace("return false ? voiceSelect.value : hostVoiceSelect.value;","if (!turns[index].voice) throw new Error('배역 음성 누락'); return turns[index].voice;")
 s=s.replace("`${String(index).padStart(3,'0')}.wav`","turn.filename")
 s=s.replace("${String(index).padStart(3,'0')}.wav","${turn.filename}")
 s=s.replace("'치과_뒷방의_AI_EP01_전체.mp3'",f"'FAUST_C{ch:02}_V04_FULL.mp3'")
 s=s.replace("'TTS_재다운로드_목록.json'",f"'FAUST_C{ch:02}_V04_RETRY.json'")
 s=s.replace('치과 뒷방의 AI · EP.01',f'파우스트 · {ch}장 · 드라마 TTS').replace('원장: 전화 음질 · 진행자: 스튜디오 음질 · 문장별 WAV 다운로드','나레이션·인물 대사·독백 · 고정 배역표와 구간별 연기 지침 · 고유 파일명 WAV 다운로드').replace('치과의사가 컴퓨터를 열두 대나 산 이유<br>원문 게시글을 기반으로 각색한 가상 전화 인터뷰이며 실제 통화 녹음이 아닙니다.','새로 쓴 한국어 웹소설만 포함 · 독일어 원문과 대응 번역 제외').replace('인터뷰 대본 · JSON 감정 지시 포함','웹소설 대본 · 감정·호흡·연기 지시 포함').replace('원장 · 전화','인물 기본값').replace('진행자 · 스튜디오','나레이터 기본값')
 s=s.replace('000.wav부터 대본 마지막 번호까지','장별 색인에 지정된 WAV 파일명으로').replace('000.wav → 001.wav',f'FAUST_C{ch:02}_V04_0000… → 순번 순서')
 s=s.replace("${completed+1} / ${targets.length} · ${turn.filename}","${completed+1} / ${targets.length} · ${turns[index].filename}")
 s=s.replace("stats.textContent = `${turns.length}개 구간 · 원장 ${turns.filter(t=>t.speaker==='원장').length} / 진행자 ${turns.filter(t=>t.speaker==='진행자').length}`;", "stats.textContent = `${turns.length}개 구간 · 화자 ${new Set(turns.map(t=>t.speaker)).size}명`;" )
 s=s.replace("읽을 인터뷰 대본이 없습니다.","읽을 웹소설 대본이 없습니다.")
 s=s.replace("download.download = turn.filename;", "download.download = turn.filename; download.target = '_blank'; download.rel = 'noopener';")
 s=s.replace("} else download.click();", "} else { download.click(); status.textContent = '다운로드 요청 · 저장되지 않으면 WAV 저장을 직접 누르세요'; }")
 s=s.replace("<p class=\"text-xs text-gray-500\">다운로드 요청 완료", "<p class=\"text-xs text-gray-500\">Canvas에서 자동 저장이 막히면 각 카드의 WAV 저장을 직접 누르세요. 생성 자체가 실패하면 오류 메시지를 확인하세요. 다운로드 요청 완료")
 s=re.sub(r'gemini-[a-zA-Z0-9.\-]+preview-tts',model,s)
 # Apply the approved monologue effect before caching WAV or merging MP3.
 s=s.replace('async function generateTTS(text, voiceName, phone = false, pauseMs = 0)', 'async function generateTTS(text, voiceName, phone = false, pauseMs = 0, innerVoice = false)')
 s=s.replace('voice,false,turn.performance.pause_after_ms)',"voice,false,turn.performance.pause_after_ms,turn.kind==='monologue')")
 s=s.replace('const outputData = phone ? await telephoneFilter(resampledData, 44100) : resampledData;', 'const outputData = innerVoice ? faustProcess(resampledData,44100,FAUST_EFFECTS.echo) : resampledData;')
 s=s.replace("format:'44100-mono-16bit-phone-v1'","format:'44100-mono-16bit-short-echo-v4',effect:turns[index].kind==='monologue'?'echo-v4':'dry'")
 s=s.replace('const apiKey',(root/'tts-effects.js').read_text(encoding='utf-8')+'\nconst apiKey',1)
 s=s.replace('나레이션·인물 대사·독백 · 고정 배역표와 구간별 연기 지침','독백: 불안한 독백 · 짧은 에코 후처리 · 나레이션: 원음 · 구간별 연기 지침')
 for unit in units:
  unit['performance']['audio_effect']='echo-v4' if unit['kind']=='monologue' else 'dry'
 s=re.sub(r'const originalEpisode = .*?;\s*const originalStory =',lambda m:'const originalEpisode = '+json.dumps(episode,ensure_ascii=False)+';\n        const originalStory =',s,flags=re.S)
 s=s.replace("function currentVoice(index) { return turns[index].voice || hostVoiceSelect.value; }", "function currentVoice(index) { const t=turns[index]; if(!t?.voice) throw new Error('배역 음성 누락'); return t.voice; }")
 s=s.replace("${turn.speaker==='원장'?'전화 음질':'스튜디오 음질'}", "${turn.kind==='monologue'?'독백 · 짧은 에코':turn.kind==='dialogue'?'대사 · 원음':'나레이션 · 원음'}")
 s=s.replace('고정 음색: ${turn.voice};', '모델: ${turn.model}; 배역표 지문: ${turn.cast_sha256}; 고정 음색: ${turn.voice};')
 (out/f'FAUST_C{ch:02}_V04_GEMINI_CANVAS_TTS.html').write_text(s,encoding='utf-8');(out/f'FAUST_C{ch:02}_V04_SCRIPT.json').write_text(json.dumps(episode,ensure_ascii=False,indent=2),encoding='utf-8')
 js=next(x for x in re.findall(r'<script[^>]*>(.*?)</script>',s,re.S) if 'const FAUST_EFFECTS' in x);(out/f'check-v04-{ch:02}.js').write_text(js,encoding='utf-8')
(out/'FAUST_AUDIO_INDEX_V04.json').write_text(json.dumps({'schema':'faust-audio-index-1','revision':'V04','segments':allindex,'full_mp3':[f'FAUST_C{ch:02}_V04_FULL.mp3' for ch in chapters_to_build],'future_target':'audio/chapter-NN/','source':'Published adaptation prose only; source/translation excluded'},ensure_ascii=False,indent=2),encoding='utf-8')
with (out/'FAUST_AUDIO_INDEX_V04.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(allindex[0]));w.writeheader();w.writerows(allindex)
assert len({e['filename'] for e in allindex})==len(allindex)
print('Generated',len(chapters_to_build),'Canvas HTMLs; indexed segments:',len(allindex))
