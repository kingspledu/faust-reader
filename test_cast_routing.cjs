const fs=require('fs'),vm=require('vm'),assert=require('assert');
const cast=JSON.parse(fs.readFileSync('voice-cast.json','utf8'));
let dialogue=0,monologue=0,narration=0;
for(let ch=1;ch<=17;ch++){
 const source=fs.readFileSync(`tts-canvas/check-v04-${String(ch).padStart(2,'0')}.js`,'utf8');new vm.Script(source);
 const episode=JSON.parse(source.match(/const originalEpisode = (.*?);\s*const originalStory =/s)[1]);
 const turns=episode.scenes.flatMap(s=>s.segments);
 const voiceFn=source.match(/function currentVoice\(index\) \{[^\n]+\}/)[0];
 const promptFn=source.slice(source.indexOf('function makePrompt(index)'),source.indexOf("        processBtn.addEventListener",source.indexOf('function makePrompt(index)')));
 const ctx={turns,hostVoiceSelect:{value:'WRONG_FALLBACK'}};vm.createContext(ctx);vm.runInContext(voiceFn+'\n'+promptFn,ctx);
 for(let i=0;i<turns.length;i++){
  const t=turns[i],profile=cast.profiles[t.cast_id];assert.equal(ctx.currentVoice(i),profile.voice_name);
  const prompt=ctx.makePrompt(i);assert(prompt.includes(profile.persona));assert(prompt.includes(t.text));assert(prompt.includes(cast.model));assert(prompt.includes(t.cast_sha256));
  const echo=t.kind==='monologue';assert.equal(t.performance.audio_effect,echo?'echo-v4':'dry');
  if(echo)monologue++;else if(t.kind==='dialogue')dialogue++;else narration++;
 }
 assert.throws(()=>ctx.currentVoice(99999),/배역 음성 누락/);
}
assert(dialogue>0&&monologue>0&&narration>0);
console.log(`PASS: ${dialogue} dialogue dry, ${narration} narration dry, ${monologue} inner thoughts echo; locked voices, cast personas and cache inputs; unknown speaker fails`);
