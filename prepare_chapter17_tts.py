from pathlib import Path
r=Path(__file__).parent;p=r/'build_tts_canvas.py';s=p.read_text(encoding='utf-8')
s=s.replace('chapters_to_build=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]','chapters_to_build=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]')
insert='''   if ch==17:
    no=int(sid[-3:])
    seg['performance']['emotion']='자연에 대한 감사와 차분한 사색' if no<=2 else '평온 속에 남은 그리움과 의존의 불편함' if no==3 else '방해받은 짜증과 능청스러운 조롱' if no<=7 else '자연에서 얻는 힘을 지키려는 진지함과 저속한 조롱에 대한 불쾌함' if no<=9 else '그레트헨 이야기로 흔들리는 걱정과 유혹자의 여유' if no<=13 else '억누르기 어려운 그리움과 분노' if no<=16 else '보고 싶은 마음과 해칠지 모른다는 두려움의 충돌' if no<=20 else '불안을 가볍게 취급하는 조롱과 재촉'
    seg['performance']['acting_notes']+=' 자연을 느끼는 첫 독백은 감사와 평온으로 시작한다. 영의 새 목소리나 환청을 만들지 않는다. 파우스트는 자연스러운 반말, 메피스토펠레스는 예의를 가장한 해요체로 빈정거린다. 그레트헨의 창가·노래·울음은 메피스토펠레스가 전하는 말이므로 별도 여성 목소리나 노래를 추가하지 않는다. 폭포와 오두막은 비유로 또렷하게 전달한다. 뒤쪽 파우스트의 불안은 점차 강해지되 고함·통곡·과호흡으로 몰지 않는다. 메피스토펠레스는 끝까지 상대의 걱정을 우습게 여긴다. 모든 독백은 낮고 또렷한 보통 발성, 과도한 속삭임과 ASMR 숨소리 금지.'
    seg['performance']['nonverbal']='첫 사색에서는 자연스러운 짧은 들숨, 말다툼에서는 필요한 짧은 멈춤과 억제한 날숨만 사용한다. 메피스토펠레스는 작은 비웃음을 드물게 사용할 수 있다. 그레트헨의 울음·노래·기침이나 배경 환경음은 넣지 않는다.'
'''
assert '   units.append(seg);' in s
s=s.replace('   units.append(seg);',insert+'   units.append(seg);').replace("'문 뒤의 웃음과 짧은 작별'][ch-1]","'문 뒤의 웃음과 짧은 작별','숲의 평온을 흔드는 이름'][ch-1]")
p.write_text(s,encoding='utf-8')
for name in ['test_tts_effects.cjs','test_tts_batch_v04.cjs']:
 p=r/name;s=p.read_text(encoding='utf-8').replace('ch<=16','ch<=17').replace('sixteen chapter routes','seventeen chapter routes').replace('14,15,16]','14,15,16,17]');p.write_text(s,encoding='utf-8')
s=(r/'save_chapter15_grid.py').read_text(encoding='utf-8').replace('chapter15','chapter17').replace('c15-','c17-').replace("e['chapter']==15","e['chapter']==17").replace('==24','==21').replace('else 8;','else 5;');(r/'save_chapter17_grid.py').write_text(s,encoding='utf-8')
print('Chapter17 TTS and two grid tools prepared')
