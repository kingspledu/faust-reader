from pathlib import Path
r=Path(__file__).parent
s=(r/'apply_chapter08_translation.py').read_text(encoding='utf-8').replace('chapter-08','chapter-09').replace('==11','==20').replace('Chapter 8: 11','Chapter 9: 20')
(r/'apply_chapter09_translation.py').write_text(s,encoding='utf-8')
s=(r/'render_chapter08.py').read_text(encoding='utf-8').replace('chapter-08','chapter-09').replace('chapter08','chapter09').replace("e['chapter']==8","e['chapter']==9").replace("e.get('chapter')!=8","e.get('chapter')!=9").replace('==11','==20').replace('==60','==46').replace('/60','/46').replace('Chapters 1-8','Chapters 1-9').replace('Chapters 1-7 complete; chapter8','Chapters 1-8 complete; chapter9').replace('Chapter8','Chapter9').replace('11 bilingual','20 bilingual').replace("['character-043','character-044','character-045','character-046','character-010','character-008','location-005']","['character-010','character-008','character-050','character-123','character-052','location-006']").replace('노학자 상태 유지. 쥐·벼룩은 노래 속 이야기. 농담과 추측은 발언자의 판단으로 구분. 실제 생성 구도와 인물 확인 후 삽입.','복약 전 노학자 상태 유지. 부엌 동물은 원숭이. 거울의 여인은 이름 없는 환영. 실제 생성 그림과 원문 의미 대조.')
(r/'render_chapter09.py').write_text(s,encoding='utf-8')
s=(r/'save_chapter08_grid.py').read_text(encoding='utf-8').replace('chapter08','chapter09').replace("e['chapter']==8","e['chapter']==9").replace('Chapter 8:','Chapter 9:').replace('1<=batch<=3','1<=batch<=2')
(r/'save_chapter09_grid.py').write_text(s,encoding='utf-8')
print('Chapter9 translation, render and crop tools prepared')
