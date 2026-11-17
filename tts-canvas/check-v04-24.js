
        /* Shared, deterministic mono DSP. No network or external dependencies. */
const FAUST_EFFECTS = {
 dry: {label:'원음',wet:0,decay:0,pre:0,hp:0,lp:0,compress:false,delay:0},
 intimate: {label:'가까운 속삭임 보정',wet:0,decay:0,pre:0,hp:85,lp:9000,compress:true,delay:0},
 room: {label:'작은 방 리버브 · 추천',wet:0.20,decay:0.65,pre:25,hp:70,lp:10000,compress:false,delay:0},
 inner: {label:'머릿속 울림',wet:0.30,decay:1.15,pre:40,hp:100,lp:6500,compress:true,delay:0},
 echo: {label:'불안한 독백 · 짧은 에코',wet:0.15,decay:0.55,pre:30,hp:85,lp:7500,compress:false,delay:120},
 dream: {label:'회상 · 긴 잔향',wet:0.35,decay:1.8,pre:55,hp:80,lp:6000,compress:false,delay:0}
};
function faustProcess(input, rate, settings) {
 const p={...settings};
 if (!input.length || !(rate>0)) throw Error('유효한 음성이 필요합니다.');
 for(const x of input) if(!Number.isFinite(x)) throw Error('음성에 잘못된 샘플이 있습니다.');
 if (p.wet===0 && !p.hp && !p.lp && !p.compress && !p.delay) return new Float32Array(input);
 const wet=Math.max(0,Math.min(.6,p.wet||0)), decay=Math.max(.1,Math.min(3,p.decay||.65));
 const tail=wet>0?Math.ceil((decay*1.5+(p.pre||0)/1000)*rate):p.delay?Math.ceil(.5*rate):0;
 const out=new Float32Array(input.length+tail), clean=new Float32Array(out.length);
 const hpA=p.hp?Math.exp(-2*Math.PI*p.hp/rate):0,lpA=p.lp?1-Math.exp(-2*Math.PI*p.lp/rate):1;
 let previous=0,high=0,low=0,env=0;
 for(let i=0;i<input.length;i++) {
  let x=input[i]; if(p.hp){high=hpA*(high+x-previous);previous=x;x=high;}
  low+=lpA*(x-low); x=low;
  if(p.compress){env=Math.max(Math.abs(x),env*.999);if(env>.24)x*=Math.pow(.24/env,.5);x*=1.12;}
  clean[i]=x; out[i]=x;
 }
 if(wet>0) {
  // Parallel damped feedback combs; decay is approximate time to -60 dB.
  const times=[.0297,.0371,.0411,.0437,.0531,.0617,.0713,.0797];
  const pre=Math.round(Math.max(0,Math.min(100,p.pre||0))*rate/1000);
  for(const time of times){
   const len=Math.max(1,Math.round(time*rate)),ring=new Float32Array(len);
   const feedback=Math.pow(.001,time/decay);let pos=0,damp=0;
   for(let i=0;i<out.length;i++){
    const y=ring[pos];damp=.65*y+.35*damp;
    ring[pos]=(i>=pre?clean[i-pre]:0)+feedback*damp;
    out[i]+=wet*y/times.length;pos=(pos+1)%len;
   }
  }
 }
 if(p.delay){const d=Math.round(rate*p.delay/1000);for(let i=d;i<out.length;i++)out[i]+=.15*clean[i-d];}
 // A single global reduction prevents clipping while retaining relative dynamics.
 let peak=0;for(const x of out)peak=Math.max(peak,Math.abs(x));
 if(peak>.97)for(let i=0;i<out.length;i++)out[i]*=.97/peak;
 return out;
}
function faustWav(samples,rate){
 const b=new ArrayBuffer(44+samples.length*2),v=new DataView(b);
 const str=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
 str(0,'RIFF');v.setUint32(4,b.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');
 v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);
 v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++){const x=Math.max(-1,Math.min(1,samples[i]));v.setInt16(44+i*2,x<0?x*32768:x*32767,true);}
 return b;
}

const apiKey = ""; 
        const promptInput = document.getElementById('promptInput');
        const processBtn = document.getElementById('processBtn');
        const batchProcessBtn = document.getElementById('batchProcessBtn');
        const resultsContainer = document.getElementById('resultsContainer');
        const sentenceList = document.getElementById('sentenceList');
        const voiceSelect = document.getElementById('voiceSelect');
        const stats = document.getElementById('stats');
        const batchStatus = document.getElementById('batchStatus');
        const progressBarContainer = document.getElementById('progressBarContainer');
        const progressBar = document.getElementById('progressBar');

        const chooseFolderBtn = document.getElementById('chooseFolderBtn');
        const verifyFolderBtn = document.getElementById('verifyFolderBtn');
        const folderStatus = document.getElementById('folderStatus');
        let retrySelection = null;
        const retryReportStatus = document.getElementById('retryReportStatus');
        let readOnlyFolder = false;
        let directoryHandle = null;
        let folderChecking = false;
        let mergingAudio = false;
        let fileEntries = [];
        let currentLines = [];
        let downloadStates = [];
        let sentenceHandlers = []; // 개별 처리 함수 저장

        // --- Audio Processing Helpers ---

        // Convert PCM L16 to Float32 for resampling
        function l16ToFloat32(uint8Array) {
            const int16Array = new Int16Array(uint8Array.buffer);
            const float32Array = new Float32Array(int16Array.length);
            for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
            }
            return float32Array;
        }

        // Resample Audio using OfflineAudioContext
        async function resampleAudio(floatData, fromRate, toRate) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const tempCtx = new AudioContextClass();
            const buffer = tempCtx.createBuffer(1, floatData.length, fromRate);
            buffer.copyToChannel(floatData, 0);

            await tempCtx.close();
            const offlineCtx = new OfflineAudioContext(1, Math.ceil((buffer.length / fromRate) * toRate), toRate);
            const source = offlineCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(offlineCtx.destination);
            source.start(0);

            const resampledBuffer = await offlineCtx.startRendering();
            return resampledBuffer.getChannelData(0);
        }

        // Create 16-bit PCM WAV from Float32 data
        function float32ToWav(floatData, sampleRate) {
            const bufferArray = new ArrayBuffer(44 + floatData.length * 2);
            const view = new DataView(bufferArray);

            const writeString = (offset, string) => {
                for (let i = 0; i < string.length; i++) {
                    view.setUint8(offset + i, string.charCodeAt(i));
                }
            };

            // RIFF Header
            writeString(0, 'RIFF');
            view.setUint32(4, 36 + floatData.length * 2, true);
            writeString(8, 'WAVE');
            writeString(12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true); // PCM format
            view.setUint16(22, 1, true); // Mono
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, sampleRate * 2, true); // Byte rate
            view.setUint16(32, 2, true); // Block align
            view.setUint16(34, 16, true); // Bits per sample
            writeString(36, 'data');
            view.setUint32(40, floatData.length * 2, true);

            // PCM Data
            let offset = 44;
            for (let i = 0; i < floatData.length; i++) {
                let s = Math.max(-1, Math.min(1, floatData[i]));
                view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                offset += 2;
            }

            return new Blob([view], { type: 'audio/wav' });
        }

        async function generateTTS(text, voiceName, phone = false, pauseMs = 0, innerVoice = false) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
            
            const payload = {
                contents: [{ parts: [{ text: text }] }],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: voiceName
                            }
                        }
                    }
                },
                model: "gemini-2.5-flash-preview-tts"
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || "음성 생성 실패");
            }

            const data = await response.json();
            const inlineData = data.candidates?.[0]?.content?.parts?.find(part => part.inlineData)?.inlineData;
            
            if (!inlineData) throw new Error("데이터를 받지 못했습니다.");

            const rawData = atob(inlineData.data);
            const uint8Array = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; i++) {
                uint8Array[i] = rawData.charCodeAt(i);
            }

            // Extract original rate from mimeType
            const sampleRateMatch = inlineData.mimeType.match(/rate=(\d+)/);
            const originalRate = sampleRateMatch ? parseInt(sampleRateMatch[1]) : 24000;

            // Step 1: Convert to Float32
            const float32Data = l16ToFloat32(uint8Array);
            
            // Step 2: Resample to 44100Hz
            const resampledData = await resampleAudio(float32Data, originalRate, 44100);

            // Step 3: Create WAV blob
            const outputData = innerVoice ? faustProcess(resampledData,44100,FAUST_EFFECTS.echo) : resampledData;
            const wavBlob = float32ToWav(appendPause(outputData, 44100, pauseMs), 44100);
            return URL.createObjectURL(wavBlob);
        }

        function showMessage(msg) {
            document.getElementById('errorMessage').innerText = msg;
            document.getElementById('errorModal').classList.remove('hidden');
        }


        const originalEpisode = {"schema_version": "faust-tts-2.0", "chapter": 24, "title": "발푸르기스의 밤", "language": "ko-KR", "revision": "V04", "script_revision": "dialogue-cast-v3", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "voices": {"나레이터": "Charon", "시인": "Algieba", "지배인": "Rasalgethi", "희극 배우": "Puck", "라파엘": "Iapetus", "가브리엘": "Erinome", "미카엘": "Alnilam", "메피스토": "Fenrir", "메피스토펠레스": "Fenrir", "주": "Sadaltager", "하느님": "Sadaltager", "파우스트": "Orus", "지령": "Alnilam", "바그너": "Achird", "천사들의 합창": "Vindemiatrix", "여인들의 합창": "Sulafat", "제자들의 합창": "Gacrux", "직공 청년": "Puck", "두 번째 직공 청년": "Achird", "세 번째 직공 청년": "Zubenelgenubi", "네 번째 직공 청년": "Iapetus", "다섯 번째 직공 청년": "Orus", "다른 하녀": "Laomedeia", "첫 번째 하녀": "Kore", "시민의 딸": "Autonoe", "두 번째 학생": "Achird", "첫 번째 학생": "Fenrir", "첫 번째 시민": "Rasalgethi", "거지": "Achernar", "두 번째 시민": "Schedar", "세 번째 시민": "Alnilam", "노파": "Gacrux", "아가테": "Laomedeia", "군인": "Alnilam", "늙은 농부": "Gacrux", "정령들": "Callirrhoe", "정령들의 합창": "Vindemiatrix", "학생": "Leda", "프로슈": "Puck", "브란더": "Rasalgethi", "지벨": "Algenib", "알트마이어": "Schedar", "수컷 원숭이": "Puck", "마녀": "Gacrux", "그레첸": "Leda", "그레트헨": "Leda", "마르가레테": "Leda", "마르테": "Sulafat", "암컷 원숭이": "Laomedeia", "목동": "Achird", "춤추는 사람": "Achird", "춤추는 아가씨": "Aoede", "극장 지배인": "Rasalgethi", "극작가 / 시인": "Algieba", "대천사 라파엘": "Iapetus", "대천사 가브리엘": "Erinome", "대천사 미카엘": "Alnilam", "세 대천사의 공동 발화": "Iapetus", "주 / 하느님": "Sadaltager", "지령 · 대지의 정령": "Alnilam", "직공 청년들": "Puck", "다른 이 / 다른 무리 · 문맥별 상이": "Achird", "첫 번째 무리": "Puck", "첫 직공 청년": "Puck", "두 번째 무리": "Sadachbia", "하녀": "Laomedeia", "시민 집안의 처녀": "Autonoe", "늙은 여자": "Gacrux", "또 다른 시민 처녀 · 아가테로 불림": "Laomedeia", "군인들": "Alnilam", "모두 함께": "Achird", "술집 손님들의 합창": "Puck", "마녀 부엌의 동물들": "Sadachbia", "수컷 원숭이 · Kater 표기": "Puck", "수컷·암컷 원숭이 공동 발화": "Sadachbia", "마르가레테 / 그레첸": "Leda", "마르테 슈베르트라인": "Sulafat", "리스헨": "Laomedeia", "발렌틴": "Alnilam", "민중 / 군중": "Achird", "악령": "Algenib", "합창": "Rasalgethi", "도깨비불 · 산길 안내자": "Sadachbia", "파우스트·메피스토·도깨비불 공동 발화": "Orus", "마녀들": "Gacrux", "목소리": "Iapetus", "마녀 합창": "Autonoe", "마법사들 · 반쪽 합창": "Algenib", "나머지 반쪽 합창": "Laomedeia", "여러 목소리": "Sadachbia", "두 합창단 함께": "Alnilam", "반쪽 마녀": "Zephyr", "마녀들의 합창": "Autonoe", "장군": "Alnilam", "대신": "Sadaltager", "벼락출세자": "Pulcherrima", "작가": "Algieba", "잡동사니 파는 마녀": "Gacrux", "젊고 아름다운 춤 상대": "Aoede", "늙은 춤 상대": "Gacrux", "프로크토판타스미스트 · 유령 비판자": "Sadaltager", "세르비빌리스 · 공연 안내자": "Achird", "극장 감독": "Rasalgethi", "전령": "Iapetus", "오베론": "Orus", "퍽": "Puck", "아리엘": "Aoede", "티타니아": "Kore", "오케스트라 총주": "Rasalgethi", "독주 / 독창": "Erinome", "형성되고 있는 정령": "Zephyr", "한 쌍의 연인": "Leda", "호기심 많은 여행자": "Achird", "정통주의자": "Alnilam", "북방 예술가": "Algieba", "순수주의자": "Erinome", "젊은 마녀": "Laomedeia", "나이 든 부인": "Gacrux", "악장": "Schedar", "풍향계 · 변덕의 의인화": "Zubenelgenubi", "크세니엔 · 풍자시들의 의인화": "Iapetus", "헤닝스 · 풍자극 배역": "Rasalgethi", "무사게트 · 뮤즈의 인도자": "Algieba", "한때 시대의 천재였던 자": "Sadaltager", "두루미": "Iapetus", "세속의 자식": "Zubenelgenubi", "무용수": "Aoede", "무용 교사": "Kore", "바이올린 연주자": "Erinome", "독단주의자": "Alnilam", "관념론자": "Algieba", "실재론자": "Orus", "초자연주의자": "Vindemiatrix", "회의론자": "Schedar", "재주 좋은 무리": "Sadachbia", "서투른 무리": "Zubenelgenubi", "도깨비불들": "Zephyr", "별똥별": "Autonoe", "육중한 무리": "Algenib", "오케스트라": "Schedar", "릴리트 · Lilith": "Despina", "그레첸의 환영": "Leda", "검은 푸들": "Fenrir", "암컷 원숭이와 새끼들 · Kätzin / Junge": "Laomedeia", "천상의 군대 · himmlische Heerscharen": "Vindemiatrix", "성문 밖 농민들과 춤추는 사람들": "Achird", "대성당의 회중": "Rasalgethi", "검은 말 두 마리": "Orus", "처형장 주변 마녀 무리": "Gacrux"}, "scenes": [{"scene_id": "C24", "title": "파우스트 24장", "segments": [{"id": "C24_0000", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "두 사람은 한밤중에 마녀들이 모이는 브로켄산으로 향했다. 메피스토는 한참이나 걸을 생각에 빗자루나 염소가 있으면 좋겠다고 투덜거렸다.", "scene_id": "c24-dense-001", "filename": "FAUST_C24_V04_0000_c24-dense-001_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0001", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "파우스트에게는 빨리 도착하는 것보다 낯선 산길을 직접 걸어 보는 것이 즐거웠다.", "scene_id": "c24-dense-002", "filename": "FAUST_C24_V04_0001_c24-dense-002_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0002", "speaker": "파우스트", "kind": "dialogue", "cast_id": "character-010", "text": "난 아직 걸을 만해. 지팡이 하나면 돼.", "scene_id": "c24-dense-002", "filename": "FAUST_C24_V04_0002_c24-dense-002_C010.wav", "voice": "Orus", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "지적이고 또렷한 중저음. 파고드는 질문과 조급한 감정이 공존한다. 메피스토에게는 반말, 낯선 사람에게는 존댓말. 그레첸에게는 관계가 가까워지는 정도에 따라 부드럽게 변한다. 회춘 전후에도 같은 배우를 유지한다.", "character_state": "회춘 후: 생기와 속도만 늘리고 같은 음색 유지", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0003", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "같은 산길을 두고 파우스트는 봄을 이야기했고, 메피스토는 어둠 때문에 발 디딜 곳도 보이지 않는다고 불평했다.", "scene_id": "c24-dense-003", "filename": "FAUST_C24_V04_0003_c24-dense-003_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0004", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 어둠 속에서 어른거리는 도깨비불을 불렀다. 길을 잘 아는 친구에게 부탁하듯 불렀지만, 그가 바라는 것은 산 위까지 갈 빛이었다.", "scene_id": "c24-dense-004", "filename": "FAUST_C24_V04_0004_c24-dense-004_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0005", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "도깨비불은 도와주겠다고 했지만 곧장 나아가는 건 자신 없었다. 불빛이 이리저리 움직이는 게 본래 그 존재의 습성이었다.", "scene_id": "c24-dense-005", "filename": "FAUST_C24_V04_0005_c24-dense-005_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0006", "speaker": "도깨비불 · 산길 안내자", "kind": "dialogue", "cast_id": "character-060", "text": "길을 밝혀 드릴게요. 다만 저는 한 방향으로 쭉 가는 게 좀 어려워요.", "scene_id": "c24-dense-005", "filename": "FAUST_C24_V04_0006_c24-dense-005_C060.wav", "voice": "Sadachbia", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "도깨비불. 가볍고 빠르게 방향을 바꾸는 중고음. 길 안내는 분명하게 말한다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0007", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 도깨비불의 변덕을 인간의 것에 빗대 놀렸다. 길잡이가 자기 뜻대로 움직이지 않을까 싶자, 부탁하던 말투도 명령으로 바뀌었다.", "scene_id": "c24-dense-006", "filename": "FAUST_C24_V04_0007_c24-dense-006_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0008", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "도깨비불은 메피스토를 거스르기 어려웠다. 그래도 마법에 들뜬 산에서 정확하게 길을 안내하겠다는 약속까지는 할 수 없었다.", "scene_id": "c24-dense-007", "filename": "FAUST_C24_V04_0008_c24-dense-007_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0009", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "불빛을 따라 들어선 골짜기에서는 나무와 바위마저 살아 움직이는 듯했다. 셋은 낯선 풍경을 보며 번갈아 노래했다.", "scene_id": "c24-dense-008", "filename": "FAUST_C24_V04_0009_c24-dense-008_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0010", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "물소리인지 노랫소리인지 구분하기 어려웠다. 산에서 들려오는 소리는 그들에게 한때 사랑하고 바라던 것까지 떠올리게 했다.", "scene_id": "c24-dense-009", "filename": "FAUST_C24_V04_0010_c24-dense-009_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0011", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메아리와 새 울음 같은 소리가 산길을 따라 따라왔다. 앞만 보면서도 두 사람은 계속 어디에서 소리가 나는지 신경을 썼다.", "scene_id": "c24-dense-010", "filename": "FAUST_C24_V04_0011_c24-dense-010_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0012", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "뿌리와 짐승이 뒤엉켜 보이자 익숙한 자연도 낯설어졌다. 바위 사이의 가지 하나까지 발목을 붙잡을 듯했다.", "scene_id": "c24-dense-011", "filename": "FAUST_C24_V04_0012_c24-dense-011_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0013", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "점점 어디가 앞인지 구분하기 어려워졌다. 메피스토는 파우스트가 길에서 떨어지지 않도록 자기 옷자락을 잡으라고 했다.", "scene_id": "c24-dense-012", "filename": "FAUST_C24_V04_0013_c24-dense-012_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0014", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "중턱에 이르자 붉은 빛이 골짜기 깊은 곳까지 번졌다. 메피스토는 막대한 재물을 뜻하는 맘몬이 산속에서 불을 밝힌 것처럼 말했다.", "scene_id": "c24-dense-013", "filename": "FAUST_C24_V04_0014_c24-dense-013_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0015", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "파우스트는 붉은 빛이 실처럼 가늘어졌다가 바위 전체를 밝히는 모습을 지켜봤다. 산을 오르기 힘들었던 만큼 눈앞의 광경에서 눈을 떼기 어려웠다.", "scene_id": "c24-dense-014", "filename": "FAUST_C24_V04_0015_c24-dense-014_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0016", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 불빛을 축제의 조명이라며 농담했다. 그러나 파우스트는 갑자기 불어온 바람을 맞고 서 있기도 어려워졌다.", "scene_id": "c24-dense-015", "filename": "FAUST_C24_V04_0016_c24-dense-015_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0017", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 파우스트가 바위를 붙잡도록 했다. 불빛을 즐기던 산길은 바람과 안개 때문에 순식간에 위험해졌다.", "scene_id": "c24-dense-016", "filename": "FAUST_C24_V04_0017_c24-dense-016_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0018", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "나무가 꺾이는 소리가 산을 울렸다. 메피스토는 숲을 푸른 궁전에 빗대며, 나무가 하나씩 무너지는 소리를 파우스트에게 짚어 주었다.", "scene_id": "c24-dense-017", "filename": "FAUST_C24_V04_0018_c24-dense-017_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0019", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "바람에 섞여 들리던 소리는 점점 노랫소리로 구분됐다. 축제에 모이는 무리가 가까워지고 있었다.", "scene_id": "c24-dense-018", "filename": "FAUST_C24_V04_0019_c24-dense-018_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0020", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "마녀들은 정상으로 향하며 거친 노래를 불렀다. 저마다 기이한 모습으로 올라왔고, 늙은 바우보가 돼지를 타고 온다는 외침도 들렸다.", "scene_id": "c24-dense-019", "filename": "FAUST_C24_V04_0020_c24-dense-019_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0021", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "무리는 바우보를 앞세우며 환호했다. 파우스트가 알던 마을의 행렬과는 아주 다른 밤이었다.", "scene_id": "c24-dense-020", "filename": "FAUST_C24_V04_0021_c24-dense-020_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0022", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "산등성이 여러 곳에서 목소리가 오갔다. 어디로 왔느냐는 평범한 질문에도 농담과 욕이 뒤섞여 돌아왔다.", "scene_id": "c24-dense-021", "filename": "FAUST_C24_V04_0022_c24-dense-021_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0023", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "모두 같은 쪽으로 서두르다 보니 넓은 길도 비좁아졌다. 저마다 먼저 가려고 떠들고, 부딪친 사람은 화를 냈다.", "scene_id": "c24-dense-022", "filename": "FAUST_C24_V04_0023_c24-dense-022_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0024", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "뒤처진 무리는 서로 누구 발이 더 빠르냐고 큰소리를 냈다. 위쪽에서는 바위 호수 쪽 일행까지 부르는 소리가 났다.", "scene_id": "c24-dense-023", "filename": "FAUST_C24_V04_0024_c24-dense-023_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0025", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "아래쪽의 목소리까지 합쳐지자 산 전체가 떠들썩했다. 별빛이 흐려진 하늘 아래에서는 불꽃이 더 밝게 보였다.", "scene_id": "c24-dense-024", "filename": "FAUST_C24_V04_0025_c24-dense-024_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0026", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "위로 가지 못한 누군가가 바위틈에서 일행을 불러 세웠다. 정상에는 가고 싶지만 다른 무리를 따라잡기 어려웠다.", "scene_id": "c24-dense-025", "filename": "FAUST_C24_V04_0026_c24-dense-025_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0027", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "반쪽 마녀는 자기와 같은 이들 사이에 있고 싶었다. 사람들은 가는 방법이 많다고 노래했지만, 정작 뒤에 남은 이가 끼어들 자리는 쉽게 내주지 않았다.", "scene_id": "c24-dense-026", "filename": "FAUST_C24_V04_0027_c24-dense-026_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0028", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "노래하던 무리가 사방으로 내려앉자 산길이 사람과 소리로 꽉 찼다. 메피스토도 이렇게까지 정신없을 줄은 몰랐다.", "scene_id": "c24-dense-027", "filename": "FAUST_C24_V04_0028_c24-dense-027_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0029", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 파우스트에게 가까이 있으라고 했지만, 말을 꺼냈을 때는 이미 서로를 놓쳤다.", "scene_id": "c24-dense-028", "filename": "FAUST_C24_V04_0029_c24-dense-028_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0030", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "파우스트의 대답이 멀리서 들렸다. 메피스토는 이 무리에게 순순히 양보를 기다려서는 그를 데려올 수 없다고 판단했다.", "scene_id": "c24-dense-029", "filename": "FAUST_C24_V04_0030_c24-dense-029_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0031", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 볼란트라는 이름을 내세우며 길을 열었다. 악마의 이름을 알아듣는 자리에서는 자기 정체가 오히려 쓸모가 있었다.", "scene_id": "c24-dense-030", "filename": "FAUST_C24_V04_0031_c24-dense-030_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0032", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 파우스트를 다시 찾자 곧장 사람들 틈에서 빼내려 했다. 다른 불빛이 보이는 덤불 쪽에는 덜 붐비는 자리가 있을 것 같았다.", "scene_id": "c24-dense-031", "filename": "FAUST_C24_V04_0032_c24-dense-031_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0033", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "사람이 몰린 산에 데려와 놓고 다시 무리를 피하자니, 파우스트에게는 앞뒤가 맞지 않는 것 같았다. 그래도 길을 아는 메피스토를 따라갔다.", "scene_id": "c24-dense-032", "filename": "FAUST_C24_V04_0033_c24-dense-032_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0034", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "파우스트는 축제에 와서 축제 한가운데를 피하는 것이 우스웠다. 메피스토는 더 작고 편한 자리에서도 충분히 재미를 볼 수 있다고 여겼다.", "scene_id": "c24-dense-033", "filename": "FAUST_C24_V04_0034_c24-dense-033_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0035", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "파우스트는 사람들을 피해 나온 데 안도하면서도 정상에서 벌어지는 일이 궁금했다. 더 가까이 가야 비밀을 알 수 있을 것 같았다.", "scene_id": "c24-dense-034", "filename": "FAUST_C24_V04_0035_c24-dense-034_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0036", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 정상에 가려는 파우스트를 작은 불가에 붙잡으려 했다. 요란한 축제 전체를 쫓기보다, 바로 곁에 있는 즐거움에 눈을 돌리게 하는 것이 그의 방식이었다.", "scene_id": "c24-dense-035", "filename": "FAUST_C24_V04_0036_c24-dense-035_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0037", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 불가에 모인 사람들을 상대로 먼저 말을 걸었다. 악기 소리는 마음에 들지 않아도, 파우스트와 어울릴 자리를 찾는 데는 좋은 단서였다.", "scene_id": "c24-dense-036", "filename": "FAUST_C24_V04_0037_c24-dense-036_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0038", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 파우스트가 직접 나설 때까지 기다리지 않았다. 자신이 대신 다가가면 파우스트를 새로운 사람들 사이에 자연스럽게 끼워 넣을 수 있었다.", "scene_id": "c24-dense-037", "filename": "FAUST_C24_V04_0038_c24-dense-037_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0039", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "불가를 지나자 끝이 보이지 않을 만큼 많은 모닥불이 나타났다. 메피스토는 파우스트가 정상 생각을 잊을 만큼 눈앞에 볼거리가 많다고 자랑했다.", "scene_id": "c24-dense-038", "filename": "FAUST_C24_V04_0039_c24-dense-038_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0040", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "파우스트는 메피스토가 어떤 얼굴로 사람들 앞에 나설지 궁금했다. 메피스토는 다른 곳에서 숨길 특징도 이곳에서는 오히려 자랑할 만하다고 답했다.", "scene_id": "c24-dense-039", "filename": "FAUST_C24_V04_0040_c24-dense-039_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0041", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 이곳의 무리가 자기 정체를 알아볼 것을 예상했다. 그는 파우스트에게도 모닥불마다 다른 만남을 마련해 주려 했다.", "scene_id": "c24-dense-040", "filename": "FAUST_C24_V04_0041_c24-dense-040_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0042", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "불이 거의 꺼진 쪽에는 나이 든 남자들이 모여 있었다. 메피스토가 젊은이들 곁으로 가 보라고 말을 걸자, 장군은 젊은이들만 대접받는다며 불평했다.", "scene_id": "c24-dense-041", "filename": "FAUST_C24_V04_0042_c24-dense-041_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0043", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "대신과 출세자, 작가는 차례로 옛날이 좋았다고 했다. 저마다 이유는 달랐지만, 자기 말을 사람들이 더 잘 받아 주던 시절이 그리웠다.", "scene_id": "c24-dense-042", "filename": "FAUST_C24_V04_0043_c24-dense-042_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0044", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 자기가 늙었다고 세상도 다 끝났다고 말하는 사람처럼 굴며 그들을 놀렸다. 그때 한 마녀가 손님을 놓치지 않으려고 두 사람을 불렀다.", "scene_id": "c24-dense-043", "filename": "FAUST_C24_V04_0044_c24-dense-043_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0045", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "마녀는 물건으로 얼마나 나쁜 일을 했는지를 자랑하며 팔았다. 메피스토조차 그렇게 지난 이야기만 내세워서는 손님이 관심을 갖기 어렵다고 했다.", "scene_id": "c24-dense-044", "filename": "FAUST_C24_V04_0045_c24-dense-044_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0046", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "그에게 과거의 악행은 이미 끝난 흥밋거리였다. 그는 새로운 물건이나 이야기가 있어야 발길을 멈출 거라며 지나쳤다.", "scene_id": "c24-dense-045", "filename": "FAUST_C24_V04_0046_c24-dense-045_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0047", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "파우스트는 구경만 한다면서도 어느새 사람들 움직임에 휩쓸렸다. 메피스토가 그 모습을 짚어 주는 사이, 파우스트의 시선이 한 여인에게 갔다.", "scene_id": "c24-dense-046", "filename": "FAUST_C24_V04_0047_c24-dense-046_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0048", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토가 가리킨 이는 릴리트였다. 그는 전해 오는 이야기에서 릴리트를 아담의 첫 아내라고 소개했다.", "scene_id": "c24-dense-047", "filename": "FAUST_C24_V04_0048_c24-dense-047_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0049", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 릴리트가 위험하다고 말하면서도 축제의 구경을 이어 갔다. 파우스트는 마침 춤이 끝난 자리에 앉은 두 여인을 보았다.", "scene_id": "c24-dense-048", "filename": "FAUST_C24_V04_0049_c24-dense-048_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0050", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토가 권하자 파우스트도 젊은 여인과 춤에 끼었다. 파우스트가 사과 꿈으로 말을 걸자, 상대는 낙원의 사과 이야기를 꺼내 웃으며 받아쳤다.", "scene_id": "c24-dense-049", "filename": "FAUST_C24_V04_0050_c24-dense-049_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0051", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "옆의 메피스토도 나이 든 춤 상대와 짓궂은 농담을 주고받았다. 상대 역시 그의 말발굽을 가지고 바로 받아칠 만큼 이 분위기에 익숙했다.", "scene_id": "c24-dense-050", "filename": "FAUST_C24_V04_0051_c24-dense-050_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0052", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "춤추는 사람들 앞에 유령을 믿지 않는 남자가 나타났다. 자기가 옳다고 확신한 그는 눈앞에서 춤을 추는 정령들에게 먼저 따졌다.", "scene_id": "c24-dense-051", "filename": "FAUST_C24_V04_0052_c24-dense-051_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0053", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "춤 상대는 흥겨운 자리에 끼어든 사람이 못마땅했다. 파우스트는 그가 무슨 일이든 끼어들어 판단해야 직성이 풀리는 사람처럼 보인다고 했다.", "scene_id": "c24-dense-052", "filename": "FAUST_C24_V04_0053_c24-dense-052_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0054", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "파우스트가 보기에 그 남자는 다른 사람이 자기 뜻대로 움직이지 않는 게 싫었다. 춤을 즐기기보다 남의 발걸음까지 설명하려는 태도가 우스웠다.", "scene_id": "c24-dense-053", "filename": "FAUST_C24_V04_0054_c24-dense-053_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0055", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "남자는 정령 같은 것이 있을 수 없다고 믿었다. 그래서 눈앞의 춤을 다시 살피기보다, 춤추는 사람들에게 없어지라고 요구했다.", "scene_id": "c24-dense-054", "filename": "FAUST_C24_V04_0055_c24-dense-054_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0056", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "춤 상대가 그만하라고 했지만, 남자는 말을 거둘 생각이 없었다. 자기가 없다고 말한 존재들이 계속 춤추는 상황을 견디기 어려웠다.", "scene_id": "c24-dense-055", "filename": "FAUST_C24_V04_0056_c24-dense-055_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0057", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "춤추는 사람들은 남자가 뭐라고 하든 춤을 이어 갔다. 메피스토는 그를 흉내 내며 비웃다가, 파우스트가 춤을 그만둔 이유가 더 궁금해졌다.", "scene_id": "c24-dense-056", "filename": "FAUST_C24_V04_0057_c24-dense-056_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0058", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "파우스트는 춤추던 여인에게서 빨간 쥐가 튀어나오는 기이한 광경을 보고 걸음을 멈췄다. 메피스토는 쥐의 색을 갖고 농담을 하며 파우스트의 놀람을 가볍게 넘겼다.", "scene_id": "c24-dense-057", "filename": "FAUST_C24_V04_0058_c24-dense-057_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0059", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "파우스트는 이제 춤이나 쥐보다 멀리 보이는 창백한 모습에 마음이 쏠렸다. 발을 제대로 떼지 않는 것 같은 움직임이 이상했다.", "scene_id": "c24-dense-058", "filename": "FAUST_C24_V04_0059_c24-dense-058_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0060", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "그레첸을 닮았다는 말에 메피스토는 파우스트를 만류했다. 산 위의 재미에만 빠져 있게 하려던 그에게, 그레첸을 떠올리게 하는 형상은 반갑지 않았다.", "scene_id": "c24-dense-059", "filename": "FAUST_C24_V04_0060_c24-dense-059_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0061", "speaker": "파우스트", "kind": "dialogue", "cast_id": "character-010", "text": "그레첸을 닮았어.", "scene_id": "c24-dense-059", "filename": "FAUST_C24_V04_0061_c24-dense-059_C010.wav", "voice": "Orus", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "지적이고 또렷한 중저음. 파고드는 질문과 조급한 감정이 공존한다. 메피스토에게는 반말, 낯선 사람에게는 존댓말. 그레첸에게는 관계가 가까워지는 정도에 따라 부드럽게 변한다. 회춘 전후에도 같은 배우를 유지한다.", "character_state": "회춘 후: 생기와 속도만 늘리고 같은 음색 유지", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0062", "speaker": "메피스토", "kind": "dialogue", "cast_id": "character-008", "text": "내버려 둬. 마법이 만든 모습이야.", "scene_id": "c24-dense-059", "filename": "FAUST_C24_V04_0062_c24-dense-059_C008.wav", "voice": "Fenrir", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "거칠지 않은 중저음, 여유 있고 능청스러운 관찰자. 파우스트에게는 느긋한 반말로 약점을 찌른다. 마르테·낯선 사람에게는 예의 있는 척하는 해요체. 주 앞에서는 정중하되 빈정거린다. 웃음은 가끔 작게, 킬킬킬 반복·괴물 포효·특정 배우 성대모사 금지.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다. 파우스트에게 느긋한 반말, 주와 마르테·낯선 사람 앞에서는 공손한 척하는 말투. 상대가 진지할수록 혼자 재미있어하는 온도 차이. 과도한 킬킬거림·특정 배우나 작품의 목소리 모방 금지.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0063", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 보는 이를 돌로 굳게 한다는 메두사를 예로 들었다. 파우스트는 경고를 듣고도, 낯선 모습 속에서 자꾸 자신이 아는 그레첸을 알아보려 했다.", "scene_id": "c24-dense-060", "filename": "FAUST_C24_V04_0063_c24-dense-060_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0064", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 누구에게나 자기 연인처럼 보일 뿐이라고 했다. 파우스트는 그레첸을 본 듯한 반가움과, 그녀의 눈이 죽은 사람처럼 보인다는 두려움을 함께 느꼈다.", "scene_id": "c24-dense-061", "filename": "FAUST_C24_V04_0064_c24-dense-061_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0065", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "파우스트는 목 둘레의 가느다란 붉은 줄까지 보았다. 아직 그 모양이 무엇을 뜻하는지 알 수는 없었지만, 마음이 편치 않았다.", "scene_id": "c24-dense-062", "filename": "FAUST_C24_V04_0065_c24-dense-062_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0066", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 다시 신화 이야기를 꺼낸 뒤, 파우스트를 언덕 쪽으로 이끌려 했다. 극장을 보여 주면 파우스트가 형상에서 눈을 뗄 거라 생각했다.", "scene_id": "c24-dense-063", "filename": "FAUST_C24_V04_0066_c24-dense-063_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0067", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "극장 앞에서 세르비빌리스라는 안내자가 곧 공연을 시작한다고 말했다. 축제 안에서 또 다른 작은 무대가 열리고 있었다.", "scene_id": "c24-dense-064", "filename": "FAUST_C24_V04_0067_c24-dense-064_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C24_0068", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "안내자는 막을 올리러 자리를 떴다. 메피스토는 마녀들의 산에서 연극까지 만난 것이 마음에 들었다. 파우스트를 환영에서 떼어 놓을 새로운 볼거리가 바로 앞에 있었다.", "scene_id": "c24-dense-065", "filename": "FAUST_C24_V04_0068_c24-dense-065_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}]}]};
        const originalStory = JSON.stringify(originalEpisode, null, 2);

        const hostVoiceSelect = document.getElementById('hostVoiceSelect');
        let turns = [];
        let batchRunning = false;
        let activeRequests = 0;
        let previewAudio = null;
        let releaseUrls = [];
        async function telephoneFilter(samples, rate) {
            // Apply real telephone-band filtering only to Heo's audio, before WAV export.
            const ctx = new OfflineAudioContext(1, samples.length, rate);
            const buffer = ctx.createBuffer(1, samples.length, rate);
            buffer.copyToChannel(samples, 0);
            const source = ctx.createBufferSource(); source.buffer = buffer;
            const high = ctx.createBiquadFilter(); high.type = 'highpass'; high.frequency.value = 300; high.Q.value = 0.707;
            const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 3400; low.Q.value = 0.707;
            const compressor = ctx.createDynamicsCompressor();
            compressor.threshold.value = -22; compressor.knee.value = 12; compressor.ratio.value = 3;
            compressor.attack.value = 0.006; compressor.release.value = 0.18;
            source.connect(high); high.connect(low); low.connect(compressor); compressor.connect(ctx.destination); source.start();
            const rendered = await ctx.startRendering();
            return rendered.getChannelData(0);
        }
        function appendPause(samples, rate, pauseMs) {
            const count = Math.round(rate * Math.max(0, Math.min(3000, Number(pauseMs) || 0)) / 1000);
            const output = new Float32Array(samples.length + count);
            output.set(samples);
            return output;
        }
        function lockControls() {
            const locked = batchRunning || activeRequests > 0 || folderChecking || mergingAudio;
            ['exportRetryBtn','importRetryBtn','clearRetryBtn','retryJsonInput','readFolderBtn','readFolderInput','loadMergeWavsBtn','loadMergeFolderBtn','mergeMp3Btn','mergeWavsInput','mergeFolderInput','mp3Bitrate','verifyFilesInput','directFolderBtn'].forEach(id => document.getElementById(id).disabled = locked);
            chooseFolderBtn.disabled = verifyFolderBtn.disabled = document.getElementById('browserDownloadBtn').disabled = locked;
            processBtn.disabled = batchProcessBtn.disabled = promptInput.disabled = voiceSelect.disabled = hostVoiceSelect.disabled = locked;
            sentenceList.querySelectorAll('.play-btn, .retry-btn').forEach(button => button.disabled = locked);
        }

        const emotionNotes = {
            neutral: '담백하고 편안하게. 정보를 전달하되 문장 안의 중요한 단어만 살짝 강조한다.',
            surprised: '예상과 다른 답을 처음 듣는 실제 놀람. 첫 단어나 숫자에만 높낮이를 주고 곧 자연스럽게 내려온다. 비명이나 과장된 예능 리액션 금지.',
            curious: '상대의 다음 이야기를 정말 알고 싶은 호기심. 의문문 끝을 기계적으로 올리지 말고 질문의 핵심에만 가볍게 힘을 준다.',
            amused: '입가에 미소가 번지는 작은 재미. 말 속에 웃음기를 살짝 담되 대본에 없는 웃음은 추가하지 않는다.',
            awkward_laugh: '본인도 조금 민망하고 우스운 듯 짧고 수줍게. 하하는 소리 내어 글자를 읽지 말고 작은 실제 웃음으로 표현한다.',
            reflective: '잠시 기억을 더듬는 내면의 회고. 속도를 약간 낮추고 말끝에 생각이 남게 한다. 슬픈 연기를 일괄 적용하지 않는다.',
            excited: '좋아하는 일을 설명할 때 자기도 모르게 생기는 생기. 핵심 단어에서만 속도가 조금 붙고 호흡은 유지한다. 영업 발표처럼 웅변하지 않는다.',
            earnest: '개인 경험에서 우러난 솔직함과 진지함. 음정을 조금 낮추고 핵심 말에 무게를 싣는다. 단호함을 고함으로 표현하지 않는다.',
            skeptical: '무례하지 않은 검증과 의문. 잠시 생각하고 차분하게 질문하며 비꼬거나 몰아붙이지 않는다.'
        };
        const sceneNotes = {
            S00: '콜드 오픈. 원장은 열두 대라는 수를 아무렇지 않게 말하고 진행자는 한 박자 늦게 놀란다. 둘의 온도 차로 재미를 살린다. 웃음을 억지로 키우지 않는다.',
            S01: '호기심을 차곡차곡 쌓는 도입. 장비 목록은 구분해서 읽고 마지막 동네 치과 원장이라는 반전은 짧게 호흡한 뒤 담백하게 밝힌다.',
            S02: '어릴 적 컴퓨터 취미의 생기에서 접어야 했던 꿈의 씁쓸함, 생업의 현실과 개원 대출의 두려움으로 이동한다. 아버지 이야기는 무겁지만 담담하게, 진행자는 웃음기를 거둔다.',
            S03: '비싼 견적에 대한 황당함, 몸으로 부딪힌 고생, 처음 해냈을 때의 작은 자신감 순서. 원장은 손가락 고생을 웃으며 돌아보고 이거 내가 할 수 있나에는 깨달음이 묻어난다.',
            S04: '처음에는 생업에 대한 답답한 푸념. 친구의 한마디에서 가벼운 반전, 직접 시도하며 발견하는 재미로 전환한다. 코드를 누가 짜느냐는 질문에는 잠깐 여백. AI 협업 설명은 생생하게, 유지보수의 한계에서는 차분해진다.',
            S05: '원장은 이미 쓰는 도구를 평범하게 설명하고 진행자는 규모를 점차 실감한다. 수치와 실제 효과는 또렷하게. 유료 소프트웨어 대체에 관한 서술은 흥분보다 관찰과 검증의 태도.',
            S06: '돈 이야기는 민감하므로 정중하고 솔직하게. 과투자 질문을 공격적으로 읽지 않는다. 원장은 외부 시선을 떠올리며 잠시 머쓱하다가 그냥 재밌다는 진심에서 따뜻하고 편안해진다. 회수 여부 미확인은 확실하게 구분한다.',
            S07: '차분한 회고에서 다시 찾은 취미와 주도성의 의미를 짚는다. 기술 찬양으로 부풀리지 않는다. 마지막 비용 질문에는 호기심을 다시 살리고 다음 편 예고는 가볍고 자연스럽게 여운을 남긴다.'
        };
        function parseTurns(text) {
            const episode=JSON.parse(text);return episode.scenes.flatMap(scene=>scene.segments.map(segment=>({...segment,phase:scene.title,sceneId:segment.scene_id})));
        }
        function makePrompt(index) {
            const turn=turns[index],p=turn.performance;
            return `한국어 드라마 오디오북. 중학생 청자에게 친절하고 선명한 낭독. 화자: ${turn.speaker}. 목소리 정체성 고정. 전화 효과 없음.
모델: ${turn.model}; 배역표 지문: ${turn.cast_sha256}; 고정 음색: ${turn.voice}; 배역 ID: ${turn.cast_id}; 발화 종류: ${turn.kind}.
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
낭독 본문:
${turn.text}`;
        }
        processBtn.addEventListener('click', () => {
            if (batchRunning || activeRequests) return;
            let parsed;
            try { parsed = parseTurns(promptInput.value); } catch(error) { showMessage(error.message); return; }
            if (!parsed.length) return showMessage('읽을 웹소설 대본이 없습니다.');
            if (previewAudio) previewAudio.pause();
            releaseUrls.forEach(url => URL.revokeObjectURL(url)); releaseUrls = [];
            retrySelection = null; retryReportStatus.textContent = '대본 로드 완료 · 전체 항목 모드';
            turns = parsed; currentLines = turns.map(t => t.text);
            renderLines();
        });
        function renderLines() {
            sentenceList.replaceChildren(); sentenceHandlers = []; downloadStates = []; fileEntries = [];
            resultsContainer.classList.remove('hidden');
            stats.textContent = `${turns.length}개 구간 · 화자 ${new Set(turns.map(t=>t.speaker)).size}명`;
            turns.forEach((turn, index) => {
                const card = document.createElement('div'); card.id = `card-${index}`;
                card.className = 'bg-white p-4 rounded-xl border border-gray-200 space-y-3';
                const label = document.createElement('div'); label.className = 'text-xs font-semibold text-blue-600';
                label.textContent = `${turn.filename} · ${turn.speaker} · ${false?'전화 음질':'스튜디오 음질'} · ${turn.phase} · ${turn.performance.emotion || 'neutral'} · 쉼 ${turn.performance.pause_after_ms || 0}ms`;
                const text = document.createElement('p'); text.textContent = turn.text;
                const actions = document.createElement('div'); actions.className = 'flex gap-3 items-center';
                const play = document.createElement('button'); play.className = 'play-btn bg-blue-50 text-blue-700 px-4 py-2 rounded-lg'; play.textContent = '생성 / 재생';
                const download = document.createElement('a'); download.className = 'hidden bg-green-50 text-green-700 px-4 py-2 rounded-lg'; download.textContent = 'WAV 저장'; download.download = turn.filename; download.target = '_blank'; download.rel = 'noopener';
                const status = document.createElement('span'); status.className = 'text-xs text-gray-500'; status.textContent = '대기';
                const state = { requested: false, failed: false, voice: null, verified: false, reason: '아직 저장/검증하지 않음' };
                downloadStates.push(state);
                const retry = document.createElement('button');
                retry.className = 'retry-btn bg-amber-50 text-amber-800 px-3 py-2 rounded-lg text-sm';
                retry.textContent = '다운로드 안 됨';
                retry.title = '실제로 저장되지 않은 파일을 다음 일괄 저장 대상으로 지정합니다.';
                retry.addEventListener('click', () => {
                    if (batchRunning || activeRequests) return;
                    state.requested = false; state.verified = false; state.reason = '사용자가 미저장으로 지정';
                    status.textContent = '재다운로드 대상 · 위 일괄 저장 버튼으로 다시 저장';
                });
                download.addEventListener('click', event => {
                    if (directoryHandle && !readOnlyFolder) {
                        event.preventDefault();
                        if (!batchRunning && !activeRequests && !folderChecking) handler(true);
                        return;
                    }
                    state.requested = true; state.failed = false;
                    status.textContent = '다운로드 요청 완료 · 미저장 시 다운로드 안 됨 클릭';
                });
                actions.classList.add('flex-wrap');
                actions.append(play,download,retry,status); card.append(label,text,actions); sentenceList.append(card);
                let audioUrl = null, cachedVoice = null;
                const handler = async (autoDownload = false) => {
                    activeRequests++; lockControls();
                    try {
                        const voice = currentVoice(index);
                        if (!audioUrl || cachedVoice !== voice) {
                            state.requested = false; state.failed = false; state.verified = false;
                            status.textContent = '생성 중…';
                            const url = await generateTTS(makePrompt(index),voice,false,turn.performance.pause_after_ms,turn.kind==='monologue');
                            if (audioUrl) URL.revokeObjectURL(audioUrl);
                            audioUrl = url; cachedVoice = voice; state.voice = voice; releaseUrls.push(url);
                            download.href = url; download.classList.remove('hidden');
                        }
                        status.textContent = state.requested ? `다운로드 요청 완료 · ${voice}` : `생성 완료 · ${voice}`;
                        if (autoDownload) {
                            if (directoryHandle && !readOnlyFolder) {
                                status.textContent = '폴더 저장 / 검증 중…';
                                await saveVerified(index, audioUrl, voice);
                                state.verified = state.requested = true; state.failed = false; state.reason = null;
                                status.textContent = '폴더 저장 및 내용 검증 완료';
                            } else { download.click(); status.textContent = '다운로드 요청 · 저장되지 않으면 WAV 저장을 직접 누르세요'; }
                        }
                        else {
                            if (previewAudio) previewAudio.pause();
                            previewAudio = new Audio(audioUrl);
                            previewAudio.play().catch(() => { status.textContent = '음성 생성 완료 · WAV 저장 가능'; });
                        }
                        return audioUrl;
                    } catch (error) { state.failed = true; state.requested = false; state.reason = error.message; status.textContent = '실패 · 재시도 가능'; showMessage(error.message); return null; }
                    finally { activeRequests--; lockControls(); }
                };
                play.addEventListener('click', () => { if (!batchRunning && !activeRequests) handler(false); });
                fileEntries.push({state, status, filename: download.download, getUrl: () => cachedVoice === currentVoice(index) ? audioUrl : null});
                sentenceHandlers.push(handler);
            });
        }
        batchProcessBtn.addEventListener('click', async () => {
            if (batchRunning || activeRequests || folderChecking || !turns.length) return;
            if (directoryHandle) { try { await verifyDirectory(); } catch(error) { showMessage(error.message); return; } }
            const targets = turns.map((turn,index) => index).filter(index => {
                if (retrySelection) return retrySelection.has(index);
                const state = downloadStates[index];
                const voice = turns[index].voice || hostVoiceSelect.value;
                return (directoryHandle ? !state.verified : !state.requested) || state.failed || state.voice !== voice;
            });
            batchStatus.classList.remove('hidden');
            if (!targets.length) {
                batchStatus.textContent = '모든 항목의 다운로드를 요청했습니다. 저장되지 않은 파일은 다운로드 안 됨으로 지정하세요.';
                return;
            }
            batchRunning = true; lockControls();
            if (previewAudio) previewAudio.pause();
            progressBarContainer.classList.remove('hidden'); progressBar.style.width = '0%';
            let completed = 0, failed = 0;
            try {
                for (const index of targets) {
                    batchStatus.textContent = `재처리 대상 ${completed+1} / ${targets.length} · ${turns[index].filename} · ${turns[index].speaker}`;
                    document.getElementById(`card-${index}`).scrollIntoView({behavior:'smooth',block:'center'});
                    const result = await sentenceHandlers[index](true);
                    if (!result) failed++;
                    else if (retrySelection) retrySelection.delete(index);
                    completed++;
                    progressBar.style.width = `${completed/targets.length*100}%`;
                    await new Promise(resolve => setTimeout(resolve,800));
                }
                batchStatus.textContent = `${directoryHandle ? '폴더 저장·검증' : '다운로드 요청'} ${completed-failed}개 · 실패 ${failed}개 · 기존 요청 완료 ${turns.length-targets.length}개 건너뜀`;
            } finally { batchRunning = false; lockControls(); }
        });

        function currentVoice(index) { const t=turns[index]; if(!t?.voice) throw new Error('배역 음성 누락'); return t.voice; }
        async function sha256(buffer) {
            if (!globalThis.crypto?.subtle) throw new Error('이 환경은 파일 내용 검증을 지원하지 않습니다. HTTPS 환경에서 실행해 주세요.');
            return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)), x=>x.toString(16).padStart(2,'0')).join('');
        }
        async function fingerprint(index) {
            return sha256(new TextEncoder().encode(JSON.stringify({prompt:makePrompt(index),voice:currentVoice(index),phone:false,pause:turns[index].performance.pause_after_ms,format:'44100-mono-16bit-short-echo-v4',effect:turns[index].kind==='monologue'?'echo-v4':'dry'})));
        }
        function validWav(bytes) {
            if (bytes.byteLength <= 44) return false;
            const v = new DataView(bytes);
            const tag = off => String.fromCharCode(...new Uint8Array(bytes,off,4));
            return tag(0)==='RIFF' && tag(8)==='WAVE' && tag(12)==='fmt ' && tag(36)==='data'
                && v.getUint16(20,true)===1 && v.getUint16(22,true)===1 && v.getUint32(24,true)===44100
                && v.getUint16(34,true)===16 && v.getUint32(40,true)===bytes.byteLength-44
                && v.getUint32(4,true)===bytes.byteLength-8;
        }
        async function writeFile(name, data) {
            if (readOnlyFolder) throw new Error('읽기 전용 폴더입니다. 기존 다운로드 방식으로 저장해 주세요.');
            const handle = await directoryHandle.getFileHandle(name,{create:true});
            const writable = await handle.createWritable();
            try { await writable.write(data); await writable.close(); }
            catch(error) { try { await writable.abort(); } catch {} throw error; }
        }
        async function readBytes(name) {
            return (await (await directoryHandle.getFileHandle(name)).getFile()).arrayBuffer();
        }
        async function saveVerified(index,url,voice) {
            const entry = fileEntries[index];
            const response = await fetch(url);
            if (!response.ok) throw new Error('생성된 음성을 읽을 수 없습니다.');
            const bytes = await response.arrayBuffer();
            if (!validWav(bytes)) throw new Error('생성된 WAV 형식이 올바르지 않습니다.');
            const expectedHash = await sha256(bytes);
            await writeFile(entry.filename, bytes);
            const stored = await readBytes(entry.filename);
            if (!validWav(stored) || stored.byteLength!==bytes.byteLength || await sha256(stored)!==expectedHash) throw new Error(entry.filename+' 저장 검증 실패');
            const receipt = {version:1,fingerprint:await fingerprint(index),sha256:expectedHash,size:stored.byteLength,voice};
            await writeFile(entry.filename+'.verified.json',JSON.stringify(receipt));
            const reread = JSON.parse(new TextDecoder().decode(await readBytes(entry.filename+'.verified.json')));
            if (reread.sha256!==receipt.sha256 || reread.fingerprint!==receipt.fingerprint) throw new Error('검증 기록 저장 실패');
        }
        async function verifyDirectory() {
            if (!directoryHandle) return;
            folderChecking = true; lockControls();
            let present=0,missing=0,errors=0;
            try {
                for (const entry of fileEntries) {
                    entry.state.verified=false;
                    try {
                        // Presence check only: no audio upload, decoding, hashes or receipt requirement.
                        await (await directoryHandle.getFileHandle(entry.filename)).getFile();
                        entry.state.verified=true; entry.state.requested=true; entry.state.failed=false;
                        entry.state.voice=currentVoice(fileEntries.indexOf(entry)); entry.state.reason=null;
                        entry.status.textContent='파일 있음 · 누락 검사 통과'; present++;
                    } catch(error) {
                        entry.state.requested=false;
                        if(error.name==='NotFoundError') {
                            entry.state.failed=true; entry.state.reason='파일 누락';
                            entry.status.textContent='파일 없음 · 재다운로드 대상'; missing++;
                        } else {
                            entry.state.failed=false; entry.state.reason='폴더 접근 오류 · '+error.message;
                            entry.status.textContent=entry.state.reason; errors++;
                        }
                    }
                }
                folderStatus.textContent=`${directoryHandle.name} · 파일 있음 ${present} / 누락 ${missing} / 접근 오류 ${errors} · 파일명 기준 검사`;
                if(errors) throw new Error('폴더 접근 오류로 누락 검사를 완료하지 못했습니다. 폴더 접근 권한을 확인해 주세요.');
            } finally { folderChecking=false; lockControls(); }
        }
        document.getElementById('browserDownloadBtn').addEventListener('click',()=>{
            if(batchRunning || activeRequests || folderChecking) return;
            directoryHandle=null; readOnlyFolder=false;
            downloadStates.forEach(state=>{ state.requested=false; state.verified=false; });
            folderStatus.textContent='폴더 미지정 · 기존 브라우저 다운로드 사용';
        });
        async function chooseDirectDirectory() {
            if(batchRunning || activeRequests || folderChecking) return;
            if(!window.showDirectoryPicker) { showMessage('이 실행 환경에서는 업로드 없는 폴더 접근을 지원하지 않습니다. 누락 검사를 하려면 폴더 접근을 지원하는 브라우저 환경에서 실행해야 합니다.'); return; }
            try {
                const chosen=await window.showDirectoryPicker({mode:'readwrite'});
                directoryHandle=chosen; readOnlyFolder=false;
                await verifyDirectory();
            } catch(error) { if(error.name!=='AbortError') showMessage('폴더 접근 실패: '+error.message+' · 기존 다운로드 방식은 폴더 미지정 상태에서 사용할 수 있습니다.'); }
        }
        document.getElementById('directFolderBtn').addEventListener('click',chooseDirectDirectory);
        verifyFolderBtn.addEventListener('click',async()=>{
            if(batchRunning || activeRequests || folderChecking) return;
            if(!directoryHandle) return showMessage('먼저 저장 폴더를 지정해 주세요.');
            try { await verifyDirectory(); } catch(error) { showMessage(error.message); }
        });

        async function buildRetryReport() {
            const items = [];
            for (let index=0; index<fileEntries.length; index++) {
                const entry=fileEntries[index];
                const state=entry.state;
                const selected = directoryHandle ? !state.verified : retrySelection ? retrySelection.has(index) : !state.requested || state.failed;
                if (!selected) continue;
                items.push({filename:entry.filename,segment_id:turns[index].id,speaker:turns[index].speaker,
                    text:turns[index].text,voice:currentVoice(index),fingerprint:await fingerprint(index),
                    reason:state.reason || (state.voice!==currentVoice(index)?'목소리 변경':'재다운로드 지정')});
            }
            return {schema:'tts-retry-list',version:1,created_at:new Date().toISOString(),
                verification:directoryHandle?'filename-presence-only':'browser-request-status-only',
                folder_name:directoryHandle?.name || null,total_segments:turns.length,items};
        }
        async function applyRetryReport(report) {
            if (report?.schema!=='tts-retry-list' || report.version!==1 || !Array.isArray(report.items)) throw new Error('지원하는 재다운로드 JSON 형식이 아닙니다.');
            const selected=new Set(); const updates=[];
            for (const item of report.items) {
                const index=fileEntries.findIndex(entry=>entry.filename===item.filename);
                if(index<0) throw new Error('현재 대본에 없는 파일: '+String(item.filename));
                if(item.segment_id!==turns[index].id || item.text!==turns[index].text || item.speaker!==turns[index].speaker || item.voice!==currentVoice(index) || item.fingerprint!==await fingerprint(index))
                    throw new Error(item.filename+'의 대본·화자·목소리·연출 설정이 현재와 다릅니다. JSON을 만들 때의 대본과 목소리로 맞춰 주세요.');
                selected.add(index); updates.push({index,reason:typeof item.reason==='string'?item.reason:'JSON에서 재다운로드 지정'});
            }
            // Validate the complete list before changing the current selection.
            retrySelection=selected;
            for(const {index,reason} of updates) {
                const entry=fileEntries[index];
                entry.state.requested=false; entry.state.verified=false; entry.state.reason=reason;
                entry.status.textContent='JSON 재다운로드 대상 · '+reason;
            }
            retryReportStatus.textContent=`JSON 불러옴 · ${selected.size}개만 재처리합니다. 위 미저장 / 실패 항목 버튼을 누르세요.`;
        }
        document.getElementById('exportRetryBtn').addEventListener('click',async()=>{
            if(batchRunning || activeRequests || folderChecking) return;
            try {
                if(directoryHandle) await verifyDirectory();
                folderChecking=true; lockControls();
                const report=await buildRetryReport();
                const data=JSON.stringify(report,null,2);
                const name='FAUST_C24_V04_RETRY.json';
                if(directoryHandle && !readOnlyFolder) {
                    await writeFile(name,data);
                    const reread=JSON.parse(new TextDecoder().decode(await readBytes(name)));
                    if(JSON.stringify(reread)!==JSON.stringify(report)) throw new Error('재다운로드 JSON 저장 검증 실패');
                } else {
                    const url=URL.createObjectURL(new Blob([data],{type:'application/json;charset=utf-8'}));
                    const link=document.createElement('a');link.href=url;link.download=name;
                    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
                }
                retryReportStatus.textContent=`재다운로드 JSON ${report.items.length}개 항목 ${directoryHandle && !readOnlyFolder?'폴더 저장 및 검증 완료':'다운로드 요청 완료'}${directoryHandle?'':' · 폴더 미지정으로 실제 파일 저장 여부는 미검증'}`;
            } catch(error) { showMessage(error.message); }
            finally { folderChecking=false;lockControls(); }
        });
        document.getElementById('importRetryBtn').addEventListener('click',()=>{
            if(batchRunning || activeRequests || folderChecking) return;
            document.getElementById('retryJsonInput').click();
        });
        document.getElementById('retryJsonInput').addEventListener('change',async event=>{
            const file=event.target.files?.[0]; if(!file) return;
            if(batchRunning || activeRequests || folderChecking) {event.target.value='';return;}
            folderChecking=true;lockControls();
            try { await applyRetryReport(JSON.parse((await file.text()).replace(/^\uFEFF/,''))); }
            catch(error) {showMessage(error.message);}
            finally {event.target.value='';folderChecking=false;lockControls();}
        });
        document.getElementById('clearRetryBtn').addEventListener('click',()=>{
            if(batchRunning || activeRequests || folderChecking) return;
            retrySelection=null;retryReportStatus.textContent='전체 항목 모드 · 저장/검증 상태에 따라 미저장 및 실패 항목을 선택합니다.';
        });

        document.getElementById('readFolderBtn').addEventListener('click',()=>{
            if(batchRunning || activeRequests || folderChecking) return;
            document.getElementById('readFolderInput').click();
        });
        document.getElementById('readFolderInput').addEventListener('change',async event=>{
            if(batchRunning || activeRequests || folderChecking) return;
            const files=Array.from(event.target.files || []);
            if(!files.length) return;
            const folderName=(files[0].webkitRelativePath || '').split('/')[0] || '선택 폴더';
            const map=new Map();
            for(const file of files) {
                const path=file.webkitRelativePath.split('/');
                // Inspect the chosen directory itself, not similarly named files in nested directories.
                if(path.length===2) map.set(file.name,file);
            }
            readOnlyFolder=true;
            directoryHandle={name:folderName,getFileHandle:async name=>{
                const file=map.get(name);
                if(!file) throw new DOMException('파일 없음','NotFoundError');
                return {getFile:async()=>file};
            }};
            try {
                await verifyDirectory();
                folderStatus.textContent+=' · 읽기 전용 · WAV/JSON은 기존 다운로드로 저장';
                selectMergeFiles(Array.from(map.values()));
                retryReportStatus.textContent='폴더의 WAV를 검증하고 MP3 합치기에 불러왔습니다. 재다운로드 JSON 저장 또는 단일 MP3 만들기를 누르세요. 검증 기록이 없는 WAV는 대본 일치 여부가 미확인으로 표시됩니다.';
            } catch(error) {showMessage(error.message);}
            finally {event.target.value='';}
        });

        let mergeFiles = [];
        let mergedMp3Url = null;
        let mp3EncoderPromise = null;
        const mergeStatus = document.getElementById('mergeStatus');
        function orderedWavs(files) {
            const wavs=Array.from(files).filter(file=>/\.wav$/i.test(file.name));
            const names=new Set();
            for(const file of wavs) {
                const name=file.name.toLowerCase();
                if(names.has(name)) throw new Error('같은 파일명이 여러 개입니다: '+file.name+' · 합칠 파일만 한 폴더에 모아 선택하세요.');
                names.add(name);
            }
            return wavs.sort((a,b)=>a.name.localeCompare(b.name,'en',{numeric:true,sensitivity:'base'}));
        }
        function selectMergeFiles(files) {
            if(mergingAudio || batchRunning || activeRequests || folderChecking) return;
            try {
                const selected=orderedWavs(files);
                if(!selected.length) throw new Error('선택한 파일에 WAV가 없습니다.');
                mergeFiles=selected;
                const numbered=selected.map(f=>f.name.match(/^(\d+)\.wav$/i));
                const gaps=[];
                if(numbered.every(Boolean)) {
                    const nums=numbered.map(m=>Number(m[1]));
                    for(let i=1;i<nums.length;i++) if(nums[i]>nums[i-1]+1) gaps.push(`${nums[i-1]+1}~${nums[i]-1}`);
                }
                mergeStatus.textContent=`WAV ${selected.length}개 선택 · ${selected[0].name} → ${selected.at(-1).name}${gaps.length?' · 번호 누락 구간: '+gaps.join(', ')+' (선택한 파일만 합침)':''}`;
            } catch(error) {showMessage(error.message);}
        }
        function loadMp3Encoder() {
            if(globalThis.lamejs?.Mp3Encoder) return Promise.resolve(globalThis.lamejs);
            if(mp3EncoderPromise) return mp3EncoderPromise;
            mp3EncoderPromise=new Promise((resolve,reject)=>{
                const script=document.createElement('script');
                script.src='https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
                const timer=setTimeout(()=>{script.remove();mp3EncoderPromise=null;reject(new Error('MP3 변환 라이브러리 로드 시간 초과. 인터넷 연결 또는 캔버스의 외부 스크립트 허용 여부를 확인해 주세요.'));},20000);
                script.onload=()=>{clearTimeout(timer);if(globalThis.lamejs?.Mp3Encoder) resolve(globalThis.lamejs);else {mp3EncoderPromise=null;reject(new Error('MP3 인코더를 초기화하지 못했습니다.'));}};
                script.onerror=()=>{clearTimeout(timer);script.remove();mp3EncoderPromise=null;reject(new Error('MP3 변환 라이브러리를 불러오지 못했습니다. 인터넷 연결 또는 외부 스크립트 차단 여부를 확인해 주세요.'));};
                document.head.append(script);
            });
            return mp3EncoderPromise;
        }
        async function decodeMonoWav(file, audioContext) {
            const bytes=await file.arrayBuffer();
            if(bytes.byteLength<12 || new DataView(bytes).getUint32(0,false)!==0x52494646 || new DataView(bytes).getUint32(8,false)!==0x57415645) throw new Error(file.name+': WAV 형식이 아닙니다.');
            let decoded;
            try { decoded=await audioContext.decodeAudioData(bytes); }
            catch {throw new Error(file.name+': 손상되었거나 지원하지 않는 WAV입니다.');}
            if(!decoded.length) throw new Error(file.name+': 빈 오디오입니다.');
            const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*44100),44100);
            const source=offline.createBufferSource(); source.buffer=decoded;
            source.connect(offline.destination);source.start();
            return (await offline.startRendering()).getChannelData(0);
        }
        function pcm16(samples) {
            const result=new Int16Array(samples.length);
            for(let i=0;i<samples.length;i++) {const n=Math.max(-1,Math.min(1,samples[i]));result[i]=Math.round(n<0?n*32768:n*32767);}
            return result;
        }
        // Keep one encoder across all files so there are no MP3 padding gaps at each boundary.
        async function encodeMergedWavs(files,encoder,context,onProgress) {
            const chunks=[]; const blockSize=1152;
            let frames=0;
            for(let index=0;index<files.length;index++) {
                const samples=await decodeMonoWav(files[index],context);
                for(let offset=0;offset<samples.length;offset+=blockSize) {
                    const data=encoder.encodeBuffer(pcm16(samples.subarray(offset,offset+blockSize)));
                    if(data.length) chunks.push(new Uint8Array(data));
                    if(++frames%160===0) {onProgress(index,files.length,files[index].name,Math.min(1,(offset+blockSize)/samples.length));await new Promise(resolve=>setTimeout(resolve,0));}
                }
                onProgress(index+1,files.length,files[index].name,0);
                await new Promise(resolve=>setTimeout(resolve,0));
            }
            const tail=encoder.flush();if(tail.length) chunks.push(new Uint8Array(tail));
            return new Blob(chunks,{type:'audio/mpeg'});
        }
        document.getElementById('loadMergeWavsBtn').addEventListener('click',()=>document.getElementById('mergeWavsInput').click());
        document.getElementById('loadMergeFolderBtn').addEventListener('click',()=>document.getElementById('mergeFolderInput').click());
        for(const id of ['mergeWavsInput','mergeFolderInput']) document.getElementById(id).addEventListener('change',event=>{
            selectMergeFiles(event.target.files || []);event.target.value='';
        });
        document.getElementById('mergeMp3Btn').addEventListener('click',async()=>{
            if(mergingAudio || batchRunning || activeRequests || folderChecking) return;
            if(!mergeFiles.length) return showMessage('합칠 WAV 파일이나 WAV 폴더를 먼저 불러오세요.');
            mergingAudio=true;lockControls();
            let context=null;
            try {
                mergeStatus.textContent='MP3 인코더 준비 중…';
                const library=await loadMp3Encoder();
                context=new (window.AudioContext || window.webkitAudioContext)({sampleRate:44100});
                const encoder=new library.Mp3Encoder(1,44100,Number(document.getElementById('mp3Bitrate').value));
                const blob=await encodeMergedWavs(mergeFiles,encoder,context,(done,total,name,fraction)=>{
                    mergeStatus.textContent=`MP3 변환 ${Math.floor((done+fraction)/total*100)}% · ${done}/${total} · ${name}`;
                });
                if(!blob.size) throw new Error('MP3 결과가 비어 있습니다.');
                if(mergedMp3Url) URL.revokeObjectURL(mergedMp3Url);
                mergedMp3Url=URL.createObjectURL(blob);
                const link=document.getElementById('mergedMp3Download');
                link.href=mergedMp3Url;link.download='FAUST_C24_V04_FULL.mp3';link.classList.remove('hidden');
                link.textContent=`전체 MP3 다운로드 (${(blob.size/1024/1024).toFixed(1)}MB)`;
                if(directoryHandle && !readOnlyFolder) {
                    await writeFile(link.download,blob);
                    const saved=await readBytes(link.download);
                    if(saved.byteLength!==blob.size || await sha256(saved)!==await sha256(await blob.arrayBuffer())) throw new Error('MP3 폴더 저장 검증 실패 · 완성된 MP3 다운로드 링크로 저장할 수 있습니다.');
                    mergeStatus.textContent=`WAV ${mergeFiles.length}개 → 단일 MP3 폴더 저장 및 검증 완료`;
                } else {link.click();mergeStatus.textContent=`WAV ${mergeFiles.length}개 → 단일 MP3 완성 · 다운로드 요청 완료`;} 
            } catch(error) {mergeStatus.textContent='MP3 처리 실패 · '+error.message;showMessage(error.message);}
            finally {if(context) await context.close().catch(()=>{});mergingAudio=false;lockControls();}
        });

        chooseFolderBtn.addEventListener('click',chooseDirectDirectory);
        document.getElementById('verifyFilesInput').addEventListener('change',async event=>{
            if(batchRunning || activeRequests || folderChecking || mergingAudio) return;
            const files=Array.from(event.target.files || []);
            if(!files.length) return;
            const map=new Map();
            try {
                for(const file of files) {
                    if(map.has(file.name)) throw new Error('중복 파일명: '+file.name);
                    map.set(file.name,file);
                }
                readOnlyFolder=true;
                directoryHandle={name:'선택한 파일',getFileHandle:async name=>{
                    const file=map.get(name);
                    if(!file) throw new DOMException('선택한 파일에 없음','NotFoundError');
                    return {getFile:async()=>file};
                }};
                await verifyDirectory();
                folderStatus.textContent+=' · 선택한 파일만 검사 · 저장은 기존 다운로드 사용';
                selectMergeFiles(files);
                retryReportStatus.textContent='WAV와 해당 .verified.json을 함께 선택하면 내용까지 검증합니다. 선택하지 않은 파일은 누락으로 표시됩니다. MP3 합치기에도 선택한 WAV를 자동으로 넣었습니다.';
            } catch(error) {showMessage(error.message);}
            finally {event.target.value='';}
        });
        promptInput.value = originalStory;
        processBtn.click();
    