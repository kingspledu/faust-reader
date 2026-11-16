from pathlib import Path
import json,re
root=Path(__file__).parent
exec((root/'build.py').read_text(encoding='utf-8-sig').split("page='''")[0])
anchors=['Direktor. Theatherdichter. Lustige Person:','Ihr beiden, die ihr mir so oft,','Ich wünschte sehr der Menge zu behagen,','O sprich mir nicht von jener bunten Menge,','Was glänzt, ist für den Augenblick geboren,','Wenn ich nur nichts von Nachwelt hören sollte.','Besonders aber laßt genug geschehn!','Ihr fühlet nicht, wie schlecht ein solches Handwerk sei!','Ein solcher Vorwurf läßt mich ungekränkt.','Wodurch bewegt er alle Herzen?','So braucht sie denn, die schönen Kräfte','So gib mir auch die Zeiten wieder,','Der Jugend, guter Freund, bedarfst du allenfalls,','Der Worte sind genug gewechselt,','Euch ist bekannt, was wir bedürfen,','So schreitet in dem engen Bretterhaus']
names=['극장 전경','공연에 대한 질문','관객과 흥행','군중을 거부하는 시인','지속되는 예술','현재의 관객','풍부한 사건을 요구','예술가의 항의','실무자의 반박','상상력과 시의 힘','사랑과 삶의 연극','젊음에 대한 회상','성숙한 창작의 힘','말에서 행동으로','공연 준비의 촉구','무대 위의 세계']
t=chapters[1]['text'];scenes=[]
for i,(a,n) in enumerate(zip(anchors,names)):
 assert a in t,a
 scenes.append({'id':f'c02-s{i+1:03}','chapter':2,'title':n,'anchor':a,'char_offset':t.index(a),'batch':'batch-001','tile_row':i//4,'tile_column':i%4,'image':f'illustrations/c02-s{i+1:03}.webp'})
assert [x['char_offset'] for x in scenes]==sorted(x['char_offset'] for x in scenes)
(root/'scene-manifest.json').write_text(json.dumps({'grid':[4,4],'reading_order':'row-major','scope':'First batch: chapter 2 prologue. Other chapters pending detailed storyboarding. Dedication is lyric, not a literal narrative scene.','scenes':scenes},ensure_ascii=False,indent=2),encoding='utf-8')
print('Validated 16 source anchors in chronological order')
