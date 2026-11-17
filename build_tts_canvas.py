from pathlib import Path
import re,json,csv,hashlib
from bs4 import BeautifulSoup
root=Path(__file__).parent;out=root/'tts-canvas';out.mkdir(exist_ok=True);template=(root/'gemini_tts.html').read_text(encoding='utf-8');allindex=[]
voice_names={'나레이터':'Charon','시인':'Charon','지배인':'Orus','희극 배우':'Puck','라파엘':'Sulafat','가브리엘':'Kore','미카엘':'Orus','메피스토펠레스':'Fenrir'}
voice_codes={'나레이터':'NAR','시인':'POET','지배인':'DIR','희극 배우':'COM','라파엘':'RAP','가브리엘':'GAB','미카엘':'MIC','메피스토펠레스':'MEP'}
voice_names.update({'파우스트':'Orus','바그너':'Puck'})
voice_codes.update({'파우스트':'FAU','바그너':'WAG'})
crowd_voices={'직공 청년':('Puck','ART'),'세 번째 직공 청년':('Puck','ART3'),'다섯 번째 직공 청년':('Orus','ART5'),'첫 번째 하녀':('Kore','MAID1'),'다른 하녀':('Sulafat','MAID2'),'시민의 딸':('Kore','DAU'),'두 번째 학생':('Puck','STU2'),'첫 번째 학생':('Fenrir','STU1'),'첫 번째 시민':('Orus','CIT1'),'거지':('Charon','BEG'),'두 번째 시민':('Fenrir','CIT2'),'세 번째 시민':('Orus','CIT3'),'노파':('Sulafat','OLDW'),'아가테':('Kore','AGA'),'군인':('Fenrir','SOL'),'목동':('Puck','SHEP'),'춤추는 사람':('Puck','DAN'),'춤추는 아가씨':('Kore','DANW'),'늙은 농부':('Charon','FARM')}
voice_names.update({k:v[0] for k,v in crowd_voices.items()});voice_codes.update({k:v[1] for k,v in crowd_voices.items()})
voice_names.update({'학생':'Puck'});voice_codes.update({'학생':'STU7'})
chapters_to_build=[1,2,3,4,5,6,7,8,9,10,11]
for ch in chapters_to_build:
 if ch==8:
  voice_names.update({'프로슈':'Puck','브란더':'Fenrir','지벨':'Orus','알트마이어':'Charon'})
  voice_codes.update({'프로슈':'FRO','브란더':'BRA','지벨':'SIE','알트마이어':'ALT'})
 soup=BeautifulSoup((root/f'chapter-{ch:02}.html').read_text(encoding='utf-8'),'html.parser');units=[]
 if ch==9:
  voice_names.update({'수컷 원숭이':'Puck','암컷 원숭이':'Kore','마녀':'Sulafat'})
  voice_codes.update({'수컷 원숭이':'MONM','암컷 원숭이':'MONF','마녀':'WITCH'})
 if ch==10:
  voice_names.update({'그레트헨':'Kore'});voice_codes.update({'그레트헨':'GRE'})
 for section in soup.select('article .adaptation-intro, article .adaptation-prose'):
  parent=section.find_parent('section',class_='illustrated-scene');sid=parent.get('data-scene') if parent else f'c{ch:02}-intro';parts=[]
  for p in section.find_all('p'):
   if 'voice-label' in p.get('class',[]):continue
   inner=p.find_parent('aside',class_='inner-voice');speaker='나레이터'
   if inner:
    label=inner.select_one('.voice-label').get_text();speaker=label.split(':',1)[1].rstrip(']').strip()
   text=p.get_text(' ',strip=True)
   if text:parts.append((speaker,text.strip('‘’')))
  for speaker,text in parts:
   idx=len(units);sad=any(w in text for w in ['눈물','슬픔','잃','그리','이별','빈자리']);tense=any(w in text for w in ['거절','분노','내기','유혹','단호','괴로']);warm=any(w in text for w in ['웃','즐거','기쁘','희망'])
   emotion='상실과 그리움, 절제된 울먹임' if sad else '긴장과 확신, 속에 감춘 불안' if tense else '따뜻한 미소와 기대' if warm else '차분한 호기심과 사려 깊음'
   nonverbal='문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.'
   if speaker!='나레이터':
    if sad:nonverbal='첫마디 전 숨을 삼킨다. 목 끝의 가벼운 떨림과 필요시 한 번의 작은 훌쩍임. 통곡하지 않는다.'
    elif speaker=='메피스토펠레스':nonverbal='한 번의 낮고 짧은 숨 섞인 웃음. 정중한 말투 아래 장난기. 매 문장 반복 금지.'
    elif warm:nonverbal='입가의 미소가 들리는 밝은 호흡. 필요시 짧은 작은 웃음 한 번.'
   filename=f'FAUST_C{ch:02}_V04_{idx:04}_{sid}_{voice_codes.get(speaker,"CHAR")}.wav'
   seg={'id':f'C{ch:02}_{idx:04}','speaker':speaker,'text':text,'scene_id':sid,'filename':filename,'voice':voice_names.get(speaker,'Charon'),'performance':{'emotion':emotion,'intensity':0.65 if speaker!='나레이터' else 0.4,'pace':'slow' if sad else 'medium','delivery':'inner_close' if speaker!='나레이터' else 'warm_storytelling','pause_after_ms':650 if sad else 420,'acting_notes':'중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.','nonverbal':nonverbal,'cough_rule':'원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.'}}
   seg['performance']['mic_direction'] = ('가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다.' if speaker!='나레이터' else '편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다.')
   seg['performance']['delivery'] = 'quiet_intimate_natural_voiced_speech' if speaker!='나레이터' else 'warm_storytelling'
   if ch==8:
    scene_number=int(sid[-3:])
    emotion='술자리의 떠들썩함과 짓궂은 장난' if scene_number<=18 else '낯선 상대를 떠보는 호기심과 경계' if scene_number<=28 else '우스운 노래를 듣는 흥과 빈정거림' if scene_number<=33 else '좋은 술에 대한 기대와 의심' if scene_number<=44 else '놀라움과 들뜸, 파우스트의 지루함' if scene_number<=46 else '불에 놀란 공포에서 모욕당한 분노로' if scene_number<=52 else '환상에 사로잡힌 놀라움과 들뜸' if scene_number<=54 else '위험을 깨달은 당황과 떨림' if scene_number<=57 else '분노와 의심, 끝내 풀리지 않는 혼란'
    if speaker=='메피스토펠레스':emotion+='; 메피스토펠레스는 여유와 통제감을 유지하고 큰 소리로 놀라지 않는다'
    if speaker=='파우스트':emotion='지루함과 실망, 자리를 떠나고 싶은 조용한 불편함'
    seg['performance']['emotion']=emotion
    seg['performance']['acting_notes']+=' 노래 내용도 쓰인 본문 그대로 이야기하듯 낭독한다. 가사나 인물 대사를 새로 불러 넣지 않는다. 술 취한 소리로 발음을 뭉개지 않는다. 프로슈는 호기로운 장난기, 브란더는 비꼬는 웃음, 지벨은 성급한 반응, 알트마이어는 느긋한 관찰에서 당황으로 변하는 흐름을 살린다. 독백은 흥분한 장면에도 나직한 유성 발성을 유지한다.'
    seg['performance']['nonverbal']='호흡을 짧게 고른 뒤 발화. 상황에 맞는 작은 웃음 한 번을 허용하되 문장마다 넣지 않는다.' if scene_number<=45 else '놀람에는 짧은 들숨, 분노에는 절제된 날숨, 환상 뒤에는 잠깐 말을 망설이는 쉼. 소리 지르거나 없는 기침·통곡을 추가하지 않는다.'
   if ch==9:
    no=int(sid[-3:])
    seg['performance']['emotion']='불쾌함과 의심, 악마의 여유' if no<=8 else '장난과 엉뚱한 호기심' if no<=16 else '아름다운 환영에 대한 갈망과 초조함' if no<=21 else '갑작스러운 소란과 분노에서 두려움으로' if no<=28 else '정체를 알아본 안도와 빈정거림' if no<=33 else '위험한 약과 의식에 대한 불안, 모순된 주문에 대한 짜증' if no<=41 else '약을 마신 뒤의 기대와 유혹'
    seg['performance']['acting_notes']+=' 마녀는 거칠고 성급하다가 정체를 알아보면 조심스러워진다. 원숭이는 장난기 있으나 짐승 울음으로 본문을 대체하지 않는다. 파우스트의 목소리는 회춘에도 같은 인물의 음색을 유지한다. 주문을 새로 추가하거나 노래 가사를 만들어 부르지 않는다. 독백은 격한 장면에도 나직한 보통 말소리로 유지한다.'
   if ch==10:
    seg['performance']['emotion']='처음 만난 상대에 대한 분명한 경계' if speaker=='그레트헨' else '조급한 관심과 뜻대로 되지 않는 데 대한 짜증' if speaker=='파우스트' else '상대의 조급함을 살피는 냉정한 계산과 빈정거림' if speaker=='메피스토펠레스' else '차분하고 친절한 설명, 거절과 요구의 차이를 명확히 전달'
    seg['performance']['acting_notes']+=' 그레트헨은 수줍은 동의처럼 읽지 않고 정중하면서 분명하게 말한다. 파우스트의 조급함을 다정한 구애로 미화하지 않는다. 음색은 기존 인물과 같다. 독백은 나직한 보통 말소리로, 과한 속삭임과 선정적인 연출을 피한다.'
   if ch==11:
    no=int(sid[-3:])
    seg['performance']['emotion']='첫 만남 뒤의 궁금함' if no==1 else '조용한 방에서 느끼는 감동과 망설임' if no<=6 else '자신의 행동을 돌아보는 부끄러움과 혼란' if no<=10 else '재촉과 유혹, 파우스트의 주저함' if no<=13 else '이유를 모르는 불안에서 노래로 마음을 진정함' if no<=16 else '낯선 상자에 대한 의심과 호기심' if no<=19 else '달라진 모습에 대한 기쁨과 가난에 대한 씁쓸함'
    seg['performance']['acting_notes']+=' 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.'
   units.append(seg);allindex.append({'chapter':ch,'order':idx,'scene_id':sid,'segment_id':seg['id'],'speaker':speaker,'filename':filename,'voice':seg['voice'],'text_sha256':hashlib.sha256(text.encode()).hexdigest(),'text':text})
 assert units, f'Chapter {ch}: completed adaptation prose is required before TTS generation'
 episode={'schema_version':'faust-tts-1.0','chapter':ch,'title':['돌아오지 않는 이들에게','같은 무대, 다른 생각','아직 끝나지 않은 사람','닫힌 방에 돌아온 노래','봄빛 속의 두 마음','푸들 속의 낯선 손님','멈추지 않겠다는 내기','술집에서 벌어진 눈속임','거울 속 모습과 젊음의 약','거리에서 마주친 소녀','방에 남겨진 보석 상자'][ch-1],'language':'ko-KR','revision':'V04','voices':voice_names,'scenes':[{'scene_id':f'C{ch:02}','title':f'파우스트 {ch}장','segments':units}]}
 s=re.sub(r'const originalEpisode = .*?;\s*const originalStory =',lambda m:'const originalEpisode = '+json.dumps(episode,ensure_ascii=False)+';\n        const originalStory =',template,flags=re.S)
 a=s.index('        function parseTurns(');b=s.index("        processBtn.addEventListener",a)
 s=s[:a]+'''        function parseTurns(text) {
            const episode=JSON.parse(text);return episode.scenes.flatMap(scene=>scene.segments.map(segment=>({...segment,phase:scene.title,sceneId:segment.scene_id})));
        }
        function makePrompt(index) {
            const turn=turns[index],p=turn.performance;
            return `한국어 드라마 오디오북. 중학생 청자에게 친절하고 선명한 낭독. 화자: ${turn.speaker}. 목소리 정체성 고정. 전화 효과 없음.
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
 s=s.replace("return false ? voiceSelect.value : hostVoiceSelect.value;","return turns[index].voice || hostVoiceSelect.value;")
 s=s.replace("`${String(index).padStart(3,'0')}.wav`","turn.filename")
 s=s.replace("${String(index).padStart(3,'0')}.wav","${turn.filename}")
 s=s.replace("'치과_뒷방의_AI_EP01_전체.mp3'",f"'FAUST_C{ch:02}_V04_FULL.mp3'")
 s=s.replace("'TTS_재다운로드_목록.json'",f"'FAUST_C{ch:02}_V04_RETRY.json'")
 s=s.replace('치과 뒷방의 AI · EP.01',f'파우스트 · {ch}장 · 드라마 TTS').replace('원장: 전화 음질 · 진행자: 스튜디오 음질 · 문장별 WAV 다운로드','나레이션·인물 독백 · 구간별 연기 지침 · 고유 파일명 WAV 다운로드').replace('치과의사가 컴퓨터를 열두 대나 산 이유<br>원문 게시글을 기반으로 각색한 가상 전화 인터뷰이며 실제 통화 녹음이 아닙니다.','새로 쓴 한국어 웹소설만 포함 · 독일어 원문과 대응 번역 제외').replace('인터뷰 대본 · JSON 감정 지시 포함','웹소설 대본 · 감정·호흡·연기 지시 포함').replace('원장 · 전화','인물 기본값').replace('진행자 · 스튜디오','나레이터 기본값')
 s=s.replace('000.wav부터 대본 마지막 번호까지','장별 색인에 지정된 WAV 파일명으로').replace('000.wav → 001.wav',f'FAUST_C{ch:02}_V04_0000… → 순번 순서')
 s=s.replace("${completed+1} / ${targets.length} · ${turn.filename}","${completed+1} / ${targets.length} · ${turns[index].filename}")
 s=s.replace("stats.textContent = `${turns.length}개 구간 · 원장 ${turns.filter(t=>t.speaker==='원장').length} / 진행자 ${turns.filter(t=>t.speaker==='진행자').length}`;", "stats.textContent = `${turns.length}개 구간 · 화자 ${new Set(turns.map(t=>t.speaker)).size}명`;" )
 s=s.replace("읽을 인터뷰 대본이 없습니다.","읽을 웹소설 대본이 없습니다.")
 s=s.replace("download.download = turn.filename;", "download.download = turn.filename; download.target = '_blank'; download.rel = 'noopener';")
 s=s.replace("} else download.click();", "} else { download.click(); status.textContent = '다운로드 요청 · 저장되지 않으면 WAV 저장을 직접 누르세요'; }")
 s=s.replace("<p class=\"text-xs text-gray-500\">다운로드 요청 완료", "<p class=\"text-xs text-gray-500\">Canvas에서 자동 저장이 막히면 각 카드의 WAV 저장을 직접 누르세요. 생성 자체가 실패하면 오류 메시지를 확인하세요. 다운로드 요청 완료")
 # Apply the approved monologue effect before caching WAV or merging MP3.
 s=s.replace('async function generateTTS(text, voiceName, phone = false, pauseMs = 0)', 'async function generateTTS(text, voiceName, phone = false, pauseMs = 0, innerVoice = false)')
 s=s.replace('voice,false,turn.performance.pause_after_ms)',"voice,false,turn.performance.pause_after_ms,turn.speaker!=='나레이터')")
 s=s.replace('const outputData = phone ? await telephoneFilter(resampledData, 44100) : resampledData;', 'const outputData = innerVoice ? faustProcess(resampledData,44100,FAUST_EFFECTS.echo) : resampledData;')
 s=s.replace("format:'44100-mono-16bit-phone-v1'","format:'44100-mono-16bit-short-echo-v4',effect:turns[index].speaker!=='나레이터'?'echo-v4':'dry'")
 s=s.replace('const apiKey',(root/'tts-effects.js').read_text(encoding='utf-8')+'\nconst apiKey',1)
 s=s.replace('나레이션·인물 독백 · 구간별 연기 지침','독백: 불안한 독백 · 짧은 에코 후처리 · 나레이션: 원음 · 구간별 연기 지침')
 for unit in units:
  unit['performance']['audio_effect']='echo-v4' if unit['speaker']!='나레이터' else 'dry'
  unit['performance']['mic_direction']+=' 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.'
 s=re.sub(r'const originalEpisode = .*?;\s*const originalStory =',lambda m:'const originalEpisode = '+json.dumps(episode,ensure_ascii=False)+';\n        const originalStory =',s,flags=re.S)
 (out/f'FAUST_C{ch:02}_V04_GEMINI_CANVAS_TTS.html').write_text(s,encoding='utf-8');(out/f'FAUST_C{ch:02}_V04_SCRIPT.json').write_text(json.dumps(episode,ensure_ascii=False,indent=2),encoding='utf-8')
 js=next(x for x in re.findall(r'<script[^>]*>(.*?)</script>',s,re.S) if 'const FAUST_EFFECTS' in x);(out/f'check-v04-{ch:02}.js').write_text(js,encoding='utf-8')
(out/'FAUST_AUDIO_INDEX_V04.json').write_text(json.dumps({'schema':'faust-audio-index-1','revision':'V04','segments':allindex,'full_mp3':[f'FAUST_C{ch:02}_V04_FULL.mp3' for ch in chapters_to_build],'future_target':'audio/chapter-NN/','source':'Published adaptation prose only; source/translation excluded'},ensure_ascii=False,indent=2),encoding='utf-8')
with (out/'FAUST_AUDIO_INDEX_V04.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(allindex[0]));w.writeheader();w.writerows(allindex)
assert len({e['filename'] for e in allindex})==len(allindex)
print('Generated',len(chapters_to_build),'Canvas HTMLs; indexed segments:',len(allindex))
