
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


        const originalEpisode = {"schema_version": "faust-tts-2.0", "chapter": 3, "title": "Prolog im Himmel 천상의 서곡", "language": "ko-KR", "revision": "V04", "script_revision": "cleanroom-v1", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "voices": {"나레이터": "Charon", "시인": "Algieba", "지배인": "Rasalgethi", "희극 배우": "Puck", "라파엘": "Iapetus", "가브리엘": "Erinome", "미카엘": "Alnilam", "메피스토": "Fenrir", "메피스토펠레스": "Fenrir", "주": "Sadaltager", "하느님": "Sadaltager", "파우스트": "Orus", "지령": "Alnilam", "바그너": "Achird", "천사들의 합창": "Vindemiatrix", "여인들의 합창": "Sulafat", "제자들의 합창": "Gacrux", "직공 청년": "Puck", "두 번째 직공 청년": "Achird", "세 번째 직공 청년": "Zubenelgenubi", "네 번째 직공 청년": "Iapetus", "다섯 번째 직공 청년": "Orus", "다른 하녀": "Laomedeia", "첫 번째 하녀": "Kore", "시민의 딸": "Autonoe", "두 번째 학생": "Achird", "첫 번째 학생": "Fenrir", "첫 번째 시민": "Rasalgethi", "거지": "Achernar", "두 번째 시민": "Schedar", "세 번째 시민": "Alnilam", "노파": "Gacrux", "아가테": "Laomedeia", "군인": "Alnilam", "늙은 농부": "Gacrux", "정령들": "Callirrhoe", "정령들의 합창": "Vindemiatrix", "학생": "Leda", "프로슈": "Puck", "브란더": "Rasalgethi", "지벨": "Algenib", "알트마이어": "Schedar", "수컷 원숭이": "Puck", "마녀": "Gacrux", "그레첸": "Leda", "그레트헨": "Leda", "마르가레테": "Leda", "마르테": "Sulafat", "암컷 원숭이": "Laomedeia", "목동": "Achird", "춤추는 사람": "Achird", "춤추는 아가씨": "Aoede", "극장 지배인": "Rasalgethi", "극작가 / 시인": "Algieba", "대천사 라파엘": "Iapetus", "대천사 가브리엘": "Erinome", "대천사 미카엘": "Alnilam", "세 대천사의 공동 발화": "Iapetus", "주 / 하느님": "Sadaltager", "지령 · 대지의 정령": "Alnilam", "직공 청년들": "Puck", "다른 이 / 다른 무리 · 문맥별 상이": "Achird", "첫 번째 무리": "Puck", "첫 직공 청년": "Puck", "두 번째 무리": "Sadachbia", "하녀": "Laomedeia", "시민 집안의 처녀": "Autonoe", "늙은 여자": "Gacrux", "또 다른 시민 처녀 · 아가테로 불림": "Laomedeia", "군인들": "Alnilam", "모두 함께": "Achird", "술집 손님들의 합창": "Puck", "마녀 부엌의 동물들": "Sadachbia", "수컷 원숭이 · Kater 표기": "Puck", "수컷·암컷 원숭이 공동 발화": "Sadachbia", "마르가레테 / 그레첸": "Leda", "마르테 슈베르트라인": "Sulafat", "리스헨": "Laomedeia", "발렌틴": "Alnilam", "민중 / 군중": "Achird", "악령": "Algenib", "합창": "Rasalgethi", "도깨비불 · 산길 안내자": "Sadachbia", "파우스트·메피스토·도깨비불 공동 발화": "Orus", "마녀들": "Gacrux", "목소리": "Iapetus", "마녀 합창": "Autonoe", "마법사들 · 반쪽 합창": "Algenib", "나머지 반쪽 합창": "Laomedeia", "여러 목소리": "Sadachbia", "두 합창단 함께": "Alnilam", "반쪽 마녀": "Zephyr", "마녀들의 합창": "Autonoe", "장군": "Alnilam", "대신": "Sadaltager", "벼락출세자": "Pulcherrima", "작가": "Algieba", "잡동사니 파는 마녀": "Gacrux", "젊고 아름다운 춤 상대": "Aoede", "늙은 춤 상대": "Gacrux", "프로크토판타스미스트 · 유령 비판자": "Sadaltager", "세르비빌리스 · 공연 안내자": "Achird", "극장 감독": "Rasalgethi", "전령": "Iapetus", "오베론": "Orus", "퍽": "Puck", "아리엘": "Aoede", "티타니아": "Kore", "오케스트라 총주": "Rasalgethi", "독주 / 독창": "Erinome", "형성되고 있는 정령": "Zephyr", "한 쌍의 연인": "Leda", "호기심 많은 여행자": "Achird", "정통주의자": "Alnilam", "북방 예술가": "Algieba", "순수주의자": "Erinome", "젊은 마녀": "Laomedeia", "나이 든 부인": "Gacrux", "악장": "Schedar", "풍향계 · 변덕의 의인화": "Zubenelgenubi", "크세니엔 · 풍자시들의 의인화": "Iapetus", "헤닝스 · 풍자극 배역": "Rasalgethi", "무사게트 · 뮤즈의 인도자": "Algieba", "한때 시대의 천재였던 자": "Sadaltager", "두루미": "Iapetus", "세속의 자식": "Zubenelgenubi", "무용수": "Aoede", "무용 교사": "Kore", "바이올린 연주자": "Erinome", "독단주의자": "Alnilam", "관념론자": "Algieba", "실재론자": "Orus", "초자연주의자": "Vindemiatrix", "회의론자": "Schedar", "재주 좋은 무리": "Sadachbia", "서투른 무리": "Zubenelgenubi", "도깨비불들": "Zephyr", "별똥별": "Autonoe", "육중한 무리": "Algenib", "오케스트라": "Schedar", "릴리트 · Lilith": "Despina", "그레첸의 환영": "Leda", "검은 푸들": "Fenrir", "암컷 원숭이와 새끼들 · Kätzin / Junge": "Laomedeia", "천상의 군대 · himmlische Heerscharen": "Vindemiatrix", "성문 밖 농민들과 춤추는 사람들": "Achird", "대성당의 회중": "Rasalgethi", "검은 말 두 마리": "Orus", "처형장 주변 마녀 무리": "Gacrux"}, "scenes": [{"scene_id": "C03", "title": "파우스트 3장", "segments": [{"id": "C03_0000", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "극장 지배인이 말한 대로, 첫 무대는 하늘이었다. 구름 위로 빛이 쏟아지는 가운데 세 대천사가 하느님 앞으로 나왔다. 라파엘과 가브리엘, 미카엘은 저마다 다른 곳에서 본 세상의 모습을 노래했다. 가장 먼저 앞으로 나선 이는 라파엘이었다.", "scene_id": "c03-dense-001", "filename": "FAUST_C03_V04_0000_c03-dense-001_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0001", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "라파엘은 다른 별들과 어울려 정해진 길을 도는 해를 노래했다. 그 움직임을 다 이해할 수 없어도, 처음 만들어진 날처럼 눈부신 모습에서 천사들은 힘을 얻었다. 가브리엘이 말을 받았다. 땅은 눈이 따라가기 힘들 만큼 빠르게 돌고, 밝은 낮이 지나면 깊은 밤이 왔다. 바다는 바위에 거품을 뿌리며 땅과 함께 돌았다.", "scene_id": "c03-dense-002", "filename": "FAUST_C03_V04_0001_c03-dense-002_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0002", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "미카엘은 바다와 땅을 오가는 폭풍과 천둥에 앞서 달리는 번개를 바라봤다. 서로 뒤엉키는 거센 힘 속에서도 고요하게 밝아 오는 날을 천사들은 귀하게 여겼다. 세 천사는 끝으로 목소리를 모았다. 세상이 어떻게 움직이는지 다 알 수는 없어도 그 모습은 첫날처럼 놀라웠다.", "scene_id": "c03-dense-003", "filename": "FAUST_C03_V04_0002_c03-dense-003_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0003", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "찬양이 끝날 무렵, 메피스토가 빛 아래로 걸어왔다. 세상에서 잘못되는 일을 찾아내는 데 능한 악마였다. 그는 천사들처럼 장엄하게 노래할 생각이 없었다. 메피스토는 하느님을 향해 고개를 들었다.", "scene_id": "c03-dense-004", "filename": "FAUST_C03_V04_0003_c03-dense-004_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0004", "speaker": "메피스토", "kind": "dialogue", "cast_id": "character-008", "text": "땅이 어떤지 물으신다기에 저도 왔습니다. 저까지 여기 서 있다고 뭐라 하시진 않겠죠? 저 친구들처럼 근사하게 떠들었다간, 하느님도 웃음을 참기 힘드실 텐데요.", "scene_id": "c03-dense-004", "filename": "FAUST_C03_V04_0004_c03-dense-004_C008.wav", "voice": "Fenrir", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "거칠지 않은 중저음, 여유 있고 능청스러운 관찰자. 파우스트에게는 느긋한 반말로 약점을 찌른다. 마르테·낯선 사람에게는 예의 있는 척하는 해요체. 주 앞에서는 정중하되 빈정거린다. 웃음은 가끔 작게, 킬킬킬 반복·괴물 포효·특정 배우 성대모사 금지.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다. 파우스트에게 느긋한 반말, 주와 마르테·낯선 사람 앞에서는 공손한 척하는 말투. 상대가 진지할수록 혼자 재미있어하는 온도 차이. 과도한 킬킬거림·특정 배우나 작품의 목소리 모방 금지.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0005", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토가 보기에 사람들은 이성이란 선물을 받고도 그 머리로 제 삶을 더 힘들게 만들었다. 풀숲에서 뛰어올랐다가 같은 자리로 떨어지는 메뚜기처럼, 높이 올라가려 애쓰면서도 코앞의 쓸데없는 일에 끼어들었다. 하느님은 그의 불평이 끝나기를 기다렸다가 물었다.", "scene_id": "c03-dense-005", "filename": "FAUST_C03_V04_0005_c03-dense-005_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0006", "speaker": "주", "kind": "dialogue", "cast_id": "character-009", "text": "땅에서는 도무지 마음에 드는 것을 본 적이 없느냐?", "scene_id": "c03-dense-005", "filename": "FAUST_C03_V04_0006_c03-dense-005_C009.wav", "voice": "Sadaltager", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "낮고 따뜻한 권위. 판단을 서두르지 않으며 차분하게 질문하고 단언한다. 웅장한 효과음 없이 보통 발성.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0007", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 입가에서 웃음을 거두고 대답했다.", "scene_id": "c03-dense-006", "filename": "FAUST_C03_V04_0007_c03-dense-006_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0008", "speaker": "메피스토", "kind": "dialogue", "cast_id": "character-008", "text": "여전히 엉망입니다. 가엾어서 제가 굳이 더 괴롭히고 싶지도 않을 정도예요.", "scene_id": "c03-dense-006", "filename": "FAUST_C03_V04_0008_c03-dense-006_C008.wav", "voice": "Fenrir", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "거칠지 않은 중저음, 여유 있고 능청스러운 관찰자. 파우스트에게는 느긋한 반말로 약점을 찌른다. 마르테·낯선 사람에게는 예의 있는 척하는 해요체. 주 앞에서는 정중하되 빈정거린다. 웃음은 가끔 작게, 킬킬킬 반복·괴물 포효·특정 배우 성대모사 금지.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다. 파우스트에게 느긋한 반말, 주와 마르테·낯선 사람 앞에서는 공손한 척하는 말투. 상대가 진지할수록 혼자 재미있어하는 온도 차이. 과도한 킬킬거림·특정 배우나 작품의 목소리 모방 금지.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0009", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "하느님은 사람을 한꺼번에 평가하는 그에게 한 사람을 콕 집어 물었다.", "scene_id": "c03-dense-007", "filename": "FAUST_C03_V04_0009_c03-dense-007_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0010", "speaker": "주", "kind": "dialogue", "cast_id": "character-009", "text": "파우스트를 아느냐?", "scene_id": "c03-dense-007", "filename": "FAUST_C03_V04_0010_c03-dense-007_C009.wav", "voice": "Sadaltager", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "낮고 따뜻한 권위. 판단을 서두르지 않으며 차분하게 질문하고 단언한다. 웅장한 효과음 없이 보통 발성.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0011", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토가 되물었다.", "scene_id": "c03-dense-007", "filename": "FAUST_C03_V04_0011_c03-dense-007_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0012", "speaker": "메피스토", "kind": "dialogue", "cast_id": "character-008", "text": "그 박사 말씀이십니까?", "scene_id": "c03-dense-007", "filename": "FAUST_C03_V04_0012_c03-dense-007_C008.wav", "voice": "Fenrir", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "거칠지 않은 중저음, 여유 있고 능청스러운 관찰자. 파우스트에게는 느긋한 반말로 약점을 찌른다. 마르테·낯선 사람에게는 예의 있는 척하는 해요체. 주 앞에서는 정중하되 빈정거린다. 웃음은 가끔 작게, 킬킬킬 반복·괴물 포효·특정 배우 성대모사 금지.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다. 파우스트에게 느긋한 반말, 주와 마르테·낯선 사람 앞에서는 공손한 척하는 말투. 상대가 진지할수록 혼자 재미있어하는 온도 차이. 과도한 킬킬거림·특정 배우나 작품의 목소리 모방 금지.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0013", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "하느님은 그를 짧게 소개했다.", "scene_id": "c03-dense-007", "filename": "FAUST_C03_V04_0013_c03-dense-007_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0014", "speaker": "주", "kind": "dialogue", "cast_id": "character-009", "text": "나를 섬기는 사람이지.", "scene_id": "c03-dense-007", "filename": "FAUST_C03_V04_0014_c03-dense-007_C009.wav", "voice": "Sadaltager", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "낮고 따뜻한 권위. 판단을 서두르지 않으며 차분하게 질문하고 단언한다. 웅장한 효과음 없이 보통 발성.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0015", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 그 학자가 평온하게 사는 모습을 떠올릴 수 없었다. 그가 내놓은 대답에는 웃음기가 돌아와 있었다.", "scene_id": "c03-dense-008", "filename": "FAUST_C03_V04_0015_c03-dense-008_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0016", "speaker": "메피스토", "kind": "dialogue", "cast_id": "character-008", "text": "섬기는 방법이 독특하더군요. 하늘에서는 가장 예쁜 별을 달라 하고, 땅에서는 제일 좋은 즐거움을 다 누리겠답니다. 자기도 자기가 지나치다는 건 조금 알아요. 그래도 가까운 걸 주면 먼 곳을 보고, 먼 데까지 데려가면 또 다른 걸 찾습니다.", "scene_id": "c03-dense-008", "filename": "FAUST_C03_V04_0016_c03-dense-008_C008.wav", "voice": "Fenrir", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "거칠지 않은 중저음, 여유 있고 능청스러운 관찰자. 파우스트에게는 느긋한 반말로 약점을 찌른다. 마르테·낯선 사람에게는 예의 있는 척하는 해요체. 주 앞에서는 정중하되 빈정거린다. 웃음은 가끔 작게, 킬킬킬 반복·괴물 포효·특정 배우 성대모사 금지.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다. 파우스트에게 느긋한 반말, 주와 마르테·낯선 사람 앞에서는 공손한 척하는 말투. 상대가 진지할수록 혼자 재미있어하는 온도 차이. 과도한 킬킬거림·특정 배우나 작품의 목소리 모방 금지.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0017", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "하느님은 파우스트가 아직 답을 찾지 못했다는 점에는 동의했다. 다만 지금 모습이 그 사람의 끝이라고 생각하지 않았다.", "scene_id": "c03-dense-009", "filename": "FAUST_C03_V04_0017_c03-dense-009_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0018", "speaker": "주", "kind": "dialogue", "cast_id": "character-009", "text": "아직 제 뜻을 잘 모르는 채 나를 섬긴다. 그래도 차츰 길을 알게 될 것이다. 정원사는 어린 나무에 잎이 나면 몇 해 뒤 맺힐 열매까지 보지.", "scene_id": "c03-dense-009", "filename": "FAUST_C03_V04_0018_c03-dense-009_C009.wav", "voice": "Sadaltager", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "낮고 따뜻한 권위. 판단을 서두르지 않으며 차분하게 질문하고 단언한다. 웅장한 효과음 없이 보통 발성.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0019", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 그 나무가 어디로 자랄지 직접 시험해 보고 싶었다.", "scene_id": "c03-dense-010", "filename": "FAUST_C03_V04_0019_c03-dense-010_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0020", "speaker": "메피스토", "kind": "dialogue", "cast_id": "character-008", "text": "그럼 내기하시겠습니까? 제가 그 사람을 제 쪽으로 데려와 보죠.", "scene_id": "c03-dense-010", "filename": "FAUST_C03_V04_0020_c03-dense-010_C008.wav", "voice": "Fenrir", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "거칠지 않은 중저음, 여유 있고 능청스러운 관찰자. 파우스트에게는 느긋한 반말로 약점을 찌른다. 마르테·낯선 사람에게는 예의 있는 척하는 해요체. 주 앞에서는 정중하되 빈정거린다. 웃음은 가끔 작게, 킬킬킬 반복·괴물 포효·특정 배우 성대모사 금지.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다. 파우스트에게 느긋한 반말, 주와 마르테·낯선 사람 앞에서는 공손한 척하는 말투. 상대가 진지할수록 혼자 재미있어하는 온도 차이. 과도한 킬킬거림·특정 배우나 작품의 목소리 모방 금지.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0021", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "하느님이 허락했다.", "scene_id": "c03-dense-010", "filename": "FAUST_C03_V04_0021_c03-dense-010_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0022", "speaker": "주", "kind": "dialogue", "cast_id": "character-009", "text": "그가 살아 있는 동안 해 보아라. 사람은 무언가를 찾는 동안 길을 잘못 들기도 한다.", "scene_id": "c03-dense-010", "filename": "FAUST_C03_V04_0022_c03-dense-010_C009.wav", "voice": "Sadaltager", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "낮고 따뜻한 권위. 판단을 서두르지 않으며 차분하게 질문하고 단언한다. 웅장한 효과음 없이 보통 발성.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0023", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토는 손을 들며 허락을 반겼다.", "scene_id": "c03-dense-011", "filename": "FAUST_C03_V04_0023_c03-dense-011_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0024", "speaker": "메피스토", "kind": "dialogue", "cast_id": "character-008", "text": "죽은 사람에겐 저도 볼일 없습니다. 얼굴에 피가 돌고 아직 뭘 고를지 모르는 사람이 좋죠. 고양이가 쥐 앞에 있을 때처럼요.", "scene_id": "c03-dense-011", "filename": "FAUST_C03_V04_0024_c03-dense-011_C008.wav", "voice": "Fenrir", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "거칠지 않은 중저음, 여유 있고 능청스러운 관찰자. 파우스트에게는 느긋한 반말로 약점을 찌른다. 마르테·낯선 사람에게는 예의 있는 척하는 해요체. 주 앞에서는 정중하되 빈정거린다. 웃음은 가끔 작게, 킬킬킬 반복·괴물 포효·특정 배우 성대모사 금지.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다. 파우스트에게 느긋한 반말, 주와 마르테·낯선 사람 앞에서는 공손한 척하는 말투. 상대가 진지할수록 혼자 재미있어하는 온도 차이. 과도한 킬킬거림·특정 배우나 작품의 목소리 모방 금지.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0025", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "하느님은 메피스토가 무엇을 노리는지 알아들었다. 그래도 파우스트가 갈 길을 대신 정해 줄 생각은 없었다.", "scene_id": "c03-dense-012", "filename": "FAUST_C03_V04_0025_c03-dense-012_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0026", "speaker": "주", "kind": "dialogue", "cast_id": "character-009", "text": "할 수 있다면 그를 자기가 나온 자리에서 떼어 내 네 길로 끌고 가 보아라. 다만 어디로 가야 할지 몰라 헤매는 사람도, 마음 깊은 곳에서는 어느 쪽이 옳은지 알아차릴 때가 있지.", "scene_id": "c03-dense-012", "filename": "FAUST_C03_V04_0026_c03-dense-012_C009.wav", "voice": "Sadaltager", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "낮고 따뜻한 권위. 판단을 서두르지 않으며 차분하게 질문하고 단언한다. 웅장한 효과음 없이 보통 발성.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0027", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "메피스토가 자신만만하게 손바닥을 폈다.", "scene_id": "c03-dense-013", "filename": "FAUST_C03_V04_0027_c03-dense-013_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0028", "speaker": "메피스토", "kind": "dialogue", "cast_id": "character-008", "text": "오래 걸리진 않을 겁니다. 제가 이기면 마음껏 기뻐하게 해 주세요. 그 친구가 뱀처럼 흙바닥을 핥고도 좋다고 하게 만들 테니까요.", "scene_id": "c03-dense-013", "filename": "FAUST_C03_V04_0028_c03-dense-013_C008.wav", "voice": "Fenrir", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "거칠지 않은 중저음, 여유 있고 능청스러운 관찰자. 파우스트에게는 느긋한 반말로 약점을 찌른다. 마르테·낯선 사람에게는 예의 있는 척하는 해요체. 주 앞에서는 정중하되 빈정거린다. 웃음은 가끔 작게, 킬킬킬 반복·괴물 포효·특정 배우 성대모사 금지.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다. 파우스트에게 느긋한 반말, 주와 마르테·낯선 사람 앞에서는 공손한 척하는 말투. 상대가 진지할수록 혼자 재미있어하는 온도 차이. 과도한 킬킬거림·특정 배우나 작품의 목소리 모방 금지.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0029", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "하느님은 그에게 길을 열어 준 까닭을 밝혔다.", "scene_id": "c03-dense-013", "filename": "FAUST_C03_V04_0029_c03-dense-013_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0030", "speaker": "주", "kind": "dialogue", "cast_id": "character-009", "text": "사람은 편해지면 하던 일도 쉽게 놓는다. 네가 옆에서 자꾸 들쑤시면 적어도 그대로 주저앉지는 않겠지.", "scene_id": "c03-dense-013", "filename": "FAUST_C03_V04_0030_c03-dense-013_C009.wav", "voice": "Sadaltager", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "natural_character_dialogue", "pause_after_ms": 280, "character_persona": "낮고 따뜻한 권위. 판단을 서두르지 않으며 차분하게 질문하고 단언한다. 웅장한 효과음 없이 보통 발성.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "장면 속 상대에게 보통 거리에서 말하는 또렷한 일상 발성. 같은 배역의 음색을 유지하고 자연스러운 질문·대답 리듬. 마음속 말처럼 속삭이거나 잔향을 넣지 않는다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0031", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "하느님은 천사들에게 끊임없이 달라지고 자라는 세상을 사랑으로 지켜보라고 했다. 눈앞에서 흔들리며 사라지는 모습도 생각 속에는 오래 남길 수 있었다. 빛이 닫히고 세 천사가 흩어지자 메피스토만 남았다.", "scene_id": "c03-dense-014", "filename": "FAUST_C03_V04_0031_c03-dense-014_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}, {"id": "C03_0032", "speaker": "메피스토", "kind": "monologue", "cast_id": "character-008", "text": "오랜만에 뵙는 것도 괜찮네. 저렇게 높은 분이 악마하고 저 정도로 말을 섞어 준다는 것부터 재미있잖아.", "scene_id": "c03-dense-014", "filename": "FAUST_C03_V04_0032_c03-dense-014_C008.wav", "voice": "Fenrir", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.55, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 500, "character_persona": "거칠지 않은 중저음, 여유 있고 능청스러운 관찰자. 파우스트에게는 느긋한 반말로 약점을 찌른다. 마르테·낯선 사람에게는 예의 있는 척하는 해요체. 주 앞에서는 정중하되 빈정거린다. 웃음은 가끔 작게, 킬킬킬 반복·괴물 포효·특정 배우 성대모사 금지.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다. 파우스트에게 느긋한 반말, 주와 마르테·낯선 사람 앞에서는 공손한 척하는 말투. 상대가 진지할수록 혼자 재미있어하는 온도 차이. 과도한 킬킬거림·특정 배우나 작품의 목소리 모방 금지.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하게. 성대가 울리는 보통 말소리와 또렷한 자음을 유지한다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. ASMR 입소리·과도한 숨소리 금지. 잔향 없이 생성하고 짧은 에코는 후처리한다.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "echo-v4"}}, {"id": "C03_0033", "speaker": "나레이터", "kind": "narration", "cast_id": "narrator", "text": "그가 시험할 사람은 이 이야기를 아직 몰랐다. 땅에서는 파우스트가 책을 펴 놓고, 공부를 더 한다고 해서 무엇이 달라지기는 할지 묻고 있었다.", "scene_id": "c03-dense-014", "filename": "FAUST_C03_V04_0033_c03-dense-014_NARRATOR.wav", "voice": "Charon", "model": "gemini-2.5-flash-preview-tts", "cast_revision": "CAST-2026-11-18", "cast_sha256": "37f593d8bca2eaf53225443bc621734c87dc6405ac238412065bdde8df0a6ca9", "performance": {"emotion": "본문과 앞뒤 맥락의 감정에 맞춤; 과도한 비극·흥분으로 단정하지 않음", "intensity": 0.42, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 450, "character_persona": "중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.", "character_state": "same identity", "acting_notes": "앞뒤 구간의 상황에 맞춰 감정을 연결한다. 현재 발화의 단어를 바꾸거나 대사·인물·효과음을 추가하지 않는다.", "mic_direction": "중학생에게 이야기하듯 편안하고 또렷한 보통 음량. 인물 대사를 흉내 내지 말고 문맥과 행동을 친절하게 잇는다. 속삭임·잔향 없음.", "nonverbal": "필요한 짧은 멈춤과 자연스러운 호흡만. 웃음은 문맥에 맞을 때 작게, 매 문장 반복 금지. 울음·기침·비명·노래·배경음은 본문 근거 없이 추가하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 지시문·화자 이름은 낭독하지 않는다.", "audio_effect": "dry"}}]}]};
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
                const name='FAUST_C03_V04_RETRY.json';
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
                link.href=mergedMp3Url;link.download='FAUST_C03_V04_FULL.mp3';link.classList.remove('hidden');
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
    