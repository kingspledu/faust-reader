
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


        const originalEpisode = {"schema_version": "faust-tts-1.0", "chapter": 6, "title": "푸들 속의 낯선 손님", "language": "ko-KR", "revision": "V04", "voices": {"나레이터": "Charon", "시인": "Charon", "지배인": "Orus", "희극 배우": "Puck", "라파엘": "Sulafat", "가브리엘": "Kore", "미카엘": "Orus", "메피스토펠레스": "Fenrir", "파우스트": "Orus", "바그너": "Puck", "직공 청년": "Puck", "세 번째 직공 청년": "Puck", "다섯 번째 직공 청년": "Orus", "첫 번째 하녀": "Kore", "다른 하녀": "Sulafat", "시민의 딸": "Kore", "두 번째 학생": "Puck", "첫 번째 학생": "Fenrir", "첫 번째 시민": "Orus", "거지": "Charon", "두 번째 시민": "Fenrir", "세 번째 시민": "Orus", "노파": "Sulafat", "아가테": "Kore", "군인": "Fenrir", "목동": "Puck", "춤추는 사람": "Puck", "춤추는 아가씨": "Kore", "늙은 농부": "Charon", "학생": "Puck"}, "scenes": [{"scene_id": "C06", "title": "파우스트 6장", "segments": [{"id": "C06_0000", "speaker": "나레이터", "text": "파우스트가 검은 푸들을 데리고 서재로 돌아왔다. 바그너와 걸었던 들판에는 어느새 밤이 내렸다. 한바탕 걷고 사람들의 노래를 듣고 나니, 파우스트는 어젯밤보다 한결 차분했다. 사람들을 사랑하고 신을 생각할 마음의 여유도 조금 생겼다.", "scene_id": "c06-dense-001", "filename": "FAUST_C06_V04_0000_c06-dense-001_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0001", "speaker": "파우스트", "text": "오늘 밖에 나가길 잘했어. 방 안에만 있었다면 이런 기분을 느끼지 못했겠지.", "scene_id": "c06-dense-001", "filename": "FAUST_C06_V04_0001_c06-dense-001_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0002", "speaker": "나레이터", "text": "푸들은 방에 들어와서도 이리저리 움직였다. 문턱을 킁킁거리자 파우스트는 난로 뒤에 누우라고 달랬다. 길에서 함께 놀며 즐겁게 해 준 개에게 좋은 방석을 내줄 생각이었다. 조금 수상했던 일은 잊고 반가운 손님으로 대하려 했다.", "scene_id": "c06-dense-002", "filename": "FAUST_C06_V04_0002_c06-dense-002_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0003", "speaker": "파우스트", "text": "어서 쉬렴. 오늘은 너도 많이 걸었잖니.", "scene_id": "c06-dense-002", "filename": "FAUST_C06_V04_0003_c06-dense-002_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0004", "speaker": "나레이터", "text": "등불이 켜지자 익숙한 방이 아늑하게 느껴졌다. 파우스트는 다시 생각을 가다듬을 수 있을 것 같았다. 더 배우고 살아가려는 의욕도 돌아왔다. 그런데 푸들의 으르렁거리는 소리가 그 조용한 시간을 방해했다.", "scene_id": "c06-dense-003", "filename": "FAUST_C06_V04_0004_c06-dense-003_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0005", "speaker": "파우스트", "text": "이제 좀 마음이 편해지는데, 저 녀석은 왜 자꾸 소리를 내지?", "scene_id": "c06-dense-003", "filename": "FAUST_C06_V04_0005_c06-dense-003_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0006", "speaker": "나레이터", "text": "파우스트는 그만 으르렁대라고 개를 꾸짖었다. 자신이 소중하게 여기는 생각을 방해받으니 짜증이 났다. 하지만 개를 조용히 시킨다고 해결될 일만은 아니었다. 산책하며 느꼈던 만족이 벌써 사라지고 있다는 것을 그도 알고 있었다.", "scene_id": "c06-dense-004", "filename": "FAUST_C06_V04_0006_c06-dense-004_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0007", "speaker": "파우스트", "text": "분명 밖에서는 좋았는데, 돌아오자마자 왜 또 이렇게 허전할까?", "scene_id": "c06-dense-004", "filename": "FAUST_C06_V04_0007_c06-dense-004_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0008", "speaker": "나레이터", "text": "파우스트는 신약성서를 읽어 보기로 했다. 예수의 삶과 가르침을 담은 책에서 지금의 막막함을 풀 실마리를 찾고 싶었다. 원어로 된 본문을 직접 독일어로 옮기면 한마디 한마디 더 깊이 생각할 수 있을 것 같았다.", "scene_id": "c06-dense-005", "filename": "FAUST_C06_V04_0008_c06-dense-005_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0009", "speaker": "파우스트", "text": "그냥 읽고 넘기지 말고, 무슨 뜻인지 내 말로 옮겨 보자.", "scene_id": "c06-dense-005", "filename": "FAUST_C06_V04_0009_c06-dense-005_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0010", "speaker": "나레이터", "text": "책을 펴자 첫 구절부터 막혔다. 태초에 말씀이 있었다는 문장이었다. 파우스트는 세상의 시작을 단지 말이라는 낱말로 설명하는 데 만족하지 못했다. 이 한마디가 무엇을 가리키는지 다시 생각하며 펜을 멈췄다.", "scene_id": "c06-dense-006", "filename": "FAUST_C06_V04_0010_c06-dense-006_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0011", "speaker": "파우스트", "text": "여기서 말씀은 그냥 입으로 하는 말과는 다를 텐데. 어떤 말로 옮겨야 할까?", "scene_id": "c06-dense-006", "filename": "FAUST_C06_V04_0011_c06-dense-006_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0012", "speaker": "나레이터", "text": "그는 말씀 대신 뜻이라고 적어 보았다. 하지만 생각과 뜻만으로 세상이 움직일 수 있을까? 이번에는 힘이라는 말을 떠올렸다. 더 알맞은 말을 찾으려 할수록 자신이 무엇을 중요하게 여기는지도 드러났다.", "scene_id": "c06-dense-007", "filename": "FAUST_C06_V04_0012_c06-dense-007_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0013", "speaker": "파우스트", "text": "뜻이 있어도 움직일 힘이 없으면 아무 일도 일어나지 않지. 그렇다면 힘이 먼저인가?", "scene_id": "c06-dense-007", "filename": "FAUST_C06_V04_0013_c06-dense-007_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0014", "speaker": "나레이터", "text": "파우스트는 끝내 행위라는 말을 골랐다. 생각이나 말에 머물지 않고 실제로 무언가를 하는 일이 중요하다고 느낀 것이다. 그가 확신을 갖고 써 내려가는 사이, 푸들은 더 크게 짖고 울었다. 파우스트는 또다시 개 쪽으로 돌아보았다.", "scene_id": "c06-dense-008", "filename": "FAUST_C06_V04_0014_c06-dense-008_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0015", "speaker": "파우스트", "text": "그래, 행동이 있어야 시작되지. 그런데 저 녀석 때문에 한 줄을 끝내기가 어렵구나.", "scene_id": "c06-dense-008", "filename": "FAUST_C06_V04_0015_c06-dense-008_FAU.wav", "voice": "Orus", "performance": {"emotion": "긴장과 확신, 속에 감춘 불안", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0016", "speaker": "나레이터", "text": "더는 참기 어려웠다. 파우스트는 함께 지내려면 조용히 하든가, 아니면 나가라고 말했다. 손님을 내쫓고 싶지는 않았지만 문은 열려 있었다. 그런데 푸들이 나가는 대신 그 자리에 머무르자 이상한 모습이 눈에 들어왔다.", "scene_id": "c06-dense-009", "filename": "FAUST_C06_V04_0016_c06-dense-009_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0017", "speaker": "파우스트", "text": "저게 왜 저렇게 보이지? 아까보다 커진 것 같은데.", "scene_id": "c06-dense-009", "filename": "FAUST_C06_V04_0017_c06-dense-009_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0018", "speaker": "나레이터", "text": "파우스트는 눈을 의심했다. 개의 몸이 길어지고 옆으로 부풀어 올랐다. 그림자가 크게 비친 것인지, 정말 몸이 달라진 것인지 선뜻 판단할 수 없었다. 그는 눈을 떼지 못한 채 푸들을 지켜보았다.", "scene_id": "c06-dense-010", "filename": "FAUST_C06_V04_0018_c06-dense-010_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0019", "speaker": "파우스트", "text": "분명 개 한 마리를 데려왔는데. 지금 내 눈앞에서 무슨 일이 일어나는 거지?", "scene_id": "c06-dense-010", "filename": "FAUST_C06_V04_0019_c06-dense-010_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0020", "speaker": "나레이터", "text": "개는 거세게 몸을 일으켰다. 불타는 듯한 눈과 커다란 이빨이 보였다. 덩치는 하마에 빗댈 만큼 커져 더는 평범한 개로 보이지 않았다. 파우스트는 자신이 낯선 정령을 집 안에 들였다는 생각에 긴장했다.", "scene_id": "c06-dense-011", "filename": "FAUST_C06_V04_0020_c06-dense-011_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0021", "speaker": "파우스트", "text": "들판에서 보았던 이상한 움직임이 착각만은 아니었구나.", "scene_id": "c06-dense-011", "filename": "FAUST_C06_V04_0021_c06-dense-011_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0022", "speaker": "나레이터", "text": "그는 마법으로 이 존재를 제압하려 했다. 솔로몬의 열쇠라고 불리는 옛 주문을 떠올렸다. 바로 그때 복도에서 다른 정령들의 목소리가 들려왔다. 그들은 방 안에 동료가 갇혔다며 서로 들어가지 말라고 했다.", "scene_id": "c06-dense-012", "filename": "FAUST_C06_V04_0022_c06-dense-012_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0023", "speaker": "파우스트", "text": "혼자가 아니었나? 저 밖의 목소리들도 이 녀석을 아는 모양이군.", "scene_id": "c06-dense-012", "filename": "FAUST_C06_V04_0023_c06-dense-012_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0024", "speaker": "나레이터", "text": "복도의 정령들은 동료를 덫에 걸린 여우에 빗대었다. 도울 수 있다면 버려두지 말자는 말도 들렸다. 정작 파우스트는 무엇 때문에 그 존재가 갇혔는지 아직 몰랐다. 자신에게 유리한 상황이라는 사실조차 모른 채 눈앞의 짐승을 상대하고 있었다.", "scene_id": "c06-dense-013", "filename": "FAUST_C06_V04_0024_c06-dense-013_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0025", "speaker": "파우스트", "text": "갇혔다고? 이 방에 무엇이 있기에 나가지 못하는 거지?", "scene_id": "c06-dense-013", "filename": "FAUST_C06_V04_0025_c06-dense-013_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0026", "speaker": "나레이터", "text": "파우스트는 불과 물, 공기와 땅에 속한 정령들을 부르는 주문부터 시험했다. 살라만더와 운디네, 실페 같은 이름은 그가 배운 마법에서 원소의 정령들을 가리켰다. 어떤 종류의 존재인지 알아내야 그에 맞는 방법으로 제압할 수 있다고 생각했다.", "scene_id": "c06-dense-014", "filename": "FAUST_C06_V04_0026_c06-dense-014_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0027", "speaker": "파우스트", "text": "우선 무엇인지부터 알아야 해. 내가 배운 주문이 통하는지 보자.", "scene_id": "c06-dense-014", "filename": "FAUST_C06_V04_0027_c06-dense-014_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0028", "speaker": "나레이터", "text": "그는 부르는 이름을 바꾸어 가며 주문을 이어 갔다. 불꽃 속으로 사라지라거나, 물처럼 흘러 모이라거나, 집 안을 도우라는 명령이었다. 그러나 그가 부른 정령들이 눈앞에 나타나지는 않았다. 푸들의 정체도 밝혀지지 않았다.", "scene_id": "c06-dense-015", "filename": "FAUST_C06_V04_0028_c06-dense-015_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0029", "speaker": "파우스트", "text": "이름을 잘못 짚었나? 왜 아무 반응이 없지?", "scene_id": "c06-dense-015", "filename": "FAUST_C06_V04_0029_c06-dense-015_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0030", "speaker": "나레이터", "text": "짐승은 태연하게 누워 파우스트를 바라보았다. 비웃는 듯한 표정까지 보였다. 파우스트는 네 원소에 속한 존재가 아니라는 결론을 내렸다. 처음 시도한 방법으로는 상대를 꼼짝 못 하게 할 수 없었다.", "scene_id": "c06-dense-016", "filename": "FAUST_C06_V04_0030_c06-dense-016_NAR.wav", "voice": "Charon", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0031", "speaker": "파우스트", "text": "내가 애쓰는 모습을 구경하고 있군. 그렇다면 더 강한 방법을 써야겠어.", "scene_id": "c06-dense-016", "filename": "FAUST_C06_V04_0031_c06-dense-016_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0032", "speaker": "나레이터", "text": "파우스트는 지옥에서 온 존재냐고 물으며 거룩한 표시를 내보였다. 이번에는 짐승의 털이 곤두서고 몸이 더 크게 부풀었다. 앞선 주문 때와는 반응이 달랐다. 그는 상대가 이 표시를 두려워한다고 생각했다.", "scene_id": "c06-dense-017", "filename": "FAUST_C06_V04_0032_c06-dense-017_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0033", "speaker": "파우스트", "text": "이제야 반응하는구나. 네 정체를 숨길 수는 없을 거야.", "scene_id": "c06-dense-017", "filename": "FAUST_C06_V04_0033_c06-dense-017_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0034", "speaker": "나레이터", "text": "그는 하늘에 계시며 창에 찔리신 분을 가리키는 말로 다시 위협했다. 예수를 떠올리게 하는 기독교의 표현이었다. 난로 뒤의 짐승은 방을 채울 만큼 커지다가 안개처럼 흐려졌다. 파우스트는 천장으로 달아나지 말라고 소리쳤다.", "scene_id": "c06-dense-018", "filename": "FAUST_C06_V04_0034_c06-dense-018_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0035", "speaker": "파우스트", "text": "흩어져 달아날 생각인가? 이번에는 놓치지 않겠어.", "scene_id": "c06-dense-018", "filename": "FAUST_C06_V04_0035_c06-dense-018_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0036", "speaker": "나레이터", "text": "파우스트는 발치에 엎드리라고 명령했다. 더 강한 마법을 쓰기 전에 멈추라는 경고였다. 안개가 부풀어 오르는 동안에도 그는 난로 뒤에서 눈을 떼지 않았다. 무엇이 모습을 드러낼지 알 수 없었다.", "scene_id": "c06-dense-019", "filename": "FAUST_C06_V04_0036_c06-dense-019_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0037", "speaker": "파우스트", "text": "나를 겁주려는 거라면 소용없어. 끝까지 정체를 확인하겠어.", "scene_id": "c06-dense-019", "filename": "FAUST_C06_V04_0037_c06-dense-019_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0038", "speaker": "나레이터", "text": "안개가 가라앉자 난로 뒤에서 남자 하나가 걸어 나왔다. 수수한 옷차림의 떠돌이 학자처럼 보였지만, 천상에서 파우스트를 유혹하겠다고 나섰던 악마 메피스토펠레스였다. 파우스트는 그런 내기가 있었다는 사실을 몰랐다. 그는 그저 푸들 속에 숨어 있던 존재를 마침내 마주했다.", "scene_id": "c06-dense-020", "filename": "FAUST_C06_V04_0038_c06-dense-020_NAR.wav", "voice": "Charon", "performance": {"emotion": "긴장과 확신, 속에 감춘 불안", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0039", "speaker": "파우스트", "text": "저 개가 사람으로 변한 건가. 이자가 줄곧 내 곁에 있었단 말이지?", "scene_id": "c06-dense-020", "filename": "FAUST_C06_V04_0039_c06-dense-020_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0040", "speaker": "나레이터", "text": "메피스토펠레스는 소란을 피울 일이 무엇이냐며 능청스럽게 인사했다. 파우스트는 악마가 떠돌이 학자 차림을 했다는 데 웃음을 터뜨렸다. 메피스토펠레스는 진땀을 흘리게 했다면서도 여전히 공손한 척했다. 둘 다 조금 전의 긴장을 먼저 드러내고 싶지 않았다.", "scene_id": "c06-dense-021", "filename": "FAUST_C06_V04_0040_c06-dense-021_NAR.wav", "voice": "Charon", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0041", "speaker": "메피스토펠레스", "text": "겨우 모습을 드러내게 해 놓고 기세가 좋군. 우선 저 사람이 무슨 말을 하는지 들어 보자.", "scene_id": "c06-dense-021", "filename": "FAUST_C06_V04_0041_c06-dense-021_MEP.wav", "voice": "Fenrir", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "한 번의 낮고 짧은 숨 섞인 웃음. 정중한 말투 아래 장난기. 매 문장 반복 금지.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0042", "speaker": "나레이터", "text": "파우스트는 이름을 물었다. 메피스토펠레스는 말보다 본질을 찾는 사람이 왜 이름부터 묻느냐고 되받았다. 성서를 옮기며 말씀이라는 말에 만족하지 못했던 파우스트를 놀리는 것이었다. 파우스트는 악마들의 이름에는 본성이 드러난다며, 결국 무엇을 하는 존재냐고 다시 물었다.", "scene_id": "c06-dense-022", "filename": "FAUST_C06_V04_0042_c06-dense-022_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0043", "speaker": "파우스트", "text": "말을 돌리는군. 이름이든 하는 일이든, 네가 어떤 자인지 알아야겠어.", "scene_id": "c06-dense-022", "filename": "FAUST_C06_V04_0043_c06-dense-022_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0044", "speaker": "나레이터", "text": "메피스토펠레스는 악을 바라면서도 선을 이루는 힘의 일부라고 답했다. 파우스트는 모순처럼 들리는 그 말을 되물었다. 그러자 그는 자신이 언제나 부정하는 정령이라고 설명했다. 태어나는 것은 모두 사라져 마땅하니 처음부터 아무것도 생기지 않는 편이 낫다는 주장이었다.", "scene_id": "c06-dense-023", "filename": "FAUST_C06_V04_0044_c06-dense-023_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0045", "speaker": "메피스토펠레스", "text": "사람들은 무언가를 만들고 지키려 들지. 나는 그것을 무너뜨리는 쪽이야.", "scene_id": "c06-dense-023", "filename": "FAUST_C06_V04_0045_c06-dense-023_MEP.wav", "voice": "Fenrir", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "한 번의 낮고 짧은 숨 섞인 웃음. 정중한 말투 아래 장난기. 매 문장 반복 금지.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0046", "speaker": "나레이터", "text": "악마는 죄와 파괴가 자신의 본바탕이라고 말했다. 그런데도 자신을 일부라고 부르는 것이 파우스트에게는 이상했다. 메피스토펠레스는 빛이 생기기 전의 어둠을 이야기했다. 자신은 그 오래된 어둠에 속한 일부라는 설명이었다.", "scene_id": "c06-dense-024", "filename": "FAUST_C06_V04_0046_c06-dense-024_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0047", "speaker": "파우스트", "text": "눈앞에는 멀쩡한 한 사람이 서 있는데, 자신은 더 큰 무언가의 일부라는 건가?", "scene_id": "c06-dense-024", "filename": "FAUST_C06_V04_0047_c06-dense-024_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0048", "speaker": "나레이터", "text": "메피스토펠레스는 빛이 물체에 붙들려 있으니 물체가 사라지면 빛도 없어지리라고 기대했다. 파우스트는 그 말을 듣고 비꼬았다. 세계 전체는 없애지 못하니 작은 것부터 파괴하고 다니는 것 아니냐는 말이었다. 메피스토펠레스도 그마저 쉽지 않다고 인정했다.", "scene_id": "c06-dense-025", "filename": "FAUST_C06_V04_0048_c06-dense-025_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0049", "speaker": "파우스트", "text": "모든 것을 부정한다더니, 정작 네 뜻대로 되는 일은 많지 않은 모양이군.", "scene_id": "c06-dense-025", "filename": "FAUST_C06_V04_0049_c06-dense-025_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0050", "speaker": "나레이터", "text": "그는 폭풍과 지진, 불을 동원해도 땅과 바다는 남아 있다고 불평했다. 사람과 동물도 아무리 죽어도 새 생명이 태어난다고 했다. 파우스트를 겁주려던 자기소개는 어느새 세상을 없애지 못한다는 푸념이 되었다.", "scene_id": "c06-dense-026", "filename": "FAUST_C06_V04_0050_c06-dense-026_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0051", "speaker": "메피스토펠레스", "text": "끝났나 싶으면 또 태어나지. 저 끈질긴 생명들을 보면 화가 날 지경이야.", "scene_id": "c06-dense-026", "filename": "FAUST_C06_V04_0051_c06-dense-026_MEP.wav", "voice": "Fenrir", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "한 번의 낮고 짧은 숨 섞인 웃음. 정중한 말투 아래 장난기. 매 문장 반복 금지.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0052", "speaker": "나레이터", "text": "공기와 물과 땅, 따뜻한 곳과 차가운 곳 어디에서든 생명은 다시 자랐다. 메피스토펠레스는 그 사실을 못마땅해했다. 파우스트는 그런 힘을 악마가 이길 수 없다고 맞섰다. 어젯밤에는 자신의 무력함에 절망했지만, 지금은 악마도 뜻대로 할 수 없는 일이 있다는 것을 보았다.", "scene_id": "c06-dense-027", "filename": "FAUST_C06_V04_0052_c06-dense-027_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0053", "speaker": "파우스트", "text": "네가 아무리 없애려 해도 다시 살아나는구나. 세상이 그렇게 만만하지는 않지.", "scene_id": "c06-dense-027", "filename": "FAUST_C06_V04_0053_c06-dense-027_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0054", "speaker": "나레이터", "text": "파우스트가 다른 할 일을 찾아보라고 하자 메피스토펠레스는 다음에 더 이야기하자며 화제를 돌렸다. 그러더니 나가도 되겠느냐고 물었다. 파우스트는 뜻밖의 질문에 의아했다. 제 발로 들어온 악마가 나갈 때는 왜 허락을 구하는지 알 수 없었다.", "scene_id": "c06-dense-028", "filename": "FAUST_C06_V04_0054_c06-dense-028_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0055", "speaker": "메피스토펠레스", "text": "이야기는 이쯤 하고 싶은데, 우선 이 방에서 나갈 수 있어야겠군.", "scene_id": "c06-dense-028", "filename": "FAUST_C06_V04_0055_c06-dense-028_MEP.wav", "voice": "Fenrir", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "한 번의 낮고 짧은 숨 섞인 웃음. 정중한 말투 아래 장난기. 매 문장 반복 금지.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0056", "speaker": "나레이터", "text": "파우스트는 창과 문, 굴뚝까지 있다며 마음대로 가라고 했다. 메피스토펠레스는 문턱의 오각별 때문에 못 나간다고 털어놓았다. 다섯 꼭짓점을 이어 그린 그 표시가 악마를 붙잡고 있었다. 지금까지 파우스트도 그 사실을 모르고 있었다.", "scene_id": "c06-dense-029", "filename": "FAUST_C06_V04_0056_c06-dense-029_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0057", "speaker": "메피스토펠레스", "text": "결국 말해야겠군. 저 표시만 치우게 하면 될 텐데.", "scene_id": "c06-dense-029", "filename": "FAUST_C06_V04_0057_c06-dense-029_MEP.wav", "voice": "Fenrir", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "한 번의 낮고 짧은 숨 섞인 웃음. 정중한 말투 아래 장난기. 매 문장 반복 금지.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0058", "speaker": "나레이터", "text": "파우스트는 그렇다면 어떻게 들어왔느냐고 물었다. 악마를 막는 표시가 있는데도 푸들은 문턱을 넘었다. 메피스토펠레스는 별을 자세히 보라고 했다. 모양이 완벽하게 닫혀 있지 않았다.", "scene_id": "c06-dense-030", "filename": "FAUST_C06_V04_0058_c06-dense-030_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0059", "speaker": "파우스트", "text": "막을 수 있는 표시라면 들어오는 것도 막아야 하지 않나? 무슨 차이가 있는 거지?", "scene_id": "c06-dense-030", "filename": "FAUST_C06_V04_0059_c06-dense-030_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0060", "speaker": "나레이터", "text": "문 밖을 향한 한쪽 꼭짓점이 조금 벌어져 있었다. 그 틈 때문에 들어올 수는 있었지만, 이제는 나갈 수 없다는 설명이었다. 파우스트는 우연히 악마를 붙잡게 되었다며 기뻐했다. 갑자기 자신이 상대보다 유리해졌다고 느꼈다.", "scene_id": "c06-dense-031", "filename": "FAUST_C06_V04_0060_c06-dense-031_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0061", "speaker": "파우스트", "text": "이런 우연도 있군. 지금은 네가 내게 부탁해야 하는 처지야.", "scene_id": "c06-dense-031", "filename": "FAUST_C06_V04_0061_c06-dense-031_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0062", "speaker": "나레이터", "text": "메피스토펠레스는 푸들일 때 뛰어 들어오며 그 표시를 몰랐다고 말했다. 파우스트는 창으로 나가면 되지 않느냐고 물었다. 그러자 악마와 유령들에게는 따로 지켜야 할 법이 있다는 답이 돌아왔다.", "scene_id": "c06-dense-032", "filename": "FAUST_C06_V04_0062_c06-dense-032_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0063", "speaker": "메피스토펠레스", "text": "몸을 바꾼다고 이 규칙까지 없어지는 것은 아니지. 조금 귀찮게 되었어.", "scene_id": "c06-dense-032", "filename": "FAUST_C06_V04_0063_c06-dense-032_MEP.wav", "voice": "Fenrir", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "한 번의 낮고 짧은 숨 섞인 웃음. 정중한 말투 아래 장난기. 매 문장 반복 금지.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0064", "speaker": "나레이터", "text": "그 법에 따르면 들어온 곳으로 다시 나가야 했다. 다른 문이나 창으로 빠져나갈 수는 없었다. 파우스트는 악마도 지키는 법이 있다면 약속을 맺어도 믿을 수 있겠다고 생각했다. 처음으로 계약을 입에 올렸지만, 구체적인 조건을 정한 것은 아니었다.", "scene_id": "c06-dense-033", "filename": "FAUST_C06_V04_0064_c06-dense-033_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0065", "speaker": "파우스트", "text": "무슨 약속이든 제멋대로 어길 수 있는 것은 아니군. 그렇다면 물어볼 것이 더 있어.", "scene_id": "c06-dense-033", "filename": "FAUST_C06_V04_0065_c06-dense-033_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0066", "speaker": "나레이터", "text": "메피스토펠레스는 약속한 몫을 떼어 가지 않을 거라고 답했다. 하지만 자세한 이야기는 다음에 하자며 이번에는 보내 달라고 청했다. 파우스트는 조금만 더 머물며 재미있는 이야기를 해 달라고 했다. 눈앞의 악마에게서 아직 듣고 싶은 것이 많았다.", "scene_id": "c06-dense-034", "filename": "FAUST_C06_V04_0066_c06-dense-034_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0067", "speaker": "메피스토펠레스", "text": "지금 계약 이야기를 길게 나눌 때는 아니야. 우선 나갈 방법부터 찾아야겠어.", "scene_id": "c06-dense-034", "filename": "FAUST_C06_V04_0067_c06-dense-034_MEP.wav", "voice": "Fenrir", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "한 번의 낮고 짧은 숨 섞인 웃음. 정중한 말투 아래 장난기. 매 문장 반복 금지.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0068", "speaker": "나레이터", "text": "메피스토펠레스가 곧 돌아오겠다고 해도 파우스트는 놓아줄 생각이 없었다. 자신이 덫을 놓은 것도 아니고 악마가 스스로 들어온 것이라고 했다. 이처럼 드문 기회를 다시 얻기는 어려울 것 같았다. 파우스트는 자신이 대화를 주도하고 있다고 믿었다.", "scene_id": "c06-dense-035", "filename": "FAUST_C06_V04_0068_c06-dense-035_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0069", "speaker": "파우스트", "text": "한 번 보내면 다시 내 질문에 답해 줄까? 지금 알아낼 수 있는 것은 알아내야 해.", "scene_id": "c06-dense-035", "filename": "FAUST_C06_V04_0069_c06-dense-035_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0070", "speaker": "나레이터", "text": "나가게 해 달라는 부탁이 통하지 않자 메피스토펠레스는 방법을 바꿨다. 잠시 머물며 재주를 보여 주겠다는 제안이었다. 파우스트가 동의하자 그는 한 시간 안에 일 년의 단조로운 생활보다 더 큰 즐거움을 주겠다고 장담했다.", "scene_id": "c06-dense-036", "filename": "FAUST_C06_V04_0070_c06-dense-036_NAR.wav", "voice": "Charon", "performance": {"emotion": "따뜻한 미소와 기대", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0071", "speaker": "메피스토펠레스", "text": "억지로 설득할 필요는 없겠군. 저 사람이 구경에 정신을 팔게 하면 돼.", "scene_id": "c06-dense-036", "filename": "FAUST_C06_V04_0071_c06-dense-036_MEP.wav", "voice": "Fenrir", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "한 번의 낮고 짧은 숨 섞인 웃음. 정중한 말투 아래 장난기. 매 문장 반복 금지.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0072", "speaker": "나레이터", "text": "메피스토펠레스가 정령들에게 시작하라고 명령했다. 곧 어두운 천장이 사라지고 푸른 하늘이 보이는 듯한 노래가 들렸다. 파우스트는 마법으로 보여 주는 풍경을 지켜보았다. 아직은 자신이 보고 싶을 때 그만둘 수 있으리라 여겼다.", "scene_id": "c06-dense-037", "filename": "FAUST_C06_V04_0072_c06-dense-037_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0073", "speaker": "파우스트", "text": "방 안에서 이런 것을 보여 줄 수 있단 말인가? 어디까지 할 수 있는지 보자.", "scene_id": "c06-dense-037", "filename": "FAUST_C06_V04_0073_c06-dense-037_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0074", "speaker": "나레이터", "text": "별과 부드러운 햇빛, 바람에 나부끼는 옷자락이 떠올랐다. 노래는 서로 사랑하는 이들이 함께 있는 정자로 이어졌다. 실제로 서재 밖을 나간 것은 아니었지만 파우스트는 그 아름다운 풍경에 빠져들었다. 악마를 붙잡아 두려던 일은 점점 잊혔다.", "scene_id": "c06-dense-038", "filename": "FAUST_C06_V04_0074_c06-dense-038_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0075", "speaker": "파우스트", "text": "조금 전까지 어둡고 답답하던 방이 이렇게 달라 보이다니.", "scene_id": "c06-dense-038", "filename": "FAUST_C06_V04_0075_c06-dense-038_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0076", "speaker": "나레이터", "text": "풍경은 포도 덩굴과 흐르는 포도주, 푸른 언덕과 호수로 바뀌었다. 새들은 밝은 섬을 향해 날고 사람들은 들판에서 노래하고 춤추었다. 정령들의 노래가 이어질수록 파우스트는 더 편안해졌다. 머릿속에서 따지던 질문도 잠시 멈췄다.", "scene_id": "c06-dense-039", "filename": "FAUST_C06_V04_0076_c06-dense-039_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0077", "speaker": "파우스트", "text": "계속 보고 싶어. 지금은 다른 생각을 하지 않아도 될 것 같아.", "scene_id": "c06-dense-039", "filename": "FAUST_C06_V04_0077_c06-dense-039_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0078", "speaker": "나레이터", "text": "누군가는 높은 곳을 오르고 누군가는 물을 건너는 풍경이 노래 속에서 이어졌다. 그 사이 파우스트가 잠들었다. 메피스토펠레스는 정령들에게 잘했다고 말했다. 아름다운 구경을 시켜 주겠다는 제안은 처음부터 파우스트를 재우려는 수작이었다.", "scene_id": "c06-dense-040", "filename": "FAUST_C06_V04_0078_c06-dense-040_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0079", "speaker": "메피스토펠레스", "text": "이제 조용해졌군. 나를 붙잡아 두겠다더니 먼저 잠들어 버렸잖아.", "scene_id": "c06-dense-040", "filename": "FAUST_C06_V04_0079_c06-dense-040_MEP.wav", "voice": "Fenrir", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "한 번의 낮고 짧은 숨 섞인 웃음. 정중한 말투 아래 장난기. 매 문장 반복 금지.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0080", "speaker": "나레이터", "text": "그는 정령들에게 파우스트가 계속 좋은 꿈을 꾸도록 하라고 지시했다. 하지만 파우스트가 잠들었다고 문턱의 마법까지 풀린 것은 아니었다. 메피스토펠레스에게는 표시를 망가뜨릴 도움이 필요했다. 그때 가까이에서 쥐가 바스락거리는 소리가 들렸다.", "scene_id": "c06-dense-041", "filename": "FAUST_C06_V04_0080_c06-dense-041_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0081", "speaker": "메피스토펠레스", "text": "사람을 깨울 필요는 없어. 저 조그만 쥐 한 마리면 충분하지.", "scene_id": "c06-dense-041", "filename": "FAUST_C06_V04_0081_c06-dense-041_MEP.wav", "voice": "Fenrir", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "한 번의 낮고 짧은 숨 섞인 웃음. 정중한 말투 아래 장난기. 매 문장 반복 금지.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0082", "speaker": "나레이터", "text": "메피스토펠레스는 쥐를 불러 문턱을 갉으라고 명령했다. 쥐는 기름이 묻은 자리에 다가가 앞니로 나무를 갉기 시작했다. 그곳은 악마를 붙들던 별의 꼭짓점이었다. 파우스트는 여전히 잠들어 있었다.", "scene_id": "c06-dense-042", "filename": "FAUST_C06_V04_0082_c06-dense-042_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0083", "speaker": "메피스토펠레스", "text": "그 부분만 없어지면 돼. 조금만 더 갉아라.", "scene_id": "c06-dense-042", "filename": "FAUST_C06_V04_0083_c06-dense-042_MEP.wav", "voice": "Fenrir", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "한 번의 낮고 짧은 숨 섞인 웃음. 정중한 말투 아래 장난기. 매 문장 반복 금지.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}, {"id": "C06_0084", "speaker": "나레이터", "text": "표시가 끊기자 메피스토펠레스는 다시 만나자고 말하고 떠났다. 잠에서 깬 파우스트는 방 안을 둘러보았다. 악마도 푸들도 보이지 않았다. 무엇을 직접 겪었고 무엇을 꿈꾸었는지 자신할 수 없어, 또 속은 것이냐고 혼잣말했다.", "scene_id": "c06-dense-043", "filename": "FAUST_C06_V04_0084_c06-dense-043_NAR.wav", "voice": "Charon", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.4, "pace": "medium", "delivery": "warm_storytelling", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "편안한 거리의 깨끗한 나레이션. 안정된 보통 음량으로 친절하게 설명하며 속삭이지 않는다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "dry"}}, {"id": "C06_0085", "speaker": "파우스트", "text": "분명 여기서 나와 이야기했는데. 전부 꿈이었나? 그 개는 또 어디로 간 거지?", "scene_id": "c06-dense-043", "filename": "FAUST_C06_V04_0085_c06-dense-043_FAU.wav", "voice": "Orus", "performance": {"emotion": "차분한 호기심과 사려 깊음", "intensity": 0.65, "pace": "medium", "delivery": "quiet_intimate_natural_voiced_speech", "pause_after_ms": 420, "acting_notes": "중학생에게 이야기하듯 또렷하게. 의미 전환 앞에서 짧게 멈추고 핵심 단어를 살린다. 처음-중간-끝의 감정을 점차 바꾸되 고함은 피한다. 독백은 가까운 낮은 소리, 나레이션은 넓고 안정적인 호흡.", "nonverbal": "문장 앞 얕은 들숨, 끝에서 짧은 날숨. 말뜻을 덮지 않는다.", "cough_rule": "원문에 기침 사건이 없으면 기침을 넣지 않는다. 호흡·웃음·울음은 문맥에 맞을 때만 사용하며 지시문 자체는 발음하지 않는다.", "mic_direction": "가까운 사람에게 속마음을 털어놓듯 나직하고 차분하게 이야기한다. 성대를 자연스럽게 울리는 보통 말소리를 유지하고 음량만 조금 낮춘다. 속삭임으로 바꾸거나 숨만 섞인 소리를 내지 않는다. 같은 인물의 음색과 또렷한 자음, 안정적인 발성을 유지한다. 과도하게 마이크에 붙거나 귓가 ASMR처럼 숨소리·입소리를 강조하지 않는다. 감정에 맞는 웃음·울먹임은 절제하고 고함·무대 발성·전화 음질은 피한다. 낮은 음량 때문에 말끝이 사라지지 않도록 한다. 음성은 잔향 없이 깨끗하게 녹음한다. 독백의 짧은 에코는 생성 뒤 별도 후처리한다.", "audio_effect": "echo-v4"}}]}]};
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
                const name='FAUST_C06_V04_RETRY.json';
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
                link.href=mergedMp3Url;link.download='FAUST_C06_V04_FULL.mp3';link.classList.remove('hidden');
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
    