
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


        const originalEpisode = {"schema_version": "faust-tts-1.0", "chapter": 5, "title": "봄빛 속의 두 마음", "language": "ko-KR", "revision": "V04", "voices": {"나레이터": "Charon", "시인": "Charon", "지배인": "Orus", "희극 배우": "Puck", "라파엘": "Sulafat", "가브리엘": "Kore", "미카엘": "Orus", "메피스토펠레스": "Fenrir", "파우스트": "Orus", "바그너": "Puck", "직공 청년": "Puck", "세 번째 직공 청년": "Puck", "다섯 번째 직공 청년": "Orus", "첫 번째 하녀": "Kore", "다른 하녀": "Sulafat", "시민의 딸": "Kore", "두 번째 학생": "Puck", "첫 번째 학생": "Fenrir", "첫 번째 시민": "Orus", "거지": "Charon", "두 번째 시민": "Fenrir", "세 번째 시민": "Orus", "노파": "Sulafat", "아가테": "Kore", "군인": "Fenrir", "목동": "Puck", "춤추는 사람": "Puck", "춤추는 아가씨": "Kore", "늙은 농부": "Charon"}, "scenes": [{"scene_id": "C05", "title": "파우스트 5장", "segments": [{"id": "C05_0000", "speaker": "나레이터", "text": "성문 밖으로 사람들이 쏟아져 나왔다. 손으로 물건을 만드는 직공 청년들도 부활절에는 일을 쉬었다. 그들은 어디로 놀러 갈지 의논했다. 사냥꾼의 집으로 가자는 무리와 물레방앗간을 찾자는 무리가 서로 다른 길을 가리켰다.", "scene_id": "c05-dense-001", "filename": "FAUST_C05_V04_0000_c05-dense-001_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0001", "speaker": "직공 청년", "text": "오늘만큼은 일터 생각을 내려놓고, 마음 가는 데로 걷고 싶어.", "scene_id": "c05-dense-001", "filename": "FAUST_C05_V04_0001_c05-dense-001_ART.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0002", "speaker": "나레이터", "text": "물가의 농장을 추천하는 목소리도 나왔다. 다른 청년은 그곳으로 가는 길이 좋지 않다며 고개를 저었다. 누군가 행선지를 묻자, 세 번째 청년은 다른 이들을 따라가겠다고 답했다. 같은 휴일에도 혼자 가고 싶은 길과 함께 가고 싶은 마음은 달랐다.", "scene_id": "c05-dense-002", "filename": "FAUST_C05_V04_0002_c05-dense-002_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0003", "speaker": "세 번째 직공 청년", "text": "어디든 좋아. 오늘은 친구들과 함께 가면 되니까.", "scene_id": "c05-dense-002", "filename": "FAUST_C05_V04_0003_c05-dense-002_ART3.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0004", "speaker": "나레이터", "text": "한 청년이 부르크도르프로 가면 좋은 맥주와 아가씨들, 신나는 싸움까지 있다고 자랑했다. 다른 청년은 또 매를 맞고 싶으냐며 그곳을 피했다. 누군가에게는 모험인 일이 누군가에게는 불편한 기억이었다. 옆에서는 남의 집에서 집안일을 하던 하녀가 돌아가겠다고 말했다.", "scene_id": "c05-dense-003", "filename": "FAUST_C05_V04_0004_c05-dense-003_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0005", "speaker": "다섯 번째 직공 청년", "text": "싸움까지 놀이처럼 생각하고 싶지는 않아. 즐겁게 다녀올 곳이면 좋겠어.", "scene_id": "c05-dense-003", "filename": "FAUST_C05_V04_0005_c05-dense-003_ART5.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0006", "speaker": "나레이터", "text": "두 하녀 사이에도 작은 다툼이 있었다. 한 사람은 포플러나무 곁에 있을 남자를 만나러 가자고 했지만, 다른 사람은 시내로 돌아가려 했다. 그 남자가 친구하고만 걷고 춤출 거라고 생각하니 자신은 들러리처럼 느껴졌다.", "scene_id": "c05-dense-004", "filename": "FAUST_C05_V04_0006_c05-dense-004_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0007", "speaker": "첫 번째 하녀", "text": "친구가 즐거운 건 좋지만, 나 혼자 곁에서 기다리게 되지는 않을까?", "scene_id": "c05-dense-004", "filename": "FAUST_C05_V04_0007_c05-dense-004_MAID1.wav", "voice": "Kore", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "입가의 미소가 들리는 밝은 호흡. 필요시 짧은 작은 웃음 한 번.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0008", "speaker": "나레이터", "text": "친구는 오늘 그 남자에게 곱슬머리 동행이 있을 거라며 설득했다. 한편 근처의 학생들은 곱게 차려입은 하녀들을 보고 함께 따라가자고 했다. 모두 같은 길을 걷고 있어도 누구를 기다리고 누구를 바라보는지는 달랐다.", "scene_id": "c05-dense-005", "filename": "FAUST_C05_V04_0008_c05-dense-005_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0009", "speaker": "다른 하녀", "text": "혼자 남을까 봐 걱정하는 거구나. 오늘은 함께 즐길 수 있으면 좋겠는데.", "scene_id": "c05-dense-005", "filename": "FAUST_C05_V04_0009_c05-dense-005_MAID2.wav", "voice": "Sulafat", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0010", "speaker": "나레이터", "text": "한 학생은 맥주와 담배, 하녀들과 어울리는 일이 마음에 든다고 떠들었다. 시민 집안의 아가씨들은 그 학생들이 자기들 대신 하녀들을 따라간다며 못마땅해했다. 그들의 말에는 서운함뿐 아니라 집안과 직업에 따라 사람을 가르는 태도도 섞여 있었다.", "scene_id": "c05-dense-006", "filename": "FAUST_C05_V04_0010_c05-dense-006_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0011", "speaker": "시민의 딸", "text": "왜 저쪽으로만 가는 거지? 우리를 못 본 걸까, 보고도 지나친 걸까?", "scene_id": "c05-dense-006", "filename": "FAUST_C05_V04_0011_c05-dense-006_DAU.wav", "voice": "Kore", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0012", "speaker": "나레이터", "text": "두 번째 학생은 뒤에서 오는 이웃집 아가씨를 알아보았다. 그는 친구에게 조금 천천히 가자고 했다. 조용히 걷는 그 아가씨에게 마음이 있었기 때문이다. 하지만 첫 번째 학생은 눈치를 보는 자리는 싫다며 서둘렀다.", "scene_id": "c05-dense-007", "filename": "FAUST_C05_V04_0012_c05-dense-007_NAR.wav", "voice": "Charon", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0013", "speaker": "두 번째 학생", "text": "지금 가 버리면 말 한마디 못 걸겠지. 조금만 기다려 주면 좋을 텐데.", "scene_id": "c05-dense-007", "filename": "FAUST_C05_V04_0013_c05-dense-007_STU2.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0014", "speaker": "나레이터", "text": "첫 번째 학생은 하녀들을 놓치지 말자며 걸음을 재촉했다. 그는 사람을 사냥감에 빗대고, 평소 빗자루를 잡던 손을 두고 가벼운 농담을 했다. 들뜬 말 속에서도 상대가 무엇을 원하는지는 묻지 않았다.", "scene_id": "c05-dense-008", "filename": "FAUST_C05_V04_0014_c05-dense-008_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0015", "speaker": "첫 번째 학생", "text": "오늘은 복잡하게 생각하지 말고 즐기고 싶어. 친구도 금방 따라오겠지.", "scene_id": "c05-dense-008", "filename": "FAUST_C05_V04_0015_c05-dense-008_STU1.wav", "voice": "Fenrir", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0016", "speaker": "나레이터", "text": "다른 쪽에서는 새 시장에 대한 불평이 들렸다. 한 시민은 시장이 자리에 오른 뒤 더 거만해졌다고 말했다. 도시를 위한 일은 보이지 않고 명령과 부담만 늘었다는 것이었다. 휴일의 즐거움 속에도 생활의 걱정은 따라 나왔다.", "scene_id": "c05-dense-009", "filename": "FAUST_C05_V04_0016_c05-dense-009_NAR.wav", "voice": "Charon", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0017", "speaker": "첫 번째 시민", "text": "이렇게 사람들이 모였을 때라도 답답한 속을 좀 풀어야겠어.", "scene_id": "c05-dense-009", "filename": "FAUST_C05_V04_0017_c05-dense-009_CIT1.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0018", "speaker": "나레이터", "text": "사람들은 전보다 더 많이 복종하고 더 많은 돈을 내야 한다며 투덜거렸다. 그들 곁에서 거지가 노래를 불렀다. 곱게 차려입은 이들에게 자기 어려움도 돌아봐 달라는 부탁이었다. 모두의 축일이 그에게도 배고픔을 덜 수 있는 날이기를 바랐다.", "scene_id": "c05-dense-010", "filename": "FAUST_C05_V04_0018_c05-dense-010_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0019", "speaker": "거지", "text": "오늘은 내 목소리를 듣고 잠깐 멈춰 주는 사람이 있을까?", "scene_id": "c05-dense-010", "filename": "FAUST_C05_V04_0019_c05-dense-010_BEG.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0020", "speaker": "나레이터", "text": "어떤 시민에게 휴일의 즐거움은 먼 나라의 전쟁 이야기를 나누는 일이었다. 강을 지나는 배를 보고 술잔을 비운 뒤 평화로운 집으로 돌아가면 된다고 그는 말했다. 전쟁을 겪는 사람들의 고통은 그가 말하는 즐거움에서 멀리 밀려나 있었다.", "scene_id": "c05-dense-011", "filename": "FAUST_C05_V04_0020_c05-dense-011_NAR.wav", "voice": "Charon", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0021", "speaker": "두 번째 시민", "text": "저 먼 곳은 시끄러워도, 나는 오늘 무사히 집에 돌아갈 수 있겠지.", "scene_id": "c05-dense-011", "filename": "FAUST_C05_V04_0021_c05-dense-011_CIT2.wav", "voice": "Fenrir", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0022", "speaker": "나레이터", "text": "이웃 시민도 자기 집만 예전 같으면 된다고 맞장구쳤다. 남의 불행은 멀리 두고 자기 평안만 챙기는 말이었다. 그 무렵 노파가 곱게 차려입은 아가씨들에게 다가갔다. 길 위의 대화는 전쟁에서 다시 연애 이야기로 옮겨 갔다.", "scene_id": "c05-dense-012", "filename": "FAUST_C05_V04_0022_c05-dense-012_NAR.wav", "voice": "Charon", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0023", "speaker": "세 번째 시민", "text": "세상일을 내가 다 바꿀 수는 없잖아. 적어도 우리 집은 편안했으면 해.", "scene_id": "c05-dense-012", "filename": "FAUST_C05_V04_0023_c05-dense-012_CIT3.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0024", "speaker": "나레이터", "text": "노파는 젊은 아가씨들의 차림을 칭찬하며, 그들이 원하는 것을 이루어 줄 수 있다고 말했다. 누군가에게 사랑받고 싶은 마음을 짐작한 것이다. 다정하게 들리는 말이었지만, 아가씨들은 사람들 앞에서 노파와 가까이 보이는 것을 꺼렸다.", "scene_id": "c05-dense-013", "filename": "FAUST_C05_V04_0024_c05-dense-013_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0025", "speaker": "노파", "text": "무슨 소원을 품었는지 얼굴에 다 보이는구나. 그래도 내 앞에서는 모르는 척하겠지.", "scene_id": "c05-dense-013", "filename": "FAUST_C05_V04_0025_c05-dense-013_OLDW.wav", "voice": "Sulafat", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0026", "speaker": "나레이터", "text": "한 아가씨가 아가테를 부르며 자리를 뜨자고 했다. 두 사람은 노파가 미래의 연인을 보여 주었다고 이야기했다. 그것이 정말 앞날을 본 것인지는 알 수 없었지만, 그 기억은 낯선 사람들을 바라보는 눈길에 남아 있었다. 이어 군인들의 노래가 들렸다.", "scene_id": "c05-dense-014", "filename": "FAUST_C05_V04_0026_c05-dense-014_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0027", "speaker": "아가테", "text": "그때 보았다고 믿은 얼굴을, 그래서 자꾸 사람들 사이에서 찾게 되는 걸까?", "scene_id": "c05-dense-014", "filename": "FAUST_C05_V04_0027_c05-dense-014_AGA.wav", "voice": "Kore", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0028", "speaker": "나레이터", "text": "군인들은 높은 성과 도도한 아가씨들을 모두 정복하겠다는 노래를 불렀다. 나팔 소리는 즐거운 행진에도, 위험한 전장으로 향할 때에도 울린다고 했다. 신나는 가락 아래에는 전쟁과 지배를 자랑하는 거친 마음이 숨어 있었다.", "scene_id": "c05-dense-015", "filename": "FAUST_C05_V04_0028_c05-dense-015_NAR.wav", "voice": "Charon", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0029", "speaker": "군인", "text": "노래를 함께 부르면 겁이 조금 멀어져. 하지만 이 길 끝이 늘 축제인 것은 아니겠지.", "scene_id": "c05-dense-015", "filename": "FAUST_C05_V04_0029_c05-dense-015_SOL.wav", "voice": "Fenrir", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0030", "speaker": "나레이터", "text": "군인들이 떠나고 파우스트와 바그너의 모습이 이어졌다. 밤새 닫힌 방에 있던 파우스트는 이제 봄볕 아래를 걷고 있었다. 강과 시냇물의 얼음이 풀리고 골짜기에는 초록빛이 돌아왔다. 그는 겨울이 약해져 산속으로 물러나는 듯하다고 느꼈다.", "scene_id": "c05-dense-016", "filename": "FAUST_C05_V04_0030_c05-dense-016_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0031", "speaker": "파우스트", "text": "어젯밤에는 세상이 멈춘 것 같았는데, 밖에서는 이렇게 봄이 오고 있었구나.", "scene_id": "c05-dense-016", "filename": "FAUST_C05_V04_0031_c05-dense-016_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0032", "speaker": "나레이터", "text": "먼 산에 겨울의 기운이 남아 있어도 들판은 살아나고 있었다. 파우스트는 뒤를 돌아 성문에서 나오는 사람들을 보라고 바그너에게 말했다. 아직 꽃이 드문 들판을 알록달록한 옷들이 채웠다. 오래된 도시가 사람들의 발걸음으로 바깥까지 넓어지는 듯했다.", "scene_id": "c05-dense-017", "filename": "FAUST_C05_V04_0032_c05-dense-017_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0033", "speaker": "파우스트", "text": "책상 앞에서는 보지 못한 빛깔이 이렇게 많았어.", "scene_id": "c05-dense-017", "filename": "FAUST_C05_V04_0033_c05-dense-017_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0034", "speaker": "나레이터", "text": "파우스트는 사람들이 부활절에 자기들 역시 되살아난 것 같다고 말했다. 실제로 죽었다 살아났다는 뜻은 아니었다. 좁은 방과 일터를 벗어나 햇빛 속에서 숨을 돌리는 모습이 새 삶을 얻은 것처럼 보였던 것이다. 정원과 들판, 강 위의 배마다 휴일을 즐기는 사람들이 있었다.", "scene_id": "c05-dense-018", "filename": "FAUST_C05_V04_0034_c05-dense-018_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0035", "speaker": "파우스트", "text": "저 사람들도 숨 막히는 날들을 견뎠겠지. 그래서 오늘의 햇빛이 더 반가운 걸 거야.", "scene_id": "c05-dense-018", "filename": "FAUST_C05_V04_0035_c05-dense-018_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0036", "speaker": "나레이터", "text": "파우스트는 이곳에서 자신도 한 사람의 인간으로 살아 있어도 좋다고 느꼈다. 그러나 바그너에게 시끌벅적한 소리는 거칠고 불편했다. 존경하는 박사와 걷는 것은 기뻤지만, 사람들의 놀이를 같은 마음으로 즐기지는 못했다. 두 사람은 같은 축제에서 서로 다른 것을 듣고 있었다.", "scene_id": "c05-dense-019", "filename": "FAUST_C05_V04_0036_c05-dense-019_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0037", "speaker": "바그너", "text": "박사님이 좋으시다면 따라가겠지만, 나는 조용한 곳에서 이야기하고 싶어.", "scene_id": "c05-dense-019", "filename": "FAUST_C05_V04_0037_c05-dense-019_WAG.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0038", "speaker": "나레이터", "text": "보리수 아래에서는 농민들이 노래하며 춤을 추고 있었다. 노래 속 목동은 알록달록한 웃옷과 리본, 화관으로 멋을 냈다. 사람들의 일상적인 즐거움이 음악과 차림새에 그대로 드러났다.", "scene_id": "c05-dense-020", "filename": "FAUST_C05_V04_0038_c05-dense-020_NAR.wav", "voice": "Charon", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0039", "speaker": "목동", "text": "오늘만큼은 나도 멋을 내고 춤판에 끼어 볼까?", "scene_id": "c05-dense-020", "filename": "FAUST_C05_V04_0039_c05-dense-020_SHEP.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0040", "speaker": "나레이터", "text": "나무 둘레에는 사람들이 가득했다. 바이올린 가락에 맞춰 원을 그리며 돌고, 신나는 후렴을 함께 외쳤다. 누가 홀로 노래를 잘하는지보다 서로 박자를 나누는 일이 이 자리를 움직였다.", "scene_id": "c05-dense-021", "filename": "FAUST_C05_V04_0040_c05-dense-021_NAR.wav", "voice": "Charon", "performance": {"emotion": "상실과 그리움, 절제된 울먹임", "intensity": 0.4, "pace": "slow", "delivery": "warm_storytelling", "pause_after_ms": 650, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0041", "speaker": "춤추는 사람", "text": "조금 틀려도 괜찮아. 옆 사람 발걸음에 맞추면 다시 이어질 테니까.", "scene_id": "c05-dense-021", "filename": "FAUST_C05_V04_0041_c05-dense-021_DAN.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0042", "speaker": "나레이터", "text": "노래 속 목동은 급히 끼어들다가 팔꿈치로 아가씨를 건드렸다. 아가씨는 돌아보며 버릇없이 굴지 말라고 말했다. 즐거운 춤판이라고 해서 모든 행동이 반가운 것은 아니었다.", "scene_id": "c05-dense-022", "filename": "FAUST_C05_V04_0042_c05-dense-022_NAR.wav", "voice": "Charon", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0043", "speaker": "춤추는 아가씨", "text": "같이 춤추는 건 좋지만, 나를 함부로 대해도 된다는 뜻은 아니야.", "scene_id": "c05-dense-022", "filename": "FAUST_C05_V04_0043_c05-dense-022_DANW.wav", "voice": "Kore", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0044", "speaker": "나레이터", "text": "말이 오가는 사이에도 후렴은 끊기지 않았다. 사람들은 숨을 맞추며 둥근 춤을 이어 갔다. 웃음과 외침, 악기 소리가 보리수 아래에서 한데 섞였다.", "scene_id": "c05-dense-023", "filename": "FAUST_C05_V04_0044_c05-dense-023_NAR.wav", "voice": "Charon", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0045", "speaker": "춤추는 사람", "text": "저쪽에서 부르면 이쪽도 답하고, 그렇게 우리 노래가 이어지는구나.", "scene_id": "c05-dense-023", "filename": "FAUST_C05_V04_0045_c05-dense-023_DAN.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0046", "speaker": "나레이터", "text": "춤은 오른쪽으로도 왼쪽으로도 이어졌다. 치맛자락이 움직이고 얼굴에는 열기가 올랐다. 한바탕 돌고 나면 팔짱을 끼고 숨을 돌렸다. 몸이 지치는 순간까지도 사람들은 혼자가 아니라 함께 쉬고 있었다.", "scene_id": "c05-dense-024", "filename": "FAUST_C05_V04_0046_c05-dense-024_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0047", "speaker": "춤추는 아가씨", "text": "숨이 차네. 잠깐 쉬었다가 다음 가락에 다시 들어가야겠어.", "scene_id": "c05-dense-024", "filename": "FAUST_C05_V04_0047_c05-dense-024_DANW.wav", "voice": "Kore", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0048", "speaker": "나레이터", "text": "신나는 후렴이 다시 울렸다. 같은 말이 되풀이되어도 그 소리를 내는 사람들의 숨과 표정은 조금씩 달라졌다. 파우스트가 어젯밤 홀로 들었던 합창과 달리, 지금은 눈앞의 사람들이 몸을 움직이며 살아 있음을 드러냈다.", "scene_id": "c05-dense-025", "filename": "FAUST_C05_V04_0048_c05-dense-025_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0049", "speaker": "춤추는 아가씨", "text": "이 노래를 오늘 함께 불렀다는 일은, 나중에도 기억나겠지.", "scene_id": "c05-dense-025", "filename": "FAUST_C05_V04_0049_c05-dense-025_DANW.wav", "voice": "Kore", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0050", "speaker": "나레이터", "text": "노래 속 아가씨는 너무 허물없이 굴지 말라고 다시 말했다. 약혼녀에게 거짓말한 남자들도 많다는 걱정이었다. 상대의 달콤한 말에 흔들리는 마음과 자신을 지키려는 마음이 함께 있었다.", "scene_id": "c05-dense-026", "filename": "FAUST_C05_V04_0050_c05-dense-026_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0051", "speaker": "춤추는 아가씨", "text": "좋은 말이 듣기 싫은 건 아니야. 그래도 그 말을 믿어도 되는지는 내가 생각할 거야.", "scene_id": "c05-dense-026", "filename": "FAUST_C05_V04_0051_c05-dense-026_DANW.wav", "voice": "Kore", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0052", "speaker": "나레이터", "text": "두 사람이 옆으로 물러난 뒤에도 보리수 쪽에서는 후렴이 멀리 퍼졌다. 축제는 작은 대화 하나에서 멈추지 않고 계속 흘렀다. 누군가는 춤에 집중했고, 누군가는 춤판을 바라보는 낯선 학자를 알아보기 시작했다.", "scene_id": "c05-dense-027", "filename": "FAUST_C05_V04_0052_c05-dense-027_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0053", "speaker": "춤추는 사람", "text": "저기 오는 분, 전에 마을 사람들을 돌보던 박사님 아닌가?", "scene_id": "c05-dense-027", "filename": "FAUST_C05_V04_0053_c05-dense-027_DAN.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0054", "speaker": "나레이터", "text": "늙은 농부가 파우스트에게 다가왔다. 학식 높은 사람이 자기들을 피하지 않고 함께해 준다며 반가워했다. 그는 마실 것으로 채운 좋은 잔을 내밀었다. 파우스트에게는 예상하지 못한 환영이었다.", "scene_id": "c05-dense-028", "filename": "FAUST_C05_V04_0054_c05-dense-028_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0055", "speaker": "늙은 농부", "text": "이 기쁜 날에 오셨으니, 우리도 고마운 마음을 전해야지.", "scene_id": "c05-dense-028", "filename": "FAUST_C05_V04_0055_c05-dense-028_FARM.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0056", "speaker": "나레이터", "text": "농부는 잔 속 물방울만큼 오래 살라며 덕담을 건넸다. 파우스트는 잔을 받고 사람들의 평안을 빌었다. 둘레로 사람들이 모이자 농부는 옛 역병 때 파우스트와 그의 아버지가 애썼던 이야기를 꺼냈다. 그 기억은 마을 사람들에게 감사로 남아 있었다.", "scene_id": "c05-dense-029", "filename": "FAUST_C05_V04_0056_c05-dense-029_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0057", "speaker": "늙은 농부", "text": "그 힘든 때 우리 곁에 와 주셨지. 그 일을 잊지는 않았습니다.", "scene_id": "c05-dense-029", "filename": "FAUST_C05_V04_0057_c05-dense-029_FARM.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0058", "speaker": "나레이터", "text": "사람들은 파우스트가 오래 건강하게 남들을 도와주기를 외쳤다. 그는 그 찬사를 하늘로 돌리고 바그너와 함께 걸음을 옮겼다. 겉으로는 정중히 인사를 받았지만 마음은 편하지 않았다. 바그너는 그 불편함을 아직 알지 못한 채 감탄했다.", "scene_id": "c05-dense-030", "filename": "FAUST_C05_V04_0058_c05-dense-030_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0059", "speaker": "파우스트", "text": "고맙다는 말을 들을수록, 차마 말하지 못한 일이 더 무거워지는구나.", "scene_id": "c05-dense-030", "filename": "FAUST_C05_V04_0059_c05-dense-030_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0060", "speaker": "나레이터", "text": "바그너는 사람들이 춤과 음악까지 멈추며 박사를 반기는 모습에 깊이 감동했다. 배운 것을 사람들에게 돌려주고 이런 존경을 받는 삶이 부러웠다. 파우스트는 조금 더 올라가 바위에서 쉬자고 했다. 사람들의 환호에서 벗어나야 마음속 말을 꺼낼 수 있을 것 같았다.", "scene_id": "c05-dense-031", "filename": "FAUST_C05_V04_0060_c05-dense-031_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0061", "speaker": "바그너", "text": "배움이 이렇게 사람들에게 기억될 수 있다니. 박사님도 자랑스러우시겠지?", "scene_id": "c05-dense-031", "filename": "FAUST_C05_V04_0061_c05-dense-031_WAG.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0062", "speaker": "나레이터", "text": "바위 곁은 파우스트에게 낯선 자리가 아니었다. 역병이 돌던 때 그는 이곳에서 기도하고 굶으며 재앙을 끝내 달라고 빌었다. 하지만 지금 떠오르는 것은 믿음만이 아니었다. 아버지와 자신이 칭찬받을 자격이 있는지에 대한 깊은 의심도 함께 돌아왔다.", "scene_id": "c05-dense-032", "filename": "FAUST_C05_V04_0062_c05-dense-032_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0063", "speaker": "파우스트", "text": "바그너는 내 마음을 모르지. 저 사람들의 기억과 내 기억이 얼마나 다른지도.", "scene_id": "c05-dense-032", "filename": "FAUST_C05_V04_0063_c05-dense-032_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0064", "speaker": "나레이터", "text": "파우스트는 아버지가 열심히 자연을 연구했지만 방법은 기이했다고 털어놓았다. 연금술은 물질을 변화시켜 약이나 귀한 금속을 얻으려던 옛 연구였다. 그는 그 연구의 어려운 비유로 약을 만들던 과정을 이야기한 뒤, 정작 환자들이 나았는지 묻지 않았다고 말했다. 병을 고치려던 일이 오히려 사람을 해쳤다는 것이 그의 고백이었다. 좋은 뜻과 실제 결과는 같은 것이 아니었다.", "scene_id": "c05-dense-033", "filename": "FAUST_C05_V04_0064_c05-dense-033_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0065", "speaker": "파우스트", "text": "도우려 했다는 말만으로, 우리가 남긴 피해까지 없어지지는 않아.", "scene_id": "c05-dense-033", "filename": "FAUST_C05_V04_0065_c05-dense-033_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0066", "speaker": "나레이터", "text": "그는 자신도 그 약을 사람들에게 주었다고 말했다. 세상을 떠난 사람들을 생각하면 마을의 찬사가 견디기 어려웠다. 바그너는 전해 받은 기술을 성실히 따랐다면 자기 몫을 다한 것 아니냐고 위로했다. 하지만 파우스트가 괴로워하는 지점은 성실함만으로 풀리지 않았다.", "scene_id": "c05-dense-034", "filename": "FAUST_C05_V04_0066_c05-dense-034_NAR.wav", "voice": "Charon", "performance": {"emotion": "긴장과 확신, 속에 감춘 불안", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0067", "speaker": "파우스트", "text": "내가 믿고 했다는 사실보다, 그 사람들에게 무슨 일이 생겼는지가 더 중요해.", "scene_id": "c05-dense-034", "filename": "FAUST_C05_V04_0067_c05-dense-034_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0068", "speaker": "나레이터", "text": "바그너는 배움이 세대를 거치며 더 나아질 수 있다고 믿었다. 아버지에게 배우고 자신이 발전시켜 다음 사람에게 넘기면 된다는 생각이었다. 파우스트에게는 그 희망조차 멀게 느껴졌다. 그는 잠시라도 저녁의 아름다움에 눈을 돌리자고 말했다.", "scene_id": "c05-dense-035", "filename": "FAUST_C05_V04_0068_c05-dense-035_NAR.wav", "voice": "Charon", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0069", "speaker": "바그너", "text": "잘못이 있었다면 배우고 고쳐 나갈 수는 없을까요? 아직 그 희망은 놓고 싶지 않아요.", "scene_id": "c05-dense-035", "filename": "FAUST_C05_V04_0069_c05-dense-035_WAG.wav", "voice": "Puck", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "입가의 미소가 들리는 밝은 호흡. 필요시 짧은 작은 웃음 한 번.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0070", "speaker": "나레이터", "text": "저녁 햇빛이 초록에 둘러싸인 집들을 비췄다. 태양이 멀어지자 파우스트는 그것을 따라갈 날개를 꿈꾸었다. 높은 산도 깊은 골짜기도 가로막지 못하는 길이었다. 몸은 바위 곁에 머물렀지만 상상은 빛을 따라 움직였다.", "scene_id": "c05-dense-036", "filename": "FAUST_C05_V04_0070_c05-dense-036_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0071", "speaker": "파우스트", "text": "저 빛을 따라갈 수 있다면, 내 눈앞의 한계도 조금은 달라질까?", "scene_id": "c05-dense-036", "filename": "FAUST_C05_V04_0071_c05-dense-036_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0072", "speaker": "나레이터", "text": "상상 속에는 바다까지 펼쳐졌다. 앞에는 낮, 뒤에는 밤을 두고 끝없이 나아가는 꿈이었다. 그러나 파우스트는 곧 그것이 꿈임을 알았다. 마음이 날아간다고 몸까지 땅에서 떠오르지는 않았다.", "scene_id": "c05-dense-037", "filename": "FAUST_C05_V04_0072_c05-dense-037_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0073", "speaker": "파우스트", "text": "어디로 가든 이 마음을 데려갈 텐데도, 나는 자꾸 먼 곳을 바라보는구나.", "scene_id": "c05-dense-037", "filename": "FAUST_C05_V04_0073_c05-dense-037_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0074", "speaker": "나레이터", "text": "파우스트는 종달새와 독수리, 고향으로 향하는 두루미를 떠올렸다. 새를 보면 마음도 위로 나아가려 한다는 이야기였다. 바그너에게는 그런 갈망이 낯설었다. 숲과 들을 조금 보면 충분했고 새의 날개를 부러워하지도 않았다.", "scene_id": "c05-dense-038", "filename": "FAUST_C05_V04_0074_c05-dense-038_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0075", "speaker": "바그너", "text": "나는 책을 펼칠 때 더 멀리 가는 느낌인데, 박사님은 하늘을 바라보시는구나.", "scene_id": "c05-dense-038", "filename": "FAUST_C05_V04_0075_c05-dense-038_WAG.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0076", "speaker": "나레이터", "text": "바그너는 책에서 책으로 옮겨 가는 정신의 즐거움을 말했다. 귀한 옛 문서를 만나면 겨울밤도 따뜻해진다고 했다. 파우스트는 한 가지 갈망만 아는 그를 부러워하면서도, 자기 안에는 서로 다른 힘이 있다고 털어놓았다.", "scene_id": "c05-dense-039", "filename": "FAUST_C05_V04_0076_c05-dense-039_NAR.wav", "voice": "Charon", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0077", "speaker": "바그너", "text": "내가 사랑하는 배움으로는 박사님의 괴로움을 다 이해할 수 없는 걸까?", "scene_id": "c05-dense-039", "filename": "FAUST_C05_V04_0077_c05-dense-039_WAG.wav", "voice": "Puck", "performance": {"emotion": "긴장과 확신, 속에 감춘 불안", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0078", "speaker": "나레이터", "text": "파우스트는 가슴속에 두 영혼이 산다고 말했다. 한 마음은 몸으로 느끼는 이 세상의 기쁨을 붙들었고, 다른 마음은 지금의 한계를 벗어나 높은 곳으로 가려 했다. 두 사람이 실제로 들어 있다는 말이 아니라, 함께 만족시키기 어려운 욕망을 설명한 비유였다. 그는 새로운 삶으로 데려갈 정령과 마법 망토를 바랐다.", "scene_id": "c05-dense-040", "filename": "FAUST_C05_V04_0078_c05-dense-040_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0079", "speaker": "파우스트", "text": "여기서 살아가고 싶으면서도, 동시에 여기를 벗어나고 싶어. 어느 쪽이 진짜 나일까?", "scene_id": "c05-dense-040", "filename": "FAUST_C05_V04_0079_c05-dense-040_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0080", "speaker": "나레이터", "text": "바그너는 정령들을 함부로 부르지 말라고 경고했다. 자연의 거친 바람과 재앙을 정령들에 빗대며, 처음에는 다정하게 다가와도 사람을 해칠 수 있다고 말했다. 친절한 목소리라고 해서 믿어도 되는 것은 아니라는 걱정도 담겨 있었다.", "scene_id": "c05-dense-041", "filename": "FAUST_C05_V04_0080_c05-dense-041_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0081", "speaker": "바그너", "text": "새로운 것을 바라는 마음이 크다고 해서, 다가오는 모든 것을 받아들여도 되는 것은 아니에요.", "scene_id": "c05-dense-041", "filename": "FAUST_C05_V04_0081_c05-dense-041_WAG.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0082", "speaker": "나레이터", "text": "주변의 빛이 잿빛으로 바뀌고 공기는 차가워졌다. 바그너는 이제 집으로 돌아가자고 했다. 그런데 파우스트가 걸음을 멈춘 채 먼 곳을 바라보았다. 바그너는 그 시선을 따라 어스름한 들판으로 고개를 돌렸다.", "scene_id": "c05-dense-042", "filename": "FAUST_C05_V04_0082_c05-dense-042_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0083", "speaker": "바그너", "text": "이번에는 무엇을 보신 걸까? 이제 그만 쉬셨으면 좋겠는데.", "scene_id": "c05-dense-042", "filename": "FAUST_C05_V04_0083_c05-dense-042_WAG.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0084", "speaker": "나레이터", "text": "곡식밭과 수확 뒤의 그루터기 사이로 검은 개가 돌아다녔다. 파우스트가 묻자 바그너는 아까부터 보았지만 대수롭지 않게 여겼다고 했다. 파우스트에게는 평범하게 지나칠 수 없는 움직임이었다.", "scene_id": "c05-dense-043", "filename": "FAUST_C05_V04_0084_c05-dense-043_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0085", "speaker": "파우스트", "text": "왜 저 개에게 자꾸 눈길이 가지? 단지 주인을 찾는 걸까?", "scene_id": "c05-dense-043", "filename": "FAUST_C05_V04_0085_c05-dense-043_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0086", "speaker": "나레이터", "text": "바그너는 주인의 냄새를 찾는 푸들이라고 보았다. 파우스트는 개가 큰 원을 그리며 점점 가까워지고, 뒤로 불길 같은 것이 따르는 듯하다고 말했다. 하지만 바그너에게는 검은 개 한 마리만 보였다. 같은 모습을 두고 두 사람의 해석이 갈라졌다.", "scene_id": "c05-dense-044", "filename": "FAUST_C05_V04_0086_c05-dense-044_NAR.wav", "voice": "Charon", "performance": {"emotion": "상실과 그리움, 절제된 울먹임", "intensity": 0.4, "pace": "slow", "delivery": "warm_storytelling", "pause_after_ms": 650, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0087", "speaker": "바그너", "text": "어둑해서 눈에 헛것이 비친 걸지도 몰라요. 내 눈에는 그냥 개인데요.", "scene_id": "c05-dense-044", "filename": "FAUST_C05_V04_0087_c05-dense-044_WAG.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0088", "speaker": "나레이터", "text": "파우스트는 개가 발 주위에 보이지 않는 고리를 놓는 듯하다고 느꼈다. 바그너는 낯선 사람 둘을 만나 겁내는 것이라고 설명했다. 개는 가까워지고 있었지만 그 뜻은 아직 분명하지 않았다. 불안과 호기심이 파우스트의 시선을 붙들었다.", "scene_id": "c05-dense-045", "filename": "FAUST_C05_V04_0088_c05-dense-045_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0089", "speaker": "파우스트", "text": "정말 이상한 기운이 있는 걸까, 아니면 내가 또 더 큰 뜻을 찾고 있는 걸까?", "scene_id": "c05-dense-045", "filename": "FAUST_C05_V04_0089_c05-dense-045_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0090", "speaker": "나레이터", "text": "개는 으르렁거리며 망설이다가 배를 낮추고 꼬리를 흔들었다. 바그너는 평범한 개의 행동이라고 말했다. 파우스트도 마침내 함께 가자고 불렀다. 경계하던 대상에게 먼저 다가갈 자리를 내준 것이다.", "scene_id": "c05-dense-046", "filename": "FAUST_C05_V04_0090_c05-dense-046_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0091", "speaker": "바그너", "text": "보세요. 겁이 나서 그러는 거라니까요. 조금 기다리면 얌전해질 겁니다.", "scene_id": "c05-dense-046", "filename": "FAUST_C05_V04_0091_c05-dense-046_WAG.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0092", "speaker": "나레이터", "text": "개는 멈춰 선 사람을 살피고 목소리에 반응했다. 바그너는 이런 개라면 물건도 찾아오고 지팡이를 따라 물에 뛰어들 것이라고 추측했다. 실제로 그 일을 시킨 것은 아니었다. 파우스트는 반기는 개를 내려다보며 처음의 의심을 잠시 거두었다.", "scene_id": "c05-dense-047", "filename": "FAUST_C05_V04_0092_c05-dense-047_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0093", "speaker": "파우스트", "text": "이렇게 곁에 오려는 모습을 보니, 내 눈이 지나치게 예민했던 것 같기도 해.", "scene_id": "c05-dense-047", "filename": "FAUST_C05_V04_0093_c05-dense-047_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C05_0094", "speaker": "나레이터", "text": "파우스트는 정령의 흔적이 아니라 훈련받은 행동인 것 같다고 말했다. 바그너는 잘 배운 개라면 현명한 사람도 좋아할 거라며 흡족해했다. 두 사람은 검은 푸들과 함께 성문 안으로 돌아갔다. 들판의 밝은 축제가 끝난 뒤, 낯선 동행 하나가 파우스트의 삶 가까이에 남았다.", "scene_id": "c05-dense-048", "filename": "FAUST_C05_V04_0094_c05-dense-048_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C05_0095", "speaker": "바그너", "text": "이제 집에 가서 쉬면 되겠군요. 이 영리한 동행도 박사님 마음을 조금 풀어 주겠지요.", "scene_id": "c05-dense-048", "filename": "FAUST_C05_V04_0095_c05-dense-048_WAG.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "intimate_close_mic_soft_whisper", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "마이크 바로 가까이에서 한 사람의 귓가에 조용히 털어놓듯. 작은 목소리의 또렷한 속삭임과 부드러운 숨결. 같은 인물의 음색을 유지하고 자음은 선명하게. 고함·무대 발성·전화 음질·큰 잔향·과한 ASMR 입소리는 금지. 웃음·울먹임도 낮고 가까운 거리에서 절제한다. 숨을 세게 불거나 파열음을 내지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}]}]};
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
                            const url = await generateTTS(makePrompt(index),voice,false,turn.performance.pause_after_ms,turn.speaker!=='나레이터');
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

        function currentVoice(index) { return turns[index].voice || hostVoiceSelect.value; }
        async function sha256(buffer) {
            if (!globalThis.crypto?.subtle) throw new Error('이 환경은 파일 내용 검증을 지원하지 않습니다. HTTPS 환경에서 실행해 주세요.');
            return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)), x=>x.toString(16).padStart(2,'0')).join('');
        }
        async function fingerprint(index) {
            return sha256(new TextEncoder().encode(JSON.stringify({prompt:makePrompt(index),voice:currentVoice(index),phone:false,pause:turns[index].performance.pause_after_ms,format:'44100-mono-16bit-short-echo-v4',effect:turns[index].speaker!=='나레이터'?'echo-v4':'dry'})));
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
                const name='FAUST_C05_V04_RETRY.json';
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
                link.href=mergedMp3Url;link.download='FAUST_C05_V04_FULL.mp3';link.classList.remove('hidden');
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
    