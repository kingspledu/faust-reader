from pathlib import Path
import re
r=Path('.')
s=(r/'render_chapter14.py').read_text(encoding='utf-8').replace('chapter-14','chapter-15').replace('chapter14','chapter15').replace('Chapter14','Chapter15').replace("e['chapter']==14","e['chapter']==15").replace("e.get('chapter')!=14","e.get('chapter')!=15").replace('==5','==13').replace('==10','==24').replace('/10','/24').replace('all 5 bilingual','all 13 bilingual').replace('Chapters 1-14 illustrated','Chapters 1-15 illustrated').replace('Chapters 1-13 complete','Chapters 1-14 complete').replace("['character-010','character-008','location-007']","['character-010','character-008','character-053','character-054','location-011']")
s=re.sub("review_note='[^']*'", "review_note='두 쌍의 대화가 번갈아 등장. 여동생은 대화 속 과거이며 현장에 없음. 꽃잎 점은 후반부, 손잡기 후 그레트헨이 먼저 달려감. 정원 배치는 연출용 가상 설정.'",s)
(r/'render_chapter15.py').write_text(s,encoding='utf-8')
s=(r/'verify_chapter14.py').read_text(encoding='utf-8').replace('chapter-14','chapter-15').replace('chapter14','chapter15').replace('C14','C15').replace("e['chapter']==14","e['chapter']==15").replace('chapter=14','chapter=15').replace('bilingual_units=5','bilingual_units=13').replace('==5','==13').replace('(0,10)','(0,16,24)').replace('==10','==24').replace('n==10','n==24').replace('positions[13]+1:positions[14]','positions[14]+1:positions[15]')
(r/'verify_chapter15.py').write_text(s,encoding='utf-8')
