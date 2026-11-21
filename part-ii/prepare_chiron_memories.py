import json
from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parent
ids=['3795','3800','3804','3808','3812','3820','3824','3828','3834','3840','3844','3854','3862','3868','3872','3876']
descs=[
'케이론이 영웅들은 각자의 장점으로 서로 부족한 곳을 채웠다고 말한다.',
'케이론이 두 형제와 보레아스의 아들들의 장점을 설명하고 파우스트가 귀를 기울인다.',
'케이론이 이아손과 오르페우스를 이야기한다. 회상 인물을 실제로 등장시키지 않는다.',
'케이론이 항해와 협력의 가치를 이야기하며 강을 건넌다. 실제 아르고호를 추가하지 않는다.',
'파우스트가 헤라클레스에 대해 묻자 케이론의 얼굴에 그리움이 어린다.',
'케이론이 헤라클레스에게서 느꼈던 위대함을 진지하게 말한다.',
'케이론이 다시 보기 힘든 인물이었다며 회상을 이어 간다.',
'파우스트가 조각도 그 위대함을 충분히 보여 주지 못한다고 말한다.',
'파우스트가 가장 아름다운 여인에 대해 묻고 케이론이 되묻는다.',
'케이론이 굳은 외모보다 생기와 우아함을 이야기한다.',
'케이론이 헬레네를 태운 적 있다고 밝히자 파우스트가 놀란다.',
'파우스트가 케이론의 갈기 같은 머리카락을 조심스레 잡고 같은 자리에 탔다는 말에 마음이 흔들린다.',
'파우스트가 어디에서 어디로 헬레네를 태웠는지 다급하게 묻는다.',
'케이론이 헬레네의 형제들이 그녀를 구했던 일을 이야기한다. 어린 헬레네나 추격자는 그림에 추가하지 않는다.',
'케이론이 늪과 강을 건넜던 기억을 설명한다. 현재 발굽 아래 물결로 장면을 잇는다.',
'케이론이 그때의 감사 인사를 회상하고 파우스트가 나이를 듣고 놀란다. 어린 헬레네는 그리지 않는다.']
plan=dict(batch_id='chiron-memories',grid=[4,4],source_image='source_images/act-02-07-grid-001.png',references=['character-faust','character-ii-chiron'],generation_reference_images=['art-bible/character-faust.png','art-bible/character-ii-chiron.png'],scenes=[dict(section='act-02-07',scene_id='source-'+i,description=d) for i,d in zip(ids,descs)])
soup=BeautifulSoup((root/'act-02-07.html').read_text(encoding='utf-8'),'html.parser')
assert all(not soup.find(id=s['scene_id']).find('img') for s in plan['scenes'])
(root/'plan-chiron-memories.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS: planned 16 unique unillustrated source sections')
