from pathlib import Path
r=Path(__file__).parent;p=r/'audition/app.js';s=p.read_text(encoding='utf-8')
s=s.replace("if(!f)throw Error('음성 파일을 먼저 연결해 주세요.');ctx ||= new AudioContext();await ctx.resume();const b=await ctx.decodeAudioData(await f.arrayBuffer());", "if(!f&&!row.audio)throw Error('음성 파일을 먼저 연결해 주세요.');ctx ||= new AudioContext();await ctx.resume();let bytes;if(f){bytes=await f.arrayBuffer()}else{const response=await fetch(row.audio+'?sha='+row.audio_sha256);if(!response.ok)throw Error('음성을 불러오지 못했습니다.');bytes=await response.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if(hash!==row.audio_sha256)throw Error('음성 파일 무결성 검사 실패');}const b=await ctx.decodeAudioData(bytes);")
s=s.replace("b.disabled=!files.has(row.filename)&&!files.has(row.filename.replace(/\\.wav$/,'.mp3'));", "b.disabled=!row.audio&&!files.has(row.filename)&&!files.has(row.filename.replace(/\\.wav$/,'.mp3'));")
s=s.replace('${d.roles.length}배역 · ${d.requests}개 생성 요청 준비 · 실제 음성 생성 전','${d.roles.length}배역 · ${d.audio_count||0}/${d.requests}개 음성 연결 · 듣기 버튼으로 비교하세요')
p.write_text(s,encoding='utf-8')
