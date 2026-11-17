from pathlib import Path
r=Path(__file__).parent;p=r/'build_tts_canvas.py';s=p.read_text(encoding='utf-8').replace('chapters_to_build=[1,2,3,4,5,6,7,8,9,10]','chapters_to_build=[1,2,3,4,5,6,7,8,9,10,11]').replace("'거리에서 마주친 소녀'][ch-1]","'거리에서 마주친 소녀','방에 남겨진 보석 상자'][ch-1]")
s=s.replace('   units.append(seg);allindex.append',"   if ch==11:\n    no=int(sid[-3:])\n    seg['performance']['emotion']='첫 만남 뒤의 궁금함' if no==1 else '조용한 방에서 느끼는 감동과 망설임' if no<=6 else '자신의 행동을 돌아보는 부끄러움과 혼란' if no<=10 else '재촉과 유혹, 파우스트의 주저함' if no<=13 else '이유를 모르는 불안에서 노래로 마음을 진정함' if no<=16 else '낯선 상자에 대한 의심과 호기심' if no<=19 else '달라진 모습에 대한 기쁨과 가난에 대한 씁쓸함'\n    seg['performance']['acting_notes']+=' 왕의 노래는 본문에 쓰인 서술만 읽고 별도 가사나 노래를 추가하지 않는다. 파우스트의 상상은 실제 회상처럼 확신에 차서 읽지 않는다. 그레트헨의 호기심은 선정적인 유혹으로 표현하지 않는다. 독백은 나직한 보통 말소리를 유지한다.'\n   units.append(seg);allindex.append")
p.write_text(s,encoding='utf-8')
for name in ('test_tts_effects.cjs','test_tts_batch_v04.cjs'):
 p=r/name;s=p.read_text(encoding='utf-8').replace('ch<=10','ch<=11').replace('chapters:[1,2,3,4,5,6,7,8,9,10]','chapters:[1,2,3,4,5,6,7,8,9,10,11]').replace('ten chapter routes','eleven chapter routes');p.write_text(s,encoding='utf-8')
print('Chapter11 TTS builder prepared')
