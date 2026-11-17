from pathlib import Path
r=Path(__file__).parent
p=r/'build_tts_canvas.py';s=p.read_text(encoding='utf-8');s=s.replace('chapters_to_build=[1,2,3,4,5,6,7,8,9,10,11,12,13,14]','chapters_to_build=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]')
insert='''   if ch==15:
    no=int(sid[-3:])
    seg['performance']['emotion']='조심스러운 설렘과 부끄러움' if no<=2 else '상대 마음을 떠보는 호기심과 능청스러운 회피' if no<=4 else '자신 없는 마음과 다정한 관심' if no<=7 else '어린 동생을 그리는 애틋함과 돌봄의 고단함' if no<=10 else '직접 묻는 답답함과 예의를 가장한 회피' if no<=13 else '첫 만남을 돌아보는 미안함과 수줍은 고백' if no<=16 else '꽃잎 결과를 기다리는 긴장과 기쁨' if no<=19 else '벅찬 고백과 떨림' if no<=21 else '저무는 정원의 아쉬움과 소문을 의식하는 조심스러움'
    seg['performance']['acting_notes']+=' 두 쌍의 대화가 번갈아 나온다. 나레이션 속 직접 대사는 해당 인물의 감정만 가볍게 살리고 화자를 혼동시키는 과도한 흉내는 피한다. 그레트헨은 자연스러운 해요체, 파우스트는 다정한 반말, 마르테는 궁금한 것을 직접 묻는 말투, 메피스토펠레스는 능청스러운 해요체다. 여동생 이야기는 이미 지난 돌봄과 사별을 떠올리는 말이며 아기 목소리나 새 화자를 넣지 않는다. 꽃잎 점은 가볍게 시작해 마지막에 기쁨을 드러낸다. 독백은 낮고 또렷한 보통 말소리, 과한 속삭임이나 숨소리 금지. 영원하다는 말은 벅차지만 고함은 피한다.'
    seg['performance']['nonverbal']='필요할 때만 짧은 들숨이나 작은 미소. 동생 이야기는 잠깐 머뭇거리되 흐느낌·통곡은 넣지 않는다. 꽃잎 결과에서는 작게 웃을 수 있으나 본문 단어를 덮지 않는다.'
'''
assert '   units.append(seg);' in s
s=s.replace('   units.append(seg);',insert+'   units.append(seg);').replace("'확인하지 않은 증언'][ch-1]","'확인하지 않은 증언','꽃잎에 묻는 마음'][ch-1]")
p.write_text(s,encoding='utf-8')
for name in ['test_tts_effects.cjs','test_tts_batch_v04.cjs']:
 p=r/name;s=p.read_text(encoding='utf-8').replace('ch<=14','ch<=15').replace('fourteen chapter routes','fifteen chapter routes').replace('12,13,14]','12,13,14,15]');p.write_text(s,encoding='utf-8')
print('Chapter15 TTS builder and verification routes prepared')
