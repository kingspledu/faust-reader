
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


        const originalEpisode = {"schema_version": "faust-tts-1.0", "chapter": 11, "title": "방에 남겨진 보석 상자", "language": "ko-KR", "revision": "V04", "voices": {"나레이터": "Charon", "시인": "Charon", "지배인": "Orus", "희극 배우": "Puck", "라파엘": "Sulafat", "가브리엘": "Kore", "미카엘": "Orus", "메피스토펠레스": "Fenrir", "파우스트": "Orus", "바그너": "Puck", "직공 청년": "Puck", "세 번째 직공 청년": "Puck", "다섯 번째 직공 청년": "Orus", "첫 번째 하녀": "Kore", "다른 하녀": "Sulafat", "시민의 딸": "Kore", "두 번째 학생": "Puck", "첫 번째 학생": "Fenrir", "첫 번째 시민": "Orus", "거지": "Charon", "두 번째 시민": "Fenrir", "세 번째 시민": "Orus", "노파": "Sulafat", "아가테": "Kore", "군인": "Fenrir", "목동": "Puck", "춤추는 사람": "Puck", "춤추는 아가씨": "Kore", "늙은 농부": "Charon", "학생": "Puck", "프로슈": "Puck", "브란더": "Fenrir", "지벨": "Orus", "알트마이어": "Charon", "수컷 원숭이": "Puck", "암컷 원숭이": "Kore", "마녀": "Sulafat", "그레트헨": "Kore"}, "scenes": [{"scene_id": "C11", "title": "파우스트 11장", "segments": [{"id": "C11_0000", "speaker": "나레이터", "text": "작고 깨끗한 방에서 그레트헨이 머리를 땋아 올렸다. 낮에 길에서 말을 건 남자가 누구였는지 궁금했다. 귀한 집 사람처럼 보였다는 것도 그녀의 짐작이었다. 그녀가 방을 나간 뒤 메피스토펠레스가 파우스트를 조용히 안으로 이끌었다. 파우스트는 잠시 서 있다가 혼자 있게 해 달라고 했다.", "scene_id": "c11-dense-001", "filename": "FAUST_C11_V04_0000_c11-dense-001_NAR.wav", "voice": "Charon", "performance": {"emotion": "첫 만남 뒤의 궁금함", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0001", "speaker": "그레트헨", "text": "그렇게 대담하게 말을 걸다니, 평소에도 남의 눈치를 보지 않는 사람인가 봐. 대체 누구였을까?", "scene_id": "c11-dense-001", "filename": "FAUST_C11_V04_0001_c11-dense-001_GRE.wav", "voice": "Kore", "performance": {"emotion": "첫 만남 뒤의 궁금함", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0002", "speaker": "나레이터", "text": "메피스토펠레스는 방이 깨끗하다며 둘러보고 밖으로 나갔다. 혼자 남은 파우스트는 저녁빛이 스미는 방을 천천히 살폈다. 값비싼 물건은 없어도 물건마다 제자리에 놓여 있었다. 그는 그레트헨의 평소 생활을 조금 알게 된 듯한 기분이 들었다.", "scene_id": "c11-dense-002", "filename": "FAUST_C11_V04_0002_c11-dense-002_NAR.wav", "voice": "Charon", "performance": {"emotion": "조용한 방에서 느끼는 감동과 망설임", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0003", "speaker": "파우스트", "text": "아까 거리에서는 얼굴만 보았지. 이곳에서 어떤 하루를 보내는지는 생각해 보지 않았어.", "scene_id": "c11-dense-002", "filename": "FAUST_C11_V04_0003_c11-dense-002_FAU.wav", "voice": "Orus", "performance": {"emotion": "조용한 방에서 느끼는 감동과 망설임", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0004", "speaker": "나레이터", "text": "파우스트는 좁고 가난한 방에서도 편안함이 느껴진다고 중얼거렸다. 침대 곁 가죽 안락의자에 앉자 오래 쓰인 가구가 눈에 들어왔다. 그는 이 의자에 누가 앉았을지 상상했다. 자신의 집도 아닌데 잠깐 손님처럼 기대앉고 싶어졌다.", "scene_id": "c11-dense-003", "filename": "FAUST_C11_V04_0004_c11-dense-003_NAR.wav", "voice": "Charon", "performance": {"emotion": "조용한 방에서 느끼는 감동과 망설임", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0005", "speaker": "파우스트", "text": "낡은 의자지만 버리지 않고 오래 썼겠지. 이 방에는 내가 모르는 시간이 많이 쌓여 있겠군.", "scene_id": "c11-dense-003", "filename": "FAUST_C11_V04_0005_c11-dense-003_FAU.wav", "voice": "Orus", "performance": {"emotion": "조용한 방에서 느끼는 감동과 망설임", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0006", "speaker": "나레이터", "text": "파우스트는 아이들이 의자 둘레에 모이고 어린 그레트헨이 할아버지의 손에 입을 맞추는 모습을 떠올렸다. 실제로 보거나 전해 들은 일이 아니라, 어쩌면 그랬을 거라는 상상이었다. 탁자의 천과 정돈된 바닥도 살폈다. 그는 그레트헨과 어머니가 함께 꾸렸을 생활을 생각하며 마음이 누그러졌다.", "scene_id": "c11-dense-004", "filename": "FAUST_C11_V04_0006_c11-dense-004_NAR.wav", "voice": "Charon", "performance": {"emotion": "조용한 방에서 느끼는 감동과 망설임", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0007", "speaker": "파우스트", "text": "나는 이 집 사람을 거의 모르는데도 자꾸 상상하고 있어. 그 아이가 어떻게 살아왔는지 알고 싶군.", "scene_id": "c11-dense-004", "filename": "FAUST_C11_V04_0007_c11-dense-004_FAU.wav", "voice": "Orus", "performance": {"emotion": "조용한 방에서 느끼는 감동과 망설임", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0008", "speaker": "나레이터", "text": "그는 이 작은 집을 그토록 소중하게 느끼게 하는 것이 그레트헨의 손길이라고 여겼다. 그러다 침대 쪽으로 눈을 돌리고 커튼을 들어 올렸다. 침대는 비어 있었다. 파우스트는 다른 사람의 사적인 공간에 들어와 있다는 사실을 잊은 채 한동안 그 앞에 머물렀다.", "scene_id": "c11-dense-005", "filename": "FAUST_C11_V04_0008_c11-dense-005_NAR.wav", "voice": "Charon", "performance": {"emotion": "조용한 방에서 느끼는 감동과 망설임", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0009", "speaker": "파우스트", "text": "여기가 매일 잠드는 자리겠지. 너무 가까이 들어온 것 같은데도 발이 떨어지지 않아.", "scene_id": "c11-dense-005", "filename": "FAUST_C11_V04_0009_c11-dense-005_FAU.wav", "voice": "Orus", "performance": {"emotion": "조용한 방에서 느끼는 감동과 망설임", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0010", "speaker": "나레이터", "text": "파우스트는 그레트헨이 이 방에서 어린 시절을 보내고 자랐으리라 생각했다. 그는 그녀를 천사처럼 아름답고 순수한 사람으로 떠올렸다. 아직 잘 알지도 못하는데 이미 완벽한 모습으로 마음속에 그리는 중이었다. 방은 그대로 조용했지만 그는 쉽게 자리를 뜨지 못했다.", "scene_id": "c11-dense-006", "filename": "FAUST_C11_V04_0010_c11-dense-006_NAR.wav", "voice": "Charon", "performance": {"emotion": "조용한 방에서 느끼는 감동과 망설임", "intensity": 0.4, "pace": "slow", "delivery": "warm_storytelling", "pause_after_ms": 650, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0011", "speaker": "파우스트", "text": "이곳에서는 아까처럼 큰소리칠 마음이 들지 않아. 내가 보고 싶었던 것은 정말 무엇이었을까?", "scene_id": "c11-dense-006", "filename": "FAUST_C11_V04_0011_c11-dense-006_FAU.wav", "voice": "Orus", "performance": {"emotion": "조용한 방에서 느끼는 감동과 망설임", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0012", "speaker": "나레이터", "text": "마침내 파우스트는 자신에게 물었다. 무엇 때문에 남의 방까지 들어왔느냐는 질문이었다. 거리에서 메피스토펠레스를 재촉할 때는 주저하지 않았는데, 이제는 자신이 하려던 일이 낯설었다. 그레트헨은 그가 이곳에 있는 줄도 몰랐다.", "scene_id": "c11-dense-007", "filename": "FAUST_C11_V04_0012_c11-dense-007_NAR.wav", "voice": "Charon", "performance": {"emotion": "자신의 행동을 돌아보는 부끄러움과 혼란", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0013", "speaker": "파우스트", "text": "다시 만나고 싶다는 생각만 했어. 그런데 만나지도 못한 채 허락 없는 방에 서 있잖아.", "scene_id": "c11-dense-007", "filename": "FAUST_C11_V04_0013_c11-dense-007_FAU.wav", "voice": "Orus", "performance": {"emotion": "자신의 행동을 돌아보는 부끄러움과 혼란", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0014", "speaker": "나레이터", "text": "파우스트는 마음이 무거워지는 이유를 찾으려 했다. 마치 방 안의 공기가 자신을 바꿔 놓은 것 같았다. 곧장 원하는 것을 얻으려던 마음과 지금의 망설임이 너무 달랐다. 그는 스스로에게조차 달라진 태도를 설명하기 어려웠다.", "scene_id": "c11-dense-008", "filename": "FAUST_C11_V04_0014_c11-dense-008_NAR.wav", "voice": "Charon", "performance": {"emotion": "자신의 행동을 돌아보는 부끄러움과 혼란", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0015", "speaker": "파우스트", "text": "조금 전까지는 무엇이든 해 달라고 했는데, 지금은 왜 이리 부끄럽지?", "scene_id": "c11-dense-008", "filename": "FAUST_C11_V04_0015_c11-dense-008_FAU.wav", "voice": "Orus", "performance": {"emotion": "자신의 행동을 돌아보는 부끄러움과 혼란", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0016", "speaker": "나레이터", "text": "파우스트는 그레트헨이 당장 문을 열고 들어오는 경우를 떠올렸다. 무슨 말을 해야 할지 알 수 없었다. 자신만만하게 굴던 사람이 정작 그녀 앞에서는 초라해질 것 같았다. 그는 방에 들어온 일을 잘못이라고 느끼면서도 아직 떠나지 않고 있었다.", "scene_id": "c11-dense-009", "filename": "FAUST_C11_V04_0016_c11-dense-009_NAR.wav", "voice": "Charon", "performance": {"emotion": "자신의 행동을 돌아보는 부끄러움과 혼란", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0017", "speaker": "파우스트", "text": "여기서 무엇을 하느냐고 묻는다면 변명도 못 하겠지. 지금이라도 나가는 편이 낫겠어.", "scene_id": "c11-dense-009", "filename": "FAUST_C11_V04_0017_c11-dense-009_FAU.wav", "voice": "Orus", "performance": {"emotion": "자신의 행동을 돌아보는 부끄러움과 혼란", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0018", "speaker": "나레이터", "text": "그때 메피스토펠레스가 돌아와 그레트헨이 아래로 오는 것이 보인다고 알렸다. 파우스트는 놀라 바로 나가자고 했다. 마음속으로만 그리던 상황이 실제로 닥칠 것 같아지자 머뭇거릴 틈이 없었다. 그는 다시는 오지 않겠다는 말까지 꺼냈다.", "scene_id": "c11-dense-010", "filename": "FAUST_C11_V04_0018_c11-dense-010_NAR.wav", "voice": "Charon", "performance": {"emotion": "자신의 행동을 돌아보는 부끄러움과 혼란", "intensity": 0.4, "pace": "slow", "delivery": "warm_storytelling", "pause_after_ms": 650, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0019", "speaker": "파우스트", "text": "정말 돌아오는군. 여기서 마주칠 수는 없어. 어서 나가야 해.", "scene_id": "c11-dense-010", "filename": "FAUST_C11_V04_0019_c11-dense-010_FAU.wav", "voice": "Orus", "performance": {"emotion": "자신의 행동을 돌아보는 부끄러움과 혼란", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0020", "speaker": "나레이터", "text": "파우스트가 떠나려는데 메피스토펠레스가 작은 상자를 내밀었다. 제법 무거운 그 안에는 보석이 들어 있었다. 그는 그레트헨이 보면 정신을 빼앗길 거라며 수납장에 놓아두라고 했다. 파우스트의 망설임을 보는 대신 그레트헨의 관심을 끌 방법만 밀어붙였다.", "scene_id": "c11-dense-011", "filename": "FAUST_C11_V04_0020_c11-dense-011_NAR.wav", "voice": "Charon", "performance": {"emotion": "재촉과 유혹, 파우스트의 주저함", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0021", "speaker": "메피스토펠레스", "text": "지금 돌아서게 두면 곤란하지. 저 상자를 발견하고 무슨 일이 생기는지 궁금하게 만들어야겠군.", "scene_id": "c11-dense-011", "filename": "FAUST_C11_V04_0021_c11-dense-011_MEP.wav", "voice": "Fenrir", "performance": {"emotion": "재촉과 유혹, 파우스트의 주저함", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "한 번의 낮고 짧은 숨 섞인 웃음. 정중한 말투 아래 장난기. 매 문장 반복 금지.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0022", "speaker": "나레이터", "text": "메피스토펠레스는 소녀에게는 이런 물건이 통한다는 듯 말했다. 파우스트는 그래도 되는지 모르겠다며 주저했다. 그러자 메피스토펠레스는 보석이 아까워서 그러느냐고 엉뚱하게 되물었다. 잘못된 일일지 모른다는 걱정을 인색함의 문제로 바꿔 버린 것이다.", "scene_id": "c11-dense-012", "filename": "FAUST_C11_V04_0022_c11-dense-012_NAR.wav", "voice": "Charon", "performance": {"emotion": "재촉과 유혹, 파우스트의 주저함", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0023", "speaker": "파우스트", "text": "보석이 아까운 게 아니야. 그런데 내가 무엇 때문에 망설이는지 제대로 말할 수도 없군.", "scene_id": "c11-dense-012", "filename": "FAUST_C11_V04_0023_c11-dense-012_FAU.wav", "voice": "Orus", "performance": {"emotion": "재촉과 유혹, 파우스트의 주저함", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0024", "speaker": "나레이터", "text": "메피스토펠레스는 자신의 시간과 수고를 낭비시키지 말라며 재촉했다. 파우스트가 결정을 내리기도 전에 상자를 수납장 안에 넣었다. 자물쇠를 다시 누르고는 빨리 나가자고 했다. 그레트헨이 모르는 사이 방 안에 낯선 물건이 남았다.", "scene_id": "c11-dense-013", "filename": "FAUST_C11_V04_0024_c11-dense-013_NAR.wav", "voice": "Charon", "performance": {"emotion": "재촉과 유혹, 파우스트의 주저함", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0025", "speaker": "메피스토펠레스", "text": "일단 놓아두면 그다음은 저 아이가 발견하겠지. 이제 여기서 사라지기만 하면 돼.", "scene_id": "c11-dense-013", "filename": "FAUST_C11_V04_0025_c11-dense-013_MEP.wav", "voice": "Fenrir", "performance": {"emotion": "재촉과 유혹, 파우스트의 주저함", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "한 번의 낮고 짧은 숨 섞인 웃음. 정중한 말투 아래 장난기. 매 문장 반복 금지.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0026", "speaker": "나레이터", "text": "메피스토펠레스는 파우스트가 강의실에 들어갈 사람처럼 굳어 있다며 비꼬고 그를 데리고 나갔다. 뒤이어 그레트헨이 등불을 들고 방으로 돌아왔다. 밖은 그리 덥지 않은데 안은 답답하게 느껴졌다. 창문을 연 그녀는 어머니가 어서 돌아왔으면 좋겠다고 생각했다.", "scene_id": "c11-dense-014", "filename": "FAUST_C11_V04_0026_c11-dense-014_NAR.wav", "voice": "Charon", "performance": {"emotion": "이유를 모르는 불안에서 노래로 마음을 진정함", "intensity": 0.4, "pace": "slow", "delivery": "warm_storytelling", "pause_after_ms": 650, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0027", "speaker": "그레트헨", "text": "공기를 좀 바꾸면 괜찮아질까? 평소처럼 돌아온 방인데 오늘은 왜 이렇게 낯설지?", "scene_id": "c11-dense-014", "filename": "FAUST_C11_V04_0027_c11-dense-014_GRE.wav", "voice": "Kore", "performance": {"emotion": "이유를 모르는 불안에서 노래로 마음을 진정함", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0028", "speaker": "나레이터", "text": "그레트헨은 온몸에 소름이 돋는다며 스스로 겁이 많다고 중얼거렸다. 마음을 가라앉히려 옷가지를 정리하며 노래를 불렀다. 툴레라는 먼 곳의 왕이 죽은 연인에게 받은 금잔을 평생 아꼈다는 이야기였다. 왕은 나라를 물려주면서도 그 잔만은 다른 사람에게 주지 않았다.", "scene_id": "c11-dense-015", "filename": "FAUST_C11_V04_0028_c11-dense-015_NAR.wav", "voice": "Charon", "performance": {"emotion": "이유를 모르는 불안에서 노래로 마음을 진정함", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0029", "speaker": "그레트헨", "text": "노래나 부르면서 정리하자. 가만히 있으면 괜히 더 무서워지겠어.", "scene_id": "c11-dense-015", "filename": "FAUST_C11_V04_0029_c11-dense-015_GRE.wav", "voice": "Kore", "performance": {"emotion": "이유를 모르는 불안에서 노래로 마음을 진정함", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0030", "speaker": "나레이터", "text": "노래 속 늙은 왕은 마지막 잔치에서 금잔으로 술을 마시고 그것을 바다에 던졌다. 잔이 가라앉자 왕은 다시는 마시지 않았다는 내용이었다. 그레트헨은 노래를 마치고 옷을 넣으려고 수납장을 열었다. 거기에 자신이 두지 않은 예쁜 상자가 있었다.", "scene_id": "c11-dense-016", "filename": "FAUST_C11_V04_0030_c11-dense-016_NAR.wav", "voice": "Charon", "performance": {"emotion": "이유를 모르는 불안에서 노래로 마음을 진정함", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0031", "speaker": "그레트헨", "text": "이 상자는 뭐지? 아까 나갈 때도 여기에 있었나?", "scene_id": "c11-dense-016", "filename": "FAUST_C11_V04_0031_c11-dense-016_GRE.wav", "voice": "Kore", "performance": {"emotion": "이유를 모르는 불안에서 노래로 마음을 진정함", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0032", "speaker": "나레이터", "text": "그레트헨은 분명 수납장을 잠갔다고 기억했다. 상자가 들어온 까닭을 생각하다 누군가 어머니에게 담보로 맡긴 물건일지 모른다고 짐작했다. 귀한 물건을 맡기고 돈을 빌리는 경우를 떠올린 것이다. 누군가 몰래 방에 들어왔다는 사실은 알지 못했다.", "scene_id": "c11-dense-017", "filename": "FAUST_C11_V04_0032_c11-dense-017_NAR.wav", "voice": "Charon", "performance": {"emotion": "낯선 상자에 대한 의심과 호기심", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0033", "speaker": "그레트헨", "text": "어머니가 받아 두셨나 봐. 그게 아니면 잠긴 수납장에 어떻게 들어왔겠어?", "scene_id": "c11-dense-017", "filename": "FAUST_C11_V04_0033_c11-dense-017_GRE.wav", "voice": "Kore", "performance": {"emotion": "낯선 상자에 대한 의심과 호기심", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0034", "speaker": "나레이터", "text": "끈에 달린 작은 열쇠가 눈에 띄었다. 그레트헨은 열어 봐도 되겠다고 생각하고 상자를 열었다. 안에는 지금까지 직접 본 적 없는 화려한 보석들이 있었다. 그녀는 놀라 소리를 내고 한동안 들여다보았다.", "scene_id": "c11-dense-018", "filename": "FAUST_C11_V04_0034_c11-dense-018_NAR.wav", "voice": "Charon", "performance": {"emotion": "낯선 상자에 대한 의심과 호기심", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0035", "speaker": "그레트헨", "text": "이렇게 반짝이는 것들이 전부 진짜 보석일까? 누구 물건이길래 이렇게 많지?", "scene_id": "c11-dense-018", "filename": "FAUST_C11_V04_0035_c11-dense-018_GRE.wav", "voice": "Kore", "performance": {"emotion": "낯선 상자에 대한 의심과 호기심", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0036", "speaker": "나레이터", "text": "그레트헨은 귀한 부인이 큰 축일에 할 만한 장신구라고 생각했다. 주인이 누구인지 궁금해하면서도 목걸이가 자신에게 어울릴지 알고 싶어졌다. 상자를 발견한 놀라움이 호기심으로 바뀌었다. 그녀는 조심스럽게 보석을 꺼냈다.", "scene_id": "c11-dense-019", "filename": "FAUST_C11_V04_0036_c11-dense-019_NAR.wav", "voice": "Charon", "performance": {"emotion": "낯선 상자에 대한 의심과 호기심", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0037", "speaker": "그레트헨", "text": "잠깐 대어 보는 것 정도는 괜찮겠지. 나한테는 어떤 모습일까?", "scene_id": "c11-dense-019", "filename": "FAUST_C11_V04_0037_c11-dense-019_GRE.wav", "voice": "Kore", "performance": {"emotion": "낯선 상자에 대한 의심과 호기심", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0038", "speaker": "나레이터", "text": "그레트헨은 목걸이와 귀걸이를 해 보고 거울 앞에 섰다. 옷은 그대로인데 장신구가 더해지자 모습이 달라 보였다. 귀걸이가 자기 것이면 좋겠다는 생각도 들었다. 그녀는 거울을 보며 아름답고 젊다는 것만으로는 세상이 자신을 다르게 대하지 않는다고 느꼈다.", "scene_id": "c11-dense-020", "filename": "FAUST_C11_V04_0038_c11-dense-020_NAR.wav", "voice": "Charon", "performance": {"emotion": "달라진 모습에 대한 기쁨과 가난에 대한 씁쓸함", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0039", "speaker": "그레트헨", "text": "보석 하나로 이렇게 달라 보이다니. 사람들도 이 모습을 보면 다르게 말할까?", "scene_id": "c11-dense-020", "filename": "FAUST_C11_V04_0039_c11-dense-020_GRE.wav", "voice": "Kore", "performance": {"emotion": "달라진 모습에 대한 기쁨과 가난에 대한 씁쓸함", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C11_0040", "speaker": "나레이터", "text": "그레트헨은 가난한 사람을 칭찬할 때조차 동정하는 듯한 태도를 떠올렸다. 모두가 금을 원하고 많은 일이 돈에 달려 있다고 탄식했다. 처음에는 신기해서 열어 본 상자가 이제는 자신의 형편을 생각하게 했다. 보석의 주인이 누구인지는 여전히 몰랐다.", "scene_id": "c11-dense-021", "filename": "FAUST_C11_V04_0040_c11-dense-021_NAR.wav", "voice": "Charon", "performance": {"emotion": "달라진 모습에 대한 기쁨과 가난에 대한 씁쓸함", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C11_0041", "speaker": "그레트헨", "text": "예뻐 보이는 것보다 가진 것이 더 중요하다는 걸까? 갖고 싶어도 내 것이라고 할 수는 없는데.", "scene_id": "c11-dense-021", "filename": "FAUST_C11_V04_0041_c11-dense-021_GRE.wav", "voice": "Kore", "performance": {"emotion": "달라진 모습에 대한 기쁨과 가난에 대한 씁쓸함", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡. 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}]}]};
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
                const name='FAUST_C11_V04_RETRY.json';
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
                link.href=mergedMp3Url;link.download='FAUST_C11_V04_FULL.mp3';link.classList.remove('hidden');
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
    