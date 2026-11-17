from pathlib import Path
import json,copy
r=Path(__file__).parent;p=r/'dense-scene-plan.json';d=json.loads(p.read_text(encoding='utf-8'))
old=next(e for e in d['scenes'] if e['id']=='c08-dense-055');text=old['source_text'];offset=old['source_start']
anchors=['SIEBEL.\nWas gibt’s?','ALTMAYER.\nEs war ein Schlag','FROSCH.\nWo ist der Kerl?','(Sich nach dem Tische wendend.)','BRANDER.\nAber wie war es mit den Trauben?']
cuts=[0]+[text.index(x) for x in anchors]+[len(text)];new=[]
for j,(start,end) in enumerate(zip(cuts,cuts[1:]),55):
 e=copy.deepcopy(old);e.update(id=f'c08-dense-{j:03}',source_start=offset+start,source_end=offset+end,source_text=text[start:end],sentence_count=[3,4,3,4,4,2][j-55],exception=j==60,review_note='마지막 긴 잔여 구간을 수동 분할. 발화자·무대지시 제외, 감탄 Mein은 후속 질문과 함께 해석. 마지막 2문장은 장 끝 예외.',shot=['wide','medium','close-up','wide','detail','medium'][j-55],batch='chapter08-final',tile_row=(j-49)//4,tile_column=(j-49)%4);new.append(e)
assert ''.join(e['source_text'] for e in new)==text
idx=d['scenes'].index(old);d['scenes'][idx:idx+1]=new
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
p=r/'adaptations/chapter-08.json';a=json.loads(p.read_text(encoding='utf-8'));a['scenes']=a['scenes'][:55]
raw='''
브란더|술꾼들은 화들짝 놀라 서로에게서 떨어졌다. 프로슈가 그게 네 코였느냐고 물었다. 브란더도 지벨의 코를 잡고 있었다며 당황했다. 눈앞에 있던 포도밭은 사라지고 다시 술집 안이었다.|내 손에 잡힌 게 포도가 아니었어. 조금만 더 움직였으면 무슨 일이 났을까?
알트마이어|알트마이어는 온몸이 떨려 서 있기 어렵다며 의자를 찾았다. 프로슈는 대체 무슨 일이 있었던 거냐고 물었다. 조금 전까지 칼을 들고 달려들던 기세는 찾아볼 수 없었다. 아무도 자신 있게 설명하지 못했다.|아직도 다리가 떨려. 우선 앉아서 정신부터 차려야겠어.
프로슈|프로슈는 손님들이 사라진 것을 알아차리고 찾아내면 가만두지 않겠다고 외쳤다. 알트마이어는 그가 술통을 타고 문밖으로 나가는 것을 보았다고 했다. 그러면서 다리가 납처럼 무겁다고 중얼거렸다. 프로슈는 그 말까지 믿어야 할지 알 수 없었다.|분명 여기 있었는데 어디로 간 거야? 술통을 타고 나갔다니, 그게 말이 돼?
알트마이어|알트마이어는 다시 탁자 쪽으로 돌아섰다. 포도주가 아직 나오는지 궁금했던 것이다. 지벨은 전부 거짓과 눈속임이었다고 단정했다. 하지만 프로슈는 분명 포도주를 마신 것 같다고 말했다.|방금 겁을 먹고도 술 생각이 나다니. 그래도 정말 흘러나왔는지 한 번은 보고 싶군.
브란더|브란더는 그렇다면 포도송이는 어떻게 된 거냐고 물었다. 알트마이어는 이런 일을 겪고도 기적을 믿지 않을 수 있겠느냐고 했다. 네 사람은 같은 자리에서 같은 일을 겪고도 서로 다른 말을 했다. 탁자에서 나온 술도, 눈앞에 보였던 포도밭도 어느 것 하나 제대로 설명할 수 없었다.|내 눈으로 봤다고 자신했는데. 대체 어디까지가 진짜였던 거지?
'''
for i,line in enumerate(raw.strip().splitlines(),56):
 speaker,narration,monologue=line.split('|');a['scenes'].append(dict(id=f'c08-dense-{i:03}',speaker=speaker,narration=narration,monologue=monologue))
assert len(a['scenes'])==60
p.write_text(json.dumps(a,ensure_ascii=False,indent=2),encoding='utf-8');print('Chapter8 ending refined to 60 scenes, final residual2 sentences')
