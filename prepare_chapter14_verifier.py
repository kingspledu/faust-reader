from pathlib import Path
r=Path('.')
s=(r/'verify_chapter13.py').read_text(encoding='utf-8').replace('chapter-13','chapter-14').replace('chapter13','chapter14').replace('positions[12]+1:positions[13]','positions[13]+1:positions[14]').replace('==9','==5').replace('(16,31)','(0,10)').replace("e['chapter']==13","e['chapter']==14").replace('==31','==10').replace('n==31','n==10').replace('C13','C14').replace('chapter=13','chapter=14').replace('bilingual_units=9','bilingual_units=5')
(r/'verify_chapter14.py').write_text(s,encoding='utf-8')
p=r/'render_chapter14.py';s=p.read_text(encoding='utf-8').replace('현장은 마르테·그레트헨·귀족복 메피스토펠레스. 남편 사망·보물·다른 여자 이야기는 악마의 주장으로 구분. 파우스트는 아직 등장하지 않음.','현장은 회춘한 파우스트와 귀족복 메피스토펠레스. 거짓 증언을 요구하는 논쟁. 실제 서류 서명·묘지 방문·그레트헨과 만남은 아직 없음.');p.write_text(s,encoding='utf-8')
