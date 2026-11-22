import json
from pathlib import Path
from bs4 import BeautifulSoup
r=Path(__file__).parent;c=json.loads((r/'voice-cast.json').read_text(encoding='utf-8'));p=r/'voice-cast.html';s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser')
for cid,v in c['profiles'].items():
 a=s.find(id=cid)
 if a and a.find('code'):
  a.find('code').parent.clear();line=a.find('p');code=s.new_tag('code');code.string=cid;line.append(code);line.append(' · '+v['voice_name']+' · '+v['mode']+(' · 사용자 선택 반영' if v.get('audition_status')=='user_selected' else ''))
s.find('h1').find_next('p').string='Gemini 2.5 Flash Preview TTS · 39개 오디션 배역의 사용자 선택 반영. 나머지 배역은 기존 임시 배정 상태입니다.'
p.write_text(str(s),encoding='utf-8')
p=r/'audition/app.js';text=p.read_text(encoding='utf-8');text=text.replace("const v=votes[r.id]||{};","const v=votes[r.id]||{};if(r.selected_voice){card.append(el('p','반영된 성우: '+r.selected_voice));}")
p.write_text(text,encoding='utf-8')
print('Public cast reference and audition selection labels refreshed')
