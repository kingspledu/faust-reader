from pathlib import Path
import json
root=Path(__file__).parent;exec((root/'build.py').read_text(encoding='utf-8-sig').split("page='''")[0]);t=chapters[0]['text'];lines=[x for x in t.splitlines() if x.strip()]
names=['안개 속 흔들리는 형상','붙잡으려는 손','다가오는 기억','젊은 마음을 흔드는 숨결','행복했던 날들','첫사랑과 우정의 그림자','미로 같은 삶의 길','떠나간 이들의 빈자리','사라진 첫 청중','희미해진 메아리','낯선 군중 앞의 노래','세상에 흩어진 벗들','고요한 영혼의 세계를 향한 그리움','바람에 울리는 하프','눈물과 부드러워진 마음','잃어버린 것이 현실이 되다']
m=json.loads((root/'scene-manifest.json').read_text(encoding='utf-8'));m['scenes']=[e for e in m['scenes'] if e['chapter']!=1]
for i,title in enumerate(names):
 anchor=lines[i*2];m['scenes'].append({'id':f'c01-s{i+1:03}','chapter':1,'title':title,'anchor':anchor,'char_offset':t.index(anchor),'batch':'batch-003','tile_row':i//4,'tile_column':i%4,'image':f'illustrations/c01-s{i+1:03}.webp','status':'planned','interpretation':'헌시의 상징적 시각화. 본편 등장인물의 실제 사건 아님.','density_note':'32행의 짧은 헌시를 2행씩 16컷으로 구성한 예외'})
m['scope']='Chapters 1–3 illustrated/storyboarded; other chapters pending.';m['scenes'].sort(key=lambda e:(e['chapter'],e['char_offset']));(root/'scene-manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8');print('Dedication: 16 two-line source anchors checked')
