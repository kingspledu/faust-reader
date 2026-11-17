from pathlib import Path
r=Path(__file__).parent
s=(r/'save_chapter08_final.py').read_text(encoding='utf-8').replace('chapter08','chapter09').replace('c08-','c09-').replace('dense-004','dense-003').replace("e['chapter']==8","e['chapter']==9").replace('[48:]','[32:]').replace('==12','==14').replace('i<12','i<14').replace('i-11','i-13').replace('12 scenes and 4','14 scenes and 2')
(r/'save_chapter09_final.py').write_text(s,encoding='utf-8')
p=r/'build_tts_canvas.py';s=p.read_text(encoding='utf-8').replace('chapters_to_build=[1,2,3,4,5,6,7,8]','chapters_to_build=[1,2,3,4,5,6,7,8,9]').replace("'술집에서 벌어진 눈속임'][ch-1]","'술집에서 벌어진 눈속임','거울 속 모습과 젊음의 약'][ch-1]")
s=s.replace(' for section in soup.select'," if ch==9:\n  voice_names.update({'수컷 원숭이':'Puck','암컷 원숭이':'Kore','마녀':'Sulafat'})\n  voice_codes.update({'수컷 원숭이':'MONM','암컷 원숭이':'MONF','마녀':'WITCH'})\n for section in soup.select")
s=s.replace("   units.append(seg);allindex.append", "   if ch==9:\n    no=int(sid[-3:])\n    seg['performance']['emotion']='불쾌함과 의심, 악마의 여유' if no<=8 else '장난과 엉뚱한 호기심' if no<=16 else '아름다운 환영에 대한 갈망과 초조함' if no<=21 else '갑작스러운 소란과 분노에서 두려움으로' if no<=28 else '정체를 알아본 안도와 빈정거림' if no<=33 else '위험한 약과 의식에 대한 불안, 모순된 주문에 대한 짜증' if no<=41 else '약을 마신 뒤의 기대와 유혹'\n    seg['performance']['acting_notes']+=' 마녀는 거칠고 성급하다가 정체를 알아보면 조심스러워진다. 원숭이는 장난기 있으나 짐승 울음으로 본문을 대체하지 않는다. 파우스트의 목소리는 회춘에도 같은 인물의 음색을 유지한다. 주문을 새로 추가하거나 노래 가사를 만들어 부르지 않는다. 독백은 격한 장면에도 나직한 보통 말소리로 유지한다.'\n   units.append(seg);allindex.append")
p.write_text(s,encoding='utf-8')
for name in ('test_tts_effects.cjs','test_tts_batch_v04.cjs'):
 p=r/name;s=p.read_text(encoding='utf-8').replace('ch<=8','ch<=9').replace('chapters:[1,2,3,4,5,6,7,8]','chapters:[1,2,3,4,5,6,7,8,9]').replace('eight chapter routes','nine chapter routes');p.write_text(s,encoding='utf-8')
print('Chapter9 final crop/TTS tools prepared; build only after all46 scenes rendered')
