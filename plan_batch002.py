from pathlib import Path
import json
root=Path(__file__).parent;exec((root/'build.py').read_text(encoding='utf-8-sig').split("page='''")[0]);t=chapters[2]['text']
a=['Der Herr. Die himmlischen Heerscharen. Nachher Mephistopheles.','Die Sonne tönt, nach alter Weise,','Und schnell und unbegreiflich schnelle','Und Stürme brausen um die Wette','Der Anblick gibt den Engeln Stärke,','Da du, o Herr, dich einmal wieder nahst','Von Sonn’ und Welten weiß ich nichts zu sagen,','Hast du mir weiter nichts zu sagen?','Nein Herr! ich find es dort, wie immer, herzlich schlecht.','Kennst du den Faust?','Fürwahr! er dient Euch auf besondre Weise.','Wenn er mir auch nur verworren dient,','Was wettet Ihr? den sollt Ihr noch verlieren!','Solang er auf der Erde lebt,','(Der Himmel schließt, die Erzengel verteilen sich.)','Von Zeit zu Zeit seh ich den Alten gern,']
n=['천상의 세 대천사','라파엘의 태양 찬가','가브리엘의 세계 찬가','미카엘의 폭풍 찬가','세 대천사의 합창','메피스토펠레스의 등장','인간에 대한 조롱','빛의 응답','인간의 고통을 말하다','파우스트를 아느냐','끝없는 갈망을 논하다','길을 찾으리라는 신뢰','내기의 제안','유혹을 허락하다','천상이 닫히다','홀로 남은 악마']
m=json.loads((root/'scene-manifest.json').read_text(encoding='utf-8'));m['scenes']=[e for e in m['scenes'] if e['chapter']!=3]
refs=['character-raphael.png','character-gabriel.png','character-michael.png','character-mephistopheles.png','location-heaven.png']
for i,(anchor,title) in enumerate(zip(a,n)):
 assert anchor in t,anchor
 m['scenes'].append({'id':f'c03-s{i+1:03}','chapter':3,'title':title,'anchor':anchor,'char_offset':t.index(anchor),'batch':'batch-002','tile_row':i//4,'tile_column':i%4,'image':f'illustrations/c03-s{i+1:03}.webp','references':['art-bible/'+f for f in refs],'status':'planned'})
m['scope']='Chapters 2 and 3 storyboarded in 16-panel batches; remaining chapters pending.'
(root/'scene-manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8');assert len(m['scenes'])==32;print('32 scenes registered; 16 new source anchors checked')
