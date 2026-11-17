
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


        const originalEpisode = {"schema_version": "faust-tts-1.0", "chapter": 4, "title": "닫힌 방에 돌아온 노래", "language": "ko-KR", "revision": "V04", "voices": {"나레이터": "Charon", "시인": "Charon", "지배인": "Orus", "희극 배우": "Puck", "라파엘": "Sulafat", "가브리엘": "Kore", "미카엘": "Orus", "메피스토펠레스": "Fenrir", "파우스트": "Orus", "바그너": "Puck", "직공 청년": "Puck", "세 번째 직공 청년": "Puck", "다섯 번째 직공 청년": "Orus", "첫 번째 하녀": "Kore", "다른 하녀": "Sulafat", "시민의 딸": "Kore", "두 번째 학생": "Puck", "첫 번째 학생": "Fenrir", "첫 번째 시민": "Orus", "거지": "Charon", "두 번째 시민": "Fenrir", "세 번째 시민": "Orus", "노파": "Sulafat", "아가테": "Kore", "군인": "Fenrir", "목동": "Puck", "춤추는 사람": "Puck", "춤추는 아가씨": "Kore", "늙은 농부": "Charon", "학생": "Puck"}, "scenes": [{"scene_id": "C04", "title": "파우스트 4장", "segments": [{"id": "C04_0000", "speaker": "나레이터", "text": "높은 아치 천장 아래, 파우스트가 의자에서 몸을 뒤척였다. 천상에서 대화의 주제가 되었던 그 학자는 이 방에서 혼자 밤을 지새우고 있었다. 파우스트는 대학에서 학생들을 가르치며 철학과 법학, 의학을 오래 공부한 사람이었다. 신과 믿음을 연구하는 신학까지 파고들었지만, 오늘 밤에는 그 많은 지식도 위로가 되지 않았다.", "scene_id": "c04-dense-001", "filename": "FAUST_C04_V04_0000_c04-dense-001_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0001", "speaker": "파우스트", "text": "이렇게 오래 공부했는데, 나는 세상을 얼마나 알게 된 걸까?", "scene_id": "c04-dense-001", "filename": "FAUST_C04_V04_0001_c04-dense-001_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0002", "speaker": "나레이터", "text": "사람들은 그를 박사라고 불렀고, 그에게 배우려는 학생들도 있었다. 그런데 정작 그는 자신이 확실히 안다고 말할 수 있는 것이 무엇인지 두려워졌다. 남들보다 많이 아는 것과, 누군가의 삶을 나아지게 하는 것은 다르다는 생각이 가슴을 조였다.", "scene_id": "c04-dense-002", "filename": "FAUST_C04_V04_0002_c04-dense-002_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0003", "speaker": "파우스트", "text": "모르는 것을 아는 척하며 학생들을 이끌어 온 건 아닐까. 이제는 그럴 자신도 없어.", "scene_id": "c04-dense-002", "filename": "FAUST_C04_V04_0003_c04-dense-002_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0004", "speaker": "나레이터", "text": "파우스트가 마법에 매달린 이유도 거기에 있었다. 책 속 설명을 외우는 데서 그치지 않고, 세상이 살아 움직이는 근본 이유를 직접 알고 싶었다. 창 너머 달빛은 그가 책상 앞에서 지새운 수많은 밤을 조용히 비추고 있었다.", "scene_id": "c04-dense-003", "filename": "FAUST_C04_V04_0004_c04-dense-003_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0005", "speaker": "파우스트", "text": "말로만 설명하는 지식 말고, 살아 있는 세계에 닿고 싶어.", "scene_id": "c04-dense-003", "filename": "FAUST_C04_V04_0005_c04-dense-003_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0006", "speaker": "나레이터", "text": "달빛이 닿는 산과 풀밭을 떠올리자, 좁은 방이 더욱 답답해졌다. 그는 여전히 서재 안에 있었지만 마음은 벌써 산등성이를 걷고 있었다. 자연 속에서 숨을 쉬면 머릿속을 뒤덮은 피로도 씻길 것 같았다.", "scene_id": "c04-dense-004", "filename": "FAUST_C04_V04_0006_c04-dense-004_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0007", "speaker": "파우스트", "text": "저 밖에는 이렇게 넓은 세상이 있는데, 나는 왜 여기 갇혀 있을까?", "scene_id": "c04-dense-004", "filename": "FAUST_C04_V04_0007_c04-dense-004_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0008", "speaker": "나레이터", "text": "책은 천장 가까이까지 쌓였고, 그 사이에는 먼지와 오래된 종이가 끼어 있었다. 연구 도구와 물려받은 살림도 빈자리를 메웠다. 한때는 든든했던 물건들이 이제는 그가 움직일 틈까지 막는 듯했다.", "scene_id": "c04-dense-005", "filename": "FAUST_C04_V04_0008_c04-dense-005_NAR.wav", "voice": "Charon", "performance": {"emotion": "상실과 그리움, 절제된 울먹임", "intensity": 0.4, "pace": "slow", "delivery": "warm_storytelling", "pause_after_ms": 650, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0009", "speaker": "파우스트", "text": "내 세계가 이 방 안의 물건들뿐이 되어 버렸구나.", "scene_id": "c04-dense-005", "filename": "FAUST_C04_V04_0009_c04-dense-005_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0010", "speaker": "나레이터", "text": "그의 주위에는 살아 있는 숲과 들 대신 뼈와 오래된 표본이 놓여 있었다. 파우스트는 자연을 알려고 모은 것들이 오히려 자연과 자신을 갈라놓는다고 느꼈다. 당장이라도 이 방에서 나가고 싶었다.", "scene_id": "c04-dense-006", "filename": "FAUST_C04_V04_0010_c04-dense-006_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0011", "speaker": "파우스트", "text": "살아 있는 것을 알고 싶다면서, 나는 죽은 흔적만 붙잡고 있었어.", "scene_id": "c04-dense-006", "filename": "FAUST_C04_V04_0011_c04-dense-006_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0012", "speaker": "나레이터", "text": "그때 신비한 책 한 권이 눈에 들어왔다. 노스트라다무스는 별과 예언을 연구한 인물로 알려져 있었다. 파우스트는 그의 이름이 붙은 이 책이라면 평범한 학문으로 찾지 못한 길을 알려 주리라 기대했다. 별의 움직임과 정령의 세계를 배운다면, 머리로만 풀리지 않던 의문에도 답이 생길 것 같았다. 그는 보이지 않는 존재들에게 응답을 청했다.", "scene_id": "c04-dense-007", "filename": "FAUST_C04_V04_0012_c04-dense-007_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0013", "speaker": "파우스트", "text": "정말 내 곁에 있다면, 한 번만 대답해 줘.", "scene_id": "c04-dense-007", "filename": "FAUST_C04_V04_0013_c04-dense-007_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0014", "speaker": "나레이터", "text": "펼친 페이지에는 우주 전체의 관계를 나타내는 그림이 있었다. 여기서 우주는 별이 있는 하늘만이 아니라, 자연의 모든 것이 연결된 커다란 세계를 뜻했다. 파우스트는 그 그림을 보는 순간 몸속에 생기가 돌아오는 듯했다.", "scene_id": "c04-dense-008", "filename": "FAUST_C04_V04_0014_c04-dense-008_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0015", "speaker": "파우스트", "text": "서로 떨어져 보이던 것들이 이렇게 이어지는 걸까?", "scene_id": "c04-dense-008", "filename": "FAUST_C04_V04_0015_c04-dense-008_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0016", "speaker": "나레이터", "text": "조금 전까지 짓눌려 있던 얼굴에 빛이 돌았다. 파우스트는 자연이 움직이는 모습을 마음으로 들여다본다고 느꼈다. 그 감격이 너무 커서, 자신도 인간의 한계를 넘어선 것은 아닌지 생각할 정도였다.", "scene_id": "c04-dense-009", "filename": "FAUST_C04_V04_0016_c04-dense-009_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0017", "speaker": "파우스트", "text": "이제야 보이는 것 같아. 그동안 닫혀 있던 것은 세상이 아니라 내 눈이었을까?", "scene_id": "c04-dense-009", "filename": "FAUST_C04_V04_0017_c04-dense-009_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0018", "speaker": "나레이터", "text": "책 속의 말은 마음을 열고 세계를 바라보라고 권하는 듯했다. 파우스트는 하늘과 땅이 서로 힘을 주고받는 모습을 떠올렸다. 그에게 그림의 선들은 따로인 것들을 하나로 이어 주는 길처럼 보였다.", "scene_id": "c04-dense-010", "filename": "FAUST_C04_V04_0018_c04-dense-010_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0019", "speaker": "파우스트", "text": "하나가 움직이면 다른 것도 응답하는구나. 나도 그 흐름을 느끼고 싶어.", "scene_id": "c04-dense-010", "filename": "FAUST_C04_V04_0019_c04-dense-010_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0020", "speaker": "나레이터", "text": "그는 한동안 그 조화에 빠져 있었다. 그러나 곧 답답함이 되살아났다. 책 속의 아름다운 그림을 바라보는 것과 실제 자연의 힘에 닿는 것은 여전히 다른 일이었다.", "scene_id": "c04-dense-011", "filename": "FAUST_C04_V04_0020_c04-dense-011_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0021", "speaker": "파우스트", "text": "멋진 그림인 건 알겠어. 하지만 나는 또 구경만 하고 있잖아.", "scene_id": "c04-dense-011", "filename": "FAUST_C04_V04_0021_c04-dense-011_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0022", "speaker": "나레이터", "text": "파우스트가 조급하게 책장을 넘겼다. 이번에는 땅의 생명과 움직임을 나타내는 지령의 기호가 나왔다. 이 기호가 가리키는 지령은 땅에서 태어나고 자라고 사라지는 생명의 힘을 지닌 정령이었다. 우주 전체를 멀리 바라보던 때와 달리, 이번 그림에서는 자신과 가까운 힘이 느껴졌다.", "scene_id": "c04-dense-012", "filename": "FAUST_C04_V04_0022_c04-dense-012_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0023", "speaker": "파우스트", "text": "이 힘이라면 내게도 닿을 수 있지 않을까?", "scene_id": "c04-dense-012", "filename": "FAUST_C04_V04_0023_c04-dense-012_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0024", "speaker": "나레이터", "text": "두려움보다 기대가 먼저 치밀었다. 파우스트는 세상의 기쁨뿐 아니라 슬픔과 거친 시련까지 감당할 수 있을 것 같았다. 그때 달빛이 가려지고 방 안의 빛도 희미해졌다. 자신만만하던 파우스트도 갑작스러운 어둠에 긴장했다.", "scene_id": "c04-dense-013", "filename": "FAUST_C04_V04_0024_c04-dense-013_NAR.wav", "voice": "Charon", "performance": {"emotion": "상실과 그리움, 절제된 울먹임", "intensity": 0.4, "pace": "slow", "delivery": "warm_storytelling", "pause_after_ms": 650, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0025", "speaker": "파우스트", "text": "힘든 일까지 받아들일 테니, 내게 진짜 세계를 보여 줘.", "scene_id": "c04-dense-013", "filename": "FAUST_C04_V04_0025_c04-dense-013_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0026", "speaker": "나레이터", "text": "차가운 기운이 높은 천장에서 내려오는 듯했다. 붉은 빛이 눈앞을 스치자, 파우스트는 보이지 않던 존재가 가까워졌다고 느꼈다. 그는 숨을 고르면서도 물러서지 않고 모습을 드러내 달라고 청했다.", "scene_id": "c04-dense-014", "filename": "FAUST_C04_V04_0026_c04-dense-014_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0027", "speaker": "파우스트", "text": "정말 온 거야? 여기까지 와 놓고 돌아설 수는 없어.", "scene_id": "c04-dense-014", "filename": "FAUST_C04_V04_0027_c04-dense-014_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0028", "speaker": "나레이터", "text": "가슴은 세차게 뛰었고 낯선 감각이 온몸을 흔들었다. 파우스트는 자신이 무엇을 불러내는지 끝까지 알지 못했다. 위험할지도 몰랐지만, 지금은 그 존재를 만나고 싶은 마음이 더 컸다.", "scene_id": "c04-dense-015", "filename": "FAUST_C04_V04_0028_c04-dense-015_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0029", "speaker": "파우스트", "text": "나를 흔드는 이 힘이 무엇인지, 끝까지 확인하고 싶어.", "scene_id": "c04-dense-015", "filename": "FAUST_C04_V04_0029_c04-dense-015_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0030", "speaker": "나레이터", "text": "그가 책의 기호를 따라 정령을 부르자 붉은 불꽃 속에서 지령이 나타났다. 누가 자신을 불렀느냐는 물음이 울렸다. 막상 거대한 존재를 마주한 파우스트는 얼굴을 돌렸다. 감당할 수 있으리라 생각했는데, 막상 마주하니 두려웠다.", "scene_id": "c04-dense-016", "filename": "FAUST_C04_V04_0030_c04-dense-016_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0031", "speaker": "파우스트", "text": "이런 모습일 줄은 몰랐어. 숨이 막혀.", "scene_id": "c04-dense-016", "filename": "FAUST_C04_V04_0031_c04-dense-016_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0032", "speaker": "나레이터", "text": "지령은 자신을 간절히 부르던 사람이 왜 이제 와서 두려워하느냐고 물었다. 파우스트는 그 시선을 견디기 어려웠다. 상상 속에서는 정령과 나란히 설 수 있었지만, 막상 마주하자 자신이 초라하게 느껴졌다.", "scene_id": "c04-dense-017", "filename": "FAUST_C04_V04_0032_c04-dense-017_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0033", "speaker": "파우스트", "text": "내가 원한 만남인데, 왜 몸이 먼저 물러서는 거지?", "scene_id": "c04-dense-017", "filename": "FAUST_C04_V04_0033_c04-dense-017_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0034", "speaker": "나레이터", "text": "지령의 말이 그의 자존심을 건드렸다. 파우스트는 떨리는 마음을 누르고 자신도 정령과 같은 존재라고 맞섰다. 실제로 지령과 맞설 수 있어서 한 말은 아니었다. 겁먹은 모습을 보이기 싫어 필사적으로 버틴 것이었다.", "scene_id": "c04-dense-018", "filename": "FAUST_C04_V04_0034_c04-dense-018_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0035", "speaker": "파우스트", "text": "두렵다고 해서 내가 바라던 것까지 포기할 수는 없어.", "scene_id": "c04-dense-018", "filename": "FAUST_C04_V04_0035_c04-dense-018_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0036", "speaker": "나레이터", "text": "지령은 탄생과 죽음, 끊임없는 변화 속에서 자신이 움직인다고 말했다. 시간이라는 베틀로 살아 있는 세계를 짜 나간다는 비유였다. 파우스트가 가까움을 느낀다고 말하자, 지령은 그가 이해할 수 있는 존재와 자신은 다르다고 답했다.", "scene_id": "c04-dense-019", "filename": "FAUST_C04_V04_0036_c04-dense-019_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0037", "speaker": "파우스트", "text": "가깝다고 느끼는 것만으로, 정말 이해했다고 할 수는 없는 걸까?", "scene_id": "c04-dense-019", "filename": "FAUST_C04_V04_0037_c04-dense-019_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0038", "speaker": "나레이터", "text": "지령이 사라지고 파우스트의 몸이 무너져 내렸다. 조금 전까지는 세상의 비밀을 알아낼 것 같았다. 하지만 지령에게 거절당하자 자신이 얼마나 대단한 착각을 했는지 부끄러워졌다.", "scene_id": "c04-dense-020", "filename": "FAUST_C04_V04_0038_c04-dense-020_NAR.wav", "voice": "Charon", "performance": {"emotion": "긴장과 확신, 속에 감춘 불안", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0039", "speaker": "파우스트", "text": "너와도 같지 않다면, 나는 대체 어떤 존재인 거지?", "scene_id": "c04-dense-020", "filename": "FAUST_C04_V04_0039_c04-dense-020_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0040", "speaker": "나레이터", "text": "그때 문을 두드리는 소리가 났다. 찾아온 바그너는 곁에서 공부하며 파우스트의 연구를 돕는 조수였다. 그는 스승의 지식을 존경했고, 기회가 있을 때마다 더 배우고 싶어 했다. 밤옷과 잠모자를 쓴 그는 등불을 들고 있었다. 파우스트는 깊은 충격에서 빠져나오기도 전에 평범한 대화를 해야 한다는 사실이 못마땅했다.", "scene_id": "c04-dense-021", "filename": "FAUST_C04_V04_0040_c04-dense-021_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0041", "speaker": "파우스트", "text": "하필 지금이라니. 방금 여기서 무슨 일이 있었는지 저 사람은 모르겠지.", "scene_id": "c04-dense-021", "filename": "FAUST_C04_V04_0041_c04-dense-021_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0042", "speaker": "나레이터", "text": "바그너는 파우스트가 그리스 비극을 소리 내어 읽는 줄 알았다. 방 안에서 들린 격한 목소리를 연기 연습으로 여긴 것이다. 그는 목사도 배우처럼 청중을 사로잡는 말하기를 배우면 좋겠다고 말했다. 파우스트는 목사가 배우처럼 남의 눈에 잘 보이는 일에만 신경 쓴다면 그렇겠다고 비꼬았다. 바그너가 묻는 것은 전달 기술이었지만, 파우스트가 걱정하는 것은 말에 진심이 있는가 하는 문제였다.", "scene_id": "c04-dense-022", "filename": "FAUST_C04_V04_0042_c04-dense-022_NAR.wav", "voice": "Charon", "performance": {"emotion": "상실과 그리움, 절제된 울먹임", "intensity": 0.4, "pace": "slow", "delivery": "warm_storytelling", "pause_after_ms": 650, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0043", "speaker": "바그너", "text": "저렇게 힘 있게 말하면 듣는 사람도 집중하겠지. 나도 그 방법을 배우고 싶어.", "scene_id": "c04-dense-022", "filename": "FAUST_C04_V04_0043_c04-dense-022_WAG.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0044", "speaker": "나레이터", "text": "바그너는 연구실에만 있는 사람이 어떻게 사람들을 설득할 수 있느냐고 물었다. 파우스트에게 중요한 것은 말솜씨보다 먼저 진심이었다. 자신이 느끼지 못하는 것을 꾸민 목소리로 전해 봐야, 다른 사람의 마음 깊이 닿기는 어렵다고 그는 생각했다.", "scene_id": "c04-dense-023", "filename": "FAUST_C04_V04_0044_c04-dense-023_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0045", "speaker": "파우스트", "text": "말의 모양을 고치기 전에, 정말 전하고 싶은 것이 있는지부터 물어야 해.", "scene_id": "c04-dense-023", "filename": "FAUST_C04_V04_0045_c04-dense-023_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0046", "speaker": "나레이터", "text": "파우스트는 남의 말을 이어 붙이는 것만으로는 살아 있는 이야기가 되지 않는다고 말했다. 바그너도 그 뜻을 전혀 모르는 것은 아니었다. 다만 그는 좋은 내용을 잘 전달하려면 기술 역시 필요하다고 믿었다. 바그너는 말을 잘하는 법을 배우고 싶었고, 파우스트는 진심도 없이 말만 꾸미는 태도가 싫었다.", "scene_id": "c04-dense-024", "filename": "FAUST_C04_V04_0046_c04-dense-024_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0047", "speaker": "바그너", "text": "진심이 중요하다는 건 알아요. 그래도 그 마음을 전할 방법은 배워야 하지 않을까요?", "scene_id": "c04-dense-024", "filename": "FAUST_C04_V04_0047_c04-dense-024_WAG.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0048", "speaker": "나레이터", "text": "파우스트가 손을 들어 말을 이었다. 진지하게 할 말이 있다면 화려한 표현만 좇을 필요는 없다는 것이었다. 그는 내용 없이 번지르르한 말을 마른 잎 사이로 지나가는 바람에 빗댔다. 소리는 나지만 마음에 남을 것이 없다는 뜻이었다.", "scene_id": "c04-dense-025", "filename": "FAUST_C04_V04_0048_c04-dense-025_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0049", "speaker": "파우스트", "text": "말이 번쩍인다고 생각까지 깊어지는 것은 아니야.", "scene_id": "c04-dense-025", "filename": "FAUST_C04_V04_0049_c04-dense-025_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0050", "speaker": "나레이터", "text": "바그너의 표정이 어두워졌다. 배워야 할 것은 끝이 없는데 사람의 삶은 짧았다. 옛 문헌의 바탕이 된 자료에 다가가는 일조차 쉽지 않아, 열심히 공부할수록 남은 길이 더 길게 느껴졌다.", "scene_id": "c04-dense-026", "filename": "FAUST_C04_V04_0050_c04-dense-026_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0051", "speaker": "바그너", "text": "이만큼 애써도 아직 시작인 것 같아. 살아 있는 동안 어디까지 갈 수 있을까?", "scene_id": "c04-dense-026", "filename": "FAUST_C04_V04_0051_c04-dense-026_WAG.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0052", "speaker": "나레이터", "text": "파우스트는 오래된 양피지에서 모든 목마름을 해결할 수 있겠느냐고 물었다. 양피지는 종이 대신 쓰던 가죽으로, 여기서는 옛 책과 기록을 가리켰다. 그는 기록을 읽는 것만으로는 충분하지 않고, 읽은 사람이 스스로 느끼고 생각해야 한다고 보았다.", "scene_id": "c04-dense-027", "filename": "FAUST_C04_V04_0052_c04-dense-027_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0053", "speaker": "파우스트", "text": "책이 건네준 답을 내 안에서 다시 묻지 않으면, 그 답은 여전히 남의 것이야.", "scene_id": "c04-dense-027", "filename": "FAUST_C04_V04_0053_c04-dense-027_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0054", "speaker": "나레이터", "text": "바그너에게는 옛사람의 생각을 따라가는 일 자체가 기쁨이었다. 파우스트는 우리가 과거를 안다고 할 때 자신의 생각을 과거에 덧씌우지는 않는지 되물었다. 이른바 시대정신, 곧 한 시대를 움직인 생각을 말하면서도 자기 생각만 비출 수 있다는 지적이었다.", "scene_id": "c04-dense-028", "filename": "FAUST_C04_V04_0054_c04-dense-028_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0055", "speaker": "바그너", "text": "과거를 배운다고 믿었는데, 내가 보고 싶은 것만 골라 보고 있었을까?", "scene_id": "c04-dense-028", "filename": "FAUST_C04_V04_0055_c04-dense-028_WAG.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0056", "speaker": "나레이터", "text": "파우스트는 옛 기록을 몇 가지 그럴듯한 교훈으로 정리하는 태도도 못마땅했다. 사람들의 복잡한 삶을 정해진 말 몇 줄에 가두면 중요한 것이 사라질 수 있었다. 바그너는 그래도 세계와 인간을 이해하려는 노력에는 뜻이 있지 않느냐고 말을 이었다.", "scene_id": "c04-dense-029", "filename": "FAUST_C04_V04_0056_c04-dense-029_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0057", "speaker": "파우스트", "text": "살아 있던 사람들을, 교훈을 말하는 인형처럼 만들어서는 안 돼.", "scene_id": "c04-dense-029", "filename": "FAUST_C04_V04_0057_c04-dense-029_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0058", "speaker": "나레이터", "text": "바그너는 사람의 마음과 생각을 조금이라도 알고 싶었다. 파우스트는 안다는 말이 얼마나 어려운지 되물었다. 두 사람의 대화는 말하기 기술에서 시작해, 인간을 이해하고 그 이해를 말할 수 있는가 하는 문제로 옮겨 갔다.", "scene_id": "c04-dense-030", "filename": "FAUST_C04_V04_0058_c04-dense-030_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0059", "speaker": "바그너", "text": "나는 정말 알고 싶어요. 하지만 안다고 말하려면 어디까지 알아야 할까요?", "scene_id": "c04-dense-030", "filename": "FAUST_C04_V04_0059_c04-dense-030_WAG.wav", "voice": "Puck", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0060", "speaker": "나레이터", "text": "파우스트는 깨달은 것을 세상에 말했다가 박해받은 사람들을 떠올렸다. 진실을 전하는 일에도 위험이 따른다는 뜻이었다. 그는 이제 밤이 깊었다며 대화를 끝냈다. 바그너는 아쉬워하면서도 다음 날 부활절에 다시 질문해도 되겠느냐고 청했다.", "scene_id": "c04-dense-031", "filename": "FAUST_C04_V04_0060_c04-dense-031_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0061", "speaker": "파우스트", "text": "오늘은 더 말할 힘이 없어. 내 마음부터 추스를 시간이 필요해.", "scene_id": "c04-dense-031", "filename": "FAUST_C04_V04_0061_c04-dense-031_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0062", "speaker": "나레이터", "text": "바그너는 많이 배웠지만 모든 것을 더 알고 싶다는 마음을 안고 나갔다. 혼자 남은 파우스트는 그런 낙관을 이해하기 어려웠다. 바그너가 작은 성과에도 기뻐하는 모습이 못마땅했지만, 자신은 방금 큰 실패를 겪었는데 바그너는 여전히 희망에 차 있다는 사실이 더 못마땅했다.", "scene_id": "c04-dense-032", "filename": "FAUST_C04_V04_0062_c04-dense-032_NAR.wav", "voice": "Charon", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0063", "speaker": "바그너", "text": "아직 물을 것이 이렇게 많은데, 어떻게 배움에 대한 희망을 버릴 수 있겠어?", "scene_id": "c04-dense-032", "filename": "FAUST_C04_V04_0063_c04-dense-032_WAG.wav", "voice": "Puck", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "입가의 미소가 들리는 밝은 호흡. 필요시 짧은 작은 웃음 한 번.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0064", "speaker": "나레이터", "text": "바그너를 떠올리던 파우스트의 마음이 잠시 누그러졌다. 그 평범한 방문이 자신을 더 깊은 절망에서 끌어냈다는 사실은 부인하기 어려웠다. 바그너와 이야기하는 동안에는 지령에게 거절당한 일만 생각하지 않아도 되었다.", "scene_id": "c04-dense-033", "filename": "FAUST_C04_V04_0064_c04-dense-033_NAR.wav", "voice": "Charon", "performance": {"emotion": "긴장과 확신, 속에 감춘 불안", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0065", "speaker": "파우스트", "text": "귀찮다고만 여겼는데, 그 목소리가 나를 잠깐이라도 버티게 했구나.", "scene_id": "c04-dense-033", "filename": "FAUST_C04_V04_0065_c04-dense-033_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0066", "speaker": "나레이터", "text": "그러나 정령과 마주했던 기억이 다시 밀려왔다. 신과 가까운 존재라고까지 생각했던 자신이, 지령 하나도 감당하지 못했다. 불러낼 힘은 있었지만 곁에 머물게 할 힘은 없었다. 그토록 기대했던 만남이라 거절당한 충격도 컸다.", "scene_id": "c04-dense-034", "filename": "FAUST_C04_V04_0066_c04-dense-034_NAR.wav", "voice": "Charon", "performance": {"emotion": "긴장과 확신, 속에 감춘 불안", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0067", "speaker": "파우스트", "text": "문을 열었다고 해서 그 너머를 감당할 준비까지 된 것은 아니었어.", "scene_id": "c04-dense-034", "filename": "FAUST_C04_V04_0067_c04-dense-034_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0068", "speaker": "나레이터", "text": "무엇을 따라야 하고 무엇을 피해야 할까. 파우스트는 답을 찾으려 했지만 질문만 늘어났다. 더 알고 싶다는 마음을 계속 따라가도 될지 자신이 없었다.", "scene_id": "c04-dense-035", "filename": "FAUST_C04_V04_0068_c04-dense-035_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0069", "speaker": "파우스트", "text": "나를 여기까지 데려온 마음이, 앞으로도 길이 되어 줄까?", "scene_id": "c04-dense-035", "filename": "FAUST_C04_V04_0069_c04-dense-035_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0070", "speaker": "나레이터", "text": "무슨 일을 해도, 아무리 괴로워해도 달라지는 게 없는 것 같았다. 예전에는 무엇이든 할 수 있을 것 같았지만, 실망을 거듭한 지금은 새로운 일을 떠올리기도 힘들었다. 너무 지쳐서 무엇을 해도 실패할 것 같았다. 다른 방법이 있을지도 모른다는 생각조차 들지 않았다.", "scene_id": "c04-dense-036", "filename": "FAUST_C04_V04_0070_c04-dense-036_NAR.wav", "voice": "Charon", "performance": {"emotion": "긴장과 확신, 속에 감춘 불안", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0071", "speaker": "파우스트", "text": "어디로 가도 다시 막힐 것 같아. 이렇게 생각하는 나 자신에게도 지쳤어.", "scene_id": "c04-dense-036", "filename": "FAUST_C04_V04_0071_c04-dense-036_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0072", "speaker": "나레이터", "text": "걱정은 아직 일어나지 않은 일까지 끌고 왔다. 잃지 않은 것을 잃을까 두려워하며 미리 슬퍼하는 마음이었다. 파우스트는 자신을 신 같은 존재가 아니라 먼지 속 작은 벌레처럼 낮춰 보았다. 책장을 가득 채운 책들도 이제는 아무 쓸모 없는 것처럼 보였다.", "scene_id": "c04-dense-037", "filename": "FAUST_C04_V04_0072_c04-dense-037_NAR.wav", "voice": "Charon", "performance": {"emotion": "상실과 그리움, 절제된 울먹임", "intensity": 0.4, "pace": "slow", "delivery": "warm_storytelling", "pause_after_ms": 650, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0073", "speaker": "파우스트", "text": "아직 오지도 않은 일 때문에, 지금 내게 남은 것조차 볼 수가 없구나.", "scene_id": "c04-dense-037", "filename": "FAUST_C04_V04_0073_c04-dense-037_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0074", "speaker": "나레이터", "text": "먼지 쌓인 책과 속이 빈 해골이 시야에 들어왔다. 파우스트는 이 물건들의 주인도 한때 자신처럼 진실을 찾아 헤맸을 것이라고 생각했다. 수많은 사람이 남긴 흔적은 위로가 되기보다, 같은 질문이 끝없이 되풀이된다는 증거처럼 느껴졌다.", "scene_id": "c04-dense-038", "filename": "FAUST_C04_V04_0074_c04-dense-038_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0075", "speaker": "파우스트", "text": "나보다 먼저 살았던 사람들도 이 답답함을 알고 있었을까?", "scene_id": "c04-dense-038", "filename": "FAUST_C04_V04_0075_c04-dense-038_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0076", "speaker": "나레이터", "text": "정교한 도구들도 잠자코 놓여 있었다. 파우스트는 그것들을 자연의 문을 여는 열쇠로 여겼지만, 이제는 열쇠가 맞지 않는 듯했다. 자연이 드러내 주지 않는 것을 나사와 지렛대로 억지로 얻을 수는 없다는 생각이 들었다.", "scene_id": "c04-dense-039", "filename": "FAUST_C04_V04_0076_c04-dense-039_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0077", "speaker": "파우스트", "text": "측정하고 움직일 수 있다고 해서, 모든 뜻까지 알아내는 건 아니었어.", "scene_id": "c04-dense-039", "filename": "FAUST_C04_V04_0077_c04-dense-039_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0078", "speaker": "나레이터", "text": "낡은 두루마리와 물려받은 기구를 바라보며 그는 생각했다. 물건을 물려받는 일과 그것을 자기 삶에서 제대로 쓰는 일은 달랐다. 쓰지 못한 채 지키기만 하는 유산은 무거운 짐이 될 수도 있었다.", "scene_id": "c04-dense-040", "filename": "FAUST_C04_V04_0078_c04-dense-040_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0079", "speaker": "파우스트", "text": "남겨 받은 것을 쌓아 두기만 했구나. 내 삶에서 무엇으로 만들지는 내가 정해야 했는데.", "scene_id": "c04-dense-040", "filename": "FAUST_C04_V04_0079_c04-dense-040_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0080", "speaker": "나레이터", "text": "그때 시선이 작은 병 하나에 멈췄다. 깊이 지친 파우스트는 죽음으로 고통을 끝내려는 위험한 생각에 붙들렸다. 갑자기 마음이 조용해지는 듯했지만, 문제가 풀린 것은 아니었다. 지금의 고통도 언젠가는 달라질 수 있다는 생각을 하지 못했다.", "scene_id": "c04-dense-041", "filename": "FAUST_C04_V04_0080_c04-dense-041_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0081", "speaker": "파우스트", "text": "지금은 이 괴로움에서 벗어나고 싶다는 생각밖에 들지 않아.", "scene_id": "c04-dense-041", "filename": "FAUST_C04_V04_0081_c04-dense-041_FAU.wav", "voice": "Orus", "performance": {"emotion": "긴장과 확신, 속에 감춘 불안", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0082", "speaker": "나레이터", "text": "파우스트는 병을 바라보며 마음의 거센 물결이 잦아든다고 느꼈다. 그는 그 느낌을 새로운 곳으로 떠나는 일에 빗대었다. 그렇게 생각하면 두려움이 덜했다. 죽음이 돌이킬 수 없는 선택이라는 사실을 애써 외면하고 있었다.", "scene_id": "c04-dense-042", "filename": "FAUST_C04_V04_0082_c04-dense-042_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0083", "speaker": "파우스트", "text": "이 고요함을 믿어도 되는 걸까. 나는 아직 아무 답도 찾지 못했는데.", "scene_id": "c04-dense-042", "filename": "FAUST_C04_V04_0083_c04-dense-042_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0084", "speaker": "나레이터", "text": "상상 속에는 하늘을 나는 불의 수레까지 떠올랐다. 그러다가도 조금 전까지 자신을 벌레처럼 여겼던 일이 떠올라, 그런 꿈을 꿀 자격이나 있는지 의심했다. 무엇이든 넘어설 수 있다는 생각과 아무 가치도 없다는 생각 사이에서, 그는 위태롭게 흔들리고 있었다.", "scene_id": "c04-dense-043", "filename": "FAUST_C04_V04_0084_c04-dense-043_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0085", "speaker": "파우스트", "text": "방금까지 나를 하찮게 여기더니, 이제는 모든 한계를 넘겠다고 하는구나. 내 마음이 왜 이렇게 흔들리지?", "scene_id": "c04-dense-043", "filename": "FAUST_C04_V04_0085_c04-dense-043_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0086", "speaker": "나레이터", "text": "그의 생각은 점점 극단으로 치달았다. 두려워하지 않는 것이 인간의 존엄을 증명하는 길이라고 스스로 몰아붙였다. 그러다 눈길이 오래 보관해 둔 수정 잔으로 옮겨 갔다. 그 잔에는 죽음과는 전혀 다른, 함께 살아온 사람들의 기억이 남아 있었다.", "scene_id": "c04-dense-044", "filename": "FAUST_C04_V04_0086_c04-dense-044_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0087", "speaker": "파우스트", "text": "저 잔을 마지막으로 꺼낸 게 언제였지?", "scene_id": "c04-dense-044", "filename": "FAUST_C04_V04_0087_c04-dense-044_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0088", "speaker": "나레이터", "text": "잔을 바라보자 옛 잔치의 기억이 떠올랐다. 사람들이 잔을 건네며 웃고, 장식을 두고 재치 있는 말을 나누던 밤이었다. 같은 물건 앞에서도 그때의 자신과 지금의 자신은 너무 멀게 느껴졌다. 그는 이제 그 잔을 누구에게도 건넬 생각이 없었다.", "scene_id": "c04-dense-045", "filename": "FAUST_C04_V04_0088_c04-dense-045_NAR.wav", "voice": "Charon", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0089", "speaker": "파우스트", "text": "그때도 이렇게 밤이 깊었겠지. 그런데 곁에는 사람들의 목소리가 있었어.", "scene_id": "c04-dense-045", "filename": "FAUST_C04_V04_0089_c04-dense-045_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0090", "speaker": "나레이터", "text": "파우스트는 위험한 결심을 실행하려고 잔을 입 가까이 가져갔다. 바로 그때 바깥에서 종소리와 합창이 울렸다. 부활절, 기독교에서 예수의 부활을 기리는 날이 시작되고 있었다. 끝이라고 생각하던 순간에 다른 사람들의 노래가 방 안으로 들어왔다.", "scene_id": "c04-dense-046", "filename": "FAUST_C04_V04_0090_c04-dense-046_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0091", "speaker": "파우스트", "text": "이 소리…… 벌써 아침을 알리는 건가?", "scene_id": "c04-dense-046", "filename": "FAUST_C04_V04_0091_c04-dense-046_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0092", "speaker": "나레이터", "text": "깊은 종소리 뒤로 맑은 합창이 이어졌다. 파우스트는 잔에서 주의를 돌리고 소리에 귀를 기울였다. 오래전부터 알던 부활절 노래였다. 죽음만 생각하던 그는 어느새 어린 시절에도 이 노래를 들었다는 사실을 떠올렸다.", "scene_id": "c04-dense-047", "filename": "FAUST_C04_V04_0092_c04-dense-047_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0093", "speaker": "파우스트", "text": "어릴 때도 이 노래를 들었어. 왜 지금 이렇게 선명하게 떠오르지?", "scene_id": "c04-dense-047", "filename": "FAUST_C04_V04_0093_c04-dense-047_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0094", "speaker": "나레이터", "text": "노래에는 무덤에 모셨던 예수를 더는 그곳에서 찾지 못한 여인들의 이야기가 담겼다. 이어 천사들의 합창이 부활의 기쁨을 전했다. 파우스트가 듣는 것은 방 안의 대화가 아니라, 바깥에서 전해 오는 부활절의 노래였다. 믿음이 돌아온 것은 아니었지만, 파우스트는 계속 노래를 듣고 싶었다.", "scene_id": "c04-dense-048", "filename": "FAUST_C04_V04_0094_c04-dense-048_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0095", "speaker": "파우스트", "text": "그 이야기를 모두 믿을 수 있는지는 모르겠어. 그래도 지금은 더 듣고 싶어.", "scene_id": "c04-dense-048", "filename": "FAUST_C04_V04_0095_c04-dense-048_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0096", "speaker": "나레이터", "text": "파우스트에게 믿음이 갑자기 되살아난 것은 아니었다. 그는 노래의 뜻을 온전히 받아들일 수 없다는 것을 알고 있었다. 그런데도 익숙한 노래를 듣자 어린 시절이 그리워졌다. 한동안 잊었던, 살아가며 즐거웠던 일들이 떠올랐다.", "scene_id": "c04-dense-049", "filename": "FAUST_C04_V04_0096_c04-dense-049_NAR.wav", "voice": "Charon", "performance": {"emotion": "상실과 그리움, 절제된 울먹임", "intensity": 0.4, "pace": "slow", "delivery": "warm_storytelling", "pause_after_ms": 650, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0097", "speaker": "파우스트", "text": "믿음은 아직 없는데, 이 노래를 듣던 나는 분명 내 안에 남아 있어.", "scene_id": "c04-dense-049", "filename": "FAUST_C04_V04_0097_c04-dense-049_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0098", "speaker": "나레이터", "text": "숲과 풀밭을 걷던 날들, 기도하며 가슴이 벅차던 순간들이 돌아왔다. 봄날의 놀이와 자유로운 기쁨도 함께 떠올랐다. 파우스트의 눈에서 눈물이 흘렀다. 모든 문제가 해결된 것은 아니어도, 그는 더는 방금의 결심을 따라가지 않았다. 눈물을 흘리며 파우스트는 다시 살아가고 싶다고 느꼈다.", "scene_id": "c04-dense-050", "filename": "FAUST_C04_V04_0098_c04-dense-050_NAR.wav", "voice": "Charon", "performance": {"emotion": "상실과 그리움, 절제된 울먹임", "intensity": 0.4, "pace": "slow", "delivery": "warm_storytelling", "pause_after_ms": 650, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0099", "speaker": "파우스트", "text": "계속 들려줘. 아직 내게 돌아오는 기억이 있어. 나는 지금 여기 살아 있어.", "scene_id": "c04-dense-050", "filename": "FAUST_C04_V04_0099_c04-dense-050_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0100", "speaker": "나레이터", "text": "이번에는 스승을 떠나보낸 제자들의 슬픔이 노래에 담겼다. 높은 곳의 기쁨을 말하면서도 땅에 남은 사람들의 그리움을 숨기지 않는 목소리였다. 파우스트는 그 슬픔까지 들었다. 자신 말고도 소중한 이를 잃고 슬퍼하는 사람들이 있다는 생각이 들었다.", "scene_id": "c04-dense-051", "filename": "FAUST_C04_V04_0100_c04-dense-051_NAR.wav", "voice": "Charon", "performance": {"emotion": "상실과 그리움, 절제된 울먹임", "intensity": 0.4, "pace": "slow", "delivery": "warm_storytelling", "pause_after_ms": 650, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0101", "speaker": "파우스트", "text": "기쁨을 노래하는 사람들에게도 그리움과 눈물이 있구나.", "scene_id": "c04-dense-051", "filename": "FAUST_C04_V04_0101_c04-dense-051_FAU.wav", "voice": "Orus", "performance": {"emotion": "상실과 그리움, 절제된 울먹임", "intensity": 0.65, "pace": "slow", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 650, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "첫마디 전 숨을 삼킨다. 목 끝의 가벼운 떨림과 필요시 한 번의 작은 훌쩍임. 통곡하지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C04_0102", "speaker": "나레이터", "text": "천사들의 노래가 다시 이어졌다. 사랑을 행동으로 보이고, 음식을 나누고, 서로에게 기쁨을 전하라는 내용이었다. 혼자서 모든 답을 찾으려 했던 밤이었다. 이제는 서로 돕고 나누며 살라는 노랫말에 귀가 갔다. 파우스트는 달라지는 빛 속에서 그 노래에 귀를 기울였다.", "scene_id": "c04-dense-052", "filename": "FAUST_C04_V04_0102_c04-dense-052_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C04_0103", "speaker": "파우스트", "text": "아직 모르는 것이 많아. 그래도 지금은 이 세상에 남아, 다음 소리를 듣고 싶어.", "scene_id": "c04-dense-052", "filename": "FAUST_C04_V04_0103_c04-dense-052_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}]}]};
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
                const name='FAUST_C04_V04_RETRY.json';
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
                link.href=mergedMp3Url;link.download='FAUST_C04_V04_FULL.mp3';link.classList.remove('hidden');
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
    