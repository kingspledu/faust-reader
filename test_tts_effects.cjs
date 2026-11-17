const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={Float32Array,ArrayBuffer,DataView,Math,Number,Error};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('tts-effects.js','utf8')+';this.presets=FAUST_EFFECTS;this.process=faustProcess;this.wav=faustWav;',ctx);
const rate=44100,signal=new Float32Array(rate);signal[0]=.5;
const results=[];
for(const [key,p] of Object.entries(ctx.presets)){
 const out=ctx.process(signal,rate,p);assert(out.every(Number.isFinite));assert(Math.max(...out.slice(0,10000).map(Math.abs))<=.970001);
 if(key==='dry')assert.deepStrictEqual(Array.from(out),Array.from(signal));
 if(p.wet){let energy=0;for(let i=100;i<out.length;i++)energy+=out[i]*out[i];assert(energy>0,'reverb tail missing');assert(out.length>signal.length);}
 const wav=ctx.wav(out,rate),v=new DataView(wav);assert.equal(v.getUint32(40,true),out.length*2);assert.equal(v.getUint32(24,true),rate);
 assert.deepStrictEqual(Array.from(out),Array.from(ctx.process(signal,rate,p)),'non-deterministic effect');
 results.push({preset:key,samples:out.length,tail_seconds:(out.length-signal.length)/rate,wav_bytes:wav.byteLength});
}
const loud=new Float32Array(5000).fill(1);for(const p of Object.values(ctx.presets).filter(p=>p.wet)){const out=ctx.process(loud,rate,p);for(const x of out)assert(Math.abs(x)<=.970001);}
for(let ch=1;ch<=6;ch++){
 const html=fs.readFileSync(`tts-canvas/FAUST_C0${ch}_V04_GEMINI_CANVAS_TTS.html`,'utf8');
 assert(html.includes("turn.speaker!=='나레이터')"));assert(html.includes('innerVoice ? faustProcess(resampledData,44100,FAUST_EFFECTS.echo)'));assert(html.includes("effect:turns[index].speaker!=='나레이터'?'echo-v4':'dry'"));
 const episode=JSON.parse(html.match(/const originalEpisode = (.*?);\s*const originalStory =/s)[1]);
 const saved=JSON.parse(fs.readFileSync(`tts-canvas/FAUST_C0${ch}_V04_SCRIPT.json`));assert.deepStrictEqual(episode,saved);
 for(const scene of episode.scenes)for(const s of scene.segments)assert.equal(s.performance.audio_effect,s.speaker==='나레이터'?'dry':'echo-v4');
}
const lab=fs.readFileSync('tts-canvas/FAUST_MONOLOGUE_FX_LAB_V04.html','utf8');const js=lab.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(js);
fs.writeFileSync('tts-canvas/effects-test-report.json',JSON.stringify({automated_dsp:'passed',presets:results,chapters:[1,2,3,4,5,6],listening_test:'not performed',canvas_download:'not performed'},null,2));console.log('PASS: six presets, tail, dry bypass, clipping, deterministic WAV, six chapter routes, lab syntax');
