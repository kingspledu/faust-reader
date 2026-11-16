from pathlib import Path
import json
root=Path(__file__).parent;exec((root/'build.py').read_text(encoding='utf-8-sig').split("page='''")[0]);t=chapters[3]['text']
a=['In einem hochgewölbten, engen gotischen Zimmer Faust,','Da steh ich nun, ich armer Tor!','Das will mir schier das Herz verbrennen.','Auch hab ich weder Gut noch Geld,','Drum hab ich mich der Magie ergeben,','O sähst du, voller Mondenschein,','Ach! könnt ich doch auf Bergeshöhn','Weh! steck ich in dem Kerker noch?','Und fragst du noch, warum dein Herz','Flieh! auf! hinaus ins weite Land!','Ha! welche Wonne fließt in diesem Blick','Bin ich ein Gott? Mir wird so licht!','Wie alles sich zum Ganzen webt,','Welch Schauspiel! Aber ach! ein Schauspiel nur!','Wie anders wirkt dies Zeichen auf mich ein!','Es wölkt sich über mir—']
n=['닫힌 서재의 노학자','학문의 허무','불타는 회의','세속적 결핍','마술로 향하는 탐구','달빛을 향한 탄식','자유로운 자연을 그리다','감옥 같은 서재','생기를 막는 고통','신비한 책을 펼치다','대우주의 표식 앞에서','자연의 작용을 바라보다','서로 이어진 우주','형상에 그친 깨달음','지령의 표식','달빛이 숨고 불길이 다가오다']
m=json.loads((root/'scene-manifest.json').read_text(encoding='utf-8'))
for i,(anchor,title) in enumerate(zip(a,n)):
 assert anchor in t,anchor
 m['scenes'].append({'id':f'c04-s{i+1:03}','chapter':4,'title':title,'anchor':anchor,'char_offset':t.index(anchor),'batch':'batch-004','tile_row':i//4,'tile_column':i%4,'image':f'illustrations/c04-s{i+1:03}.webp','status':'planned','references':['art-bible/character-faust-old.png','art-bible/location-study.png'],'state':'Faust before rejuvenation. Earth spirit not yet shown.'})
(root/'scene-manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8');print('16 source anchors checked; chapter Nacht opening only')
