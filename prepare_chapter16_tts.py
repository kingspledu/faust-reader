from pathlib import Path
r=Path(__file__).parent;p=r/'build_tts_canvas.py';s=p.read_text(encoding='utf-8')
s=s.replace('chapters_to_build=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]','chapters_to_build=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]')
insert='''   if ch==16:
    no=int(sid[-3:])
    seg['performance']['emotion']='들킬 듯한 장난기와 반가움' if no==1 else '다정한 고백에서 방해받은 짜증으로' if no==2 else '아쉬움과 계속 함께 있고 싶은 마음' if no==3 else '어머니를 의식하는 조심스러움과 작별의 아쉬움' if no<=5 else '기쁨 뒤에 남은 수줍음과 자신 없는 궁금함'
    seg['performance']['acting_notes']+=' 짧은 정원 집 장면이다. 첫 장면은 가벼운 장난과 미소, 입맞춤 뒤 고백은 또렷하고 소박하게 표현한다. 입맞춤 소리나 과한 숨소리는 만들지 않는다. 노크 대목도 환경 효과음 대신 문장으로 읽는다. 파우스트의 누구야는 방해받은 짜증, 메피스토펠레스의 친구죠는 능청스러운 해요체다. 그레트헨의 어머니 언급은 말끝을 멈추며 망설인다. 실제 어머니의 목소리나 꾸중을 추가하지 않는다. 마지막은 자신이 왜 사랑받는지 궁금한 조용한 생각이며 절망이나 울음으로 몰지 않는다. 모든 독백은 나직하되 또렷한 보통 발성으로, 과도한 속삭임 금지.'
    seg['performance']['nonverbal']='장난에서는 작은 미소, 작별에서는 짧은 망설임과 자연스러운 날숨만 필요할 때 사용한다. 키스 소리·신음·헐떡임·기침·울음은 넣지 않는다.'
'''
assert '   units.append(seg);' in s
s=s.replace('   units.append(seg);',insert+'   units.append(seg);').replace("'꽃잎에 묻는 마음'][ch-1]","'꽃잎에 묻는 마음','문 뒤의 웃음과 짧은 작별'][ch-1]")
p.write_text(s,encoding='utf-8')
for name in ['test_tts_effects.cjs','test_tts_batch_v04.cjs']:
 p=r/name;s=p.read_text(encoding='utf-8').replace('ch<=15','ch<=16').replace('fifteen chapter routes','sixteen chapter routes').replace('13,14,15]','13,14,15,16]');p.write_text(s,encoding='utf-8')
print('Chapter16 TTS preparation complete')
