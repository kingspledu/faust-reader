from pathlib import Path
import re
root=Path(__file__).parent
dsp=(root/'tts-effects.js').read_text(encoding='utf-8')
html='''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>파우스트 · 독백 효과 비교실</title>
<style>body{max-width:900px;margin:auto;padding:28px 18px;background:#171a21;color:#eef0f7;font:17px/1.7 system-ui}h1{font-size:1.8em}section{background:#242935;padding:22px;border-radius:16px;margin:20px 0}button,select,input{font:inherit}button,select{padding:9px 14px;margin:6px;border-radius:8px;border:0}button{cursor:pointer;background:#d4b580;color:#181818}button:disabled{opacity:.5;cursor:wait}label{display:block;margin:10px 0}input[type=range]{width:60%;vertical-align:middle}audio{width:100%}small{color:#bac4d7}a{color:#f3d5a1}.presets{display:flex;flex-wrap:wrap}#status{min-height:2em}output{margin-left:8px}</style>
<h1>독백 효과 비교실</h1><p>같은 목소리에 효과만 바꿔 들어 보세요. 먼저 Canvas에서 만든 <b>독백 원음 WAV</b>를 선택하세요. 이 페이지의 음성 처리는 기기 안에서 이루어집니다.</p>
<section><label>음성 파일 <input id="file" type="file" accept="audio/*"></label><button id="demo">테스트 신호 불러오기</button><small>테스트 신호는 잔향 확인용 소리이며 사람 목소리가 아닙니다. 파일을 선택하면 스테레오는 모노로 합칩니다.</small><p id="source">아직 음성이 없습니다.</p><audio id="original" controls></audio></section>
<section><h2>효과 선택</h2><div class="presets" id="presets"></div>
<label>잔향 비율 <input id="wet" type="range" min="0" max="60" value="20"><output id="wetValue"></output></label>
<label>잔향 길이 <input id="decay" type="range" min="0.1" max="3" step="0.05" value="0.65"><output id="decayValue"></output></label>
<label>첫 잔향까지 <input id="pre" type="range" min="0" max="100" value="25"><output id="preValue"></output></label>
<label><input id="compress" type="checkbox"> 작은 소리와 큰 소리의 차이 줄이기</label>
<button id="render">현재 설정 적용</button><button id="compare">같은 위치에서 원음 ↔ 효과음</button><p id="status" role="status"></p><audio id="processed" controls></audio><p><a id="save" hidden>효과 적용 WAV 저장</a> · <a id="settings" hidden>설정 JSON 저장</a></p>
<small>각 프리셋을 누르면 바로 처리합니다. 연속 클릭 시 마지막 선택만 반영합니다. 원음과 효과음을 동시에 재생하지 않으며 비교 버튼은 현재 재생 위치를 이어받습니다. 잔향 꼬리가 끝날 때까지 들어 보세요.</small></section>
<section><h2>연기까지 비교하려면</h2><p>후처리는 기존 목소리를 실제 속삭임으로 바꾸지는 못합니다. 같은 문장을 아래 지시로 각각 생성한 뒤 파일을 바꿔 비교하세요.</p>
<ul><li>기본: 평소보다 낮고 조용하게, 속으로 생각을 정리하듯 또렷하게.</li><li>친밀: 마이크 가까이에서 한 사람의 귓가에 털어놓듯. 부드러운 숨결, 선명한 자음, 작은 목소리.</li><li>갈등: 말 시작을 잠깐 망설이고, 짧게 숨을 삼킨 뒤 감정을 억누르며. 고함 없이 문장 끝을 낮춘다.</li><li>회상: 생각 사이를 천천히 띄우고, 그리움이 번지듯 부드럽게. 과한 울음 없이 절제한다.</li></ul>
<p>추천 시작점은 <b>가까운 속삭임 원음 + 불안한 독백 · 짧은 에코</b>입니다. 말이 흐려지면 잔향 비율과 길이를 줄이세요. 다운로드 파일명에는 효과명과 설정 식별자가 포함됩니다.</p></section>
<script>__DSP__
const $=id=>document.getElementById(id);let samples=null,rate=44100,base='FAUST_MONOLOGUE_TEST',preset='echo',config={...FAUST_EFFECTS.echo},generation=0,active=$('original'),urls={};
function urlFor(key,blob){if(urls[key])URL.revokeObjectURL(urls[key]);return urls[key]=URL.createObjectURL(blob);}
function sync(){for(const id of ['wet','decay','pre'])$(id).value=id==='wet'?config.wet*100:config[id];$('compress').checked=config.compress;labels();}
function labels(){$('wetValue').textContent=$('wet').value+'%';$('decayValue').textContent=$('decay').value+'秒';$('preValue').textContent=$('pre').value+'ms';}
function pause(){for(const id of ['original','processed'])$(id).pause();}
function load(data,sr,name){pause();samples=data;rate=sr;base=name.replace(/\\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,100)||'FAUST_MONOLOGUE';$('original').src=urlFor('original',new Blob([faustWav(data,sr)],{type:'audio/wav'}));$('source').textContent=`${name} · ${(data.length/sr).toFixed(2)}초 · ${sr}Hz`;active=$('original');render();}
async function render(){if(!samples){$('status').textContent='먼저 음성 파일이나 테스트 신호를 선택하세요.';return;}const ticket=++generation;pause();$('status').textContent='효과 처리 중…';await new Promise(r=>setTimeout(r,20));if(ticket!==generation)return;
try{config={...config,wet:+$('wet').value/100,decay:+$('decay').value,pre:+$('pre').value,compress:$('compress').checked};const result=faustProcess(samples,rate,config),settings={version:'V04',preset,settings:config,source:base,sampleRate:rate};const token=[preset,Math.round(config.wet*100),Math.round(config.decay*1000),config.pre,config.compress?'comp':'plain',config.hp,config.lp,config.delay].join('-');$('processed').src=urlFor('processed',new Blob([faustWav(result,rate)],{type:'audio/wav'}));$('save').href=urls.processed;$('save').download=`${base}_FX_V04_${token}.wav`;$('save').hidden=false;$('settings').href=urlFor('settings',new Blob([JSON.stringify(settings,null,2)],{type:'application/json'}));$('settings').download=`${base}_FX_V04_${token}.json`;$('settings').hidden=false;active=$('processed');$('status').textContent=`${config.label} 적용 완료 · ${(result.length/rate).toFixed(2)}초 (잔향 포함)`;}catch(e){$('status').textContent=e.message;}}
for(const [key,p] of Object.entries(FAUST_EFFECTS)){const b=document.createElement('button');b.textContent=p.label;b.onclick=()=>{preset=key;config={...p};sync();render();};$('presets').append(b);}
for(const id of ['wet','decay','pre'])$(id).oninput=labels;$('render').onclick=render;
$('file').onchange=async()=>{const file=$('file').files[0];if(!file)return;const ticket=++generation;let ctx;try{ctx=new AudioContext();const b=await ctx.decodeAudioData(await file.arrayBuffer());if(ticket!==generation)return;const mono=new Float32Array(b.length);for(let c=0;c<b.numberOfChannels;c++){const d=b.getChannelData(c);for(let i=0;i<mono.length;i++)mono[i]+=d[i]/b.numberOfChannels;}load(mono,b.sampleRate,file.name);}catch(e){$('status').textContent='ไฟล์を開けません: '+e.message;}finally{if(ctx)await ctx.close();}};
$('demo').onclick=()=>{++generation;const a=new Float32Array(rate*2);for(let i=0;i<rate*.15;i++)a[i]=.3*Math.sin(2*Math.PI*220*i/rate)*Math.exp(-i/(rate*.025));load(a,rate,'FAUST_TEST_SIGNAL');};
$('compare').onclick=async()=>{if(!$('processed').src||!samples)return;const next=active===$('original')?$('processed'):$('original'),time=active.currentTime;pause();next.currentTime=Math.min(time,Number.isFinite(next.duration)?Math.max(0,next.duration-.01):time);active=next;try{await next.play();$('status').textContent=next.id==='original'?'원음 재생':'효과음 재생';}catch(e){$('status').textContent='재생 버튼을 직접 눌러 주세요: '+e.message;}};
for(const id of ['original','processed'])$(id).onplay=()=>{const other=id==='original'?'processed':'original';$(other).pause();active=$(id);};
window.addEventListener('beforeunload',()=>Object.values(urls).forEach(URL.revokeObjectURL));sync();
</script></html>'''
html=html.replace('__DSP__',dsp).replace("+'秒'","+'초'").replace('ไฟล์を開けません','음성 파일을 열 수 없습니다')
(root/'tts-canvas/FAUST_MONOLOGUE_FX_LAB_V04.html').write_text(html,encoding='utf-8')
print('Effect lab written')
