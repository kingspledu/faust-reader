from pathlib import Path
r=Path('.')
s=(r/'render_chapter12.py').read_text(encoding='utf-8').replace('chapter-12','chapter-13').replace('chapter12','chapter13').replace("e['chapter']==12","e['chapter']==13").replace("e.get('chapter')!=12","e.get('chapter')!=13").replace('==5','==9').replace('==9 else','==31 else').replace('if n==9','if n==31').replace('/9','/31').replace('Chapters 1-12','Chapters 1-13').replace('Chapters 1-11 complete; chapter13','Chapters 1-12 complete; chapter13').replace('Chapter12','Chapter13').replace('5 bilingual','9 bilingual').replace("['character-010','character-008','location-009']","['character-008','character-053','character-054','location-010']")
(r/'render_chapter13.py').write_text(s,encoding='utf-8')
s=(r/'save_chapter09_grid.py').read_text(encoding='utf-8').replace('chapter09','chapter13').replace("e['chapter']==9","e['chapter']==13").replace('Chapter 9:','Chapter 13:').replace('1<=batch<=2','batch==1')
(r/'save_chapter13_grid.py').write_text(s,encoding='utf-8')
