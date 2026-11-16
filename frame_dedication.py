from pathlib import Path
import re,json,html
root=Path(__file__).parent
intro='''<section class="adaptation-intro" lang="ko"><p class="voice-label">[나레이션: 전지적 서술자]</p><p>파우스트의 이야기가 시작되기 전, 먼저 그 이야기를 다시 쓰려는 한 사람을 만나야 했다. 그는 오랫동안 마음에 품어 온 인물들을 글로 불러내려는 시인이었다.</p><p>책의 첫머리에 놓인 「헌시」는 파우스트가 겪는 사건이 아니다. 이야기를 만들어 온 사람이 지난 시간을 돌아보며, 소중했던 이들에게 마음을 건네는 시다. 이 재서술에서는 그 목소리를 따라가기 쉽도록, 헌시의 화자를 이름 없는 시인으로 그렸다. 시인은 파우스트와 다른 인물이며, 뒤이어 나오는 극장 서막의 ‘시인’과도 같은 사람이라고 정하지 않는다.</p><p>그날, 그는 다시 이야기를 시작하려 했다. 그러나 마음속 인물들을 불러내자, 그 이야기를 처음 들어 주었던 사람들까지 함께 떠올랐다. 오래된 작품으로 돌아가는 일은, 그 작품과 함께 살았던 자신의 시간으로 돌아가는 일이기도 했다.</p><aside class="inner-voice"><p class="voice-label">[독백: 시인]</p><p>‘이 이야기를 다시 시작할 수 있을까. 처음 내 말을 들어 주었던 사람들은 이제 곁에 없는데.’</p></aside><p>그 질문을 품은 채 그가 고개를 들었을 때, 안개 너머로 낯익은 형상들이 어른거렸다.</p></section>'''
for directory in [root,root/'dist']:
 f=directory/'chapter-01.html';s=f.read_text(encoding='utf-8');de=re.findall(r'<pre lang="de">(.*?)</pre>',s,re.S);ko=re.findall(r'<div class="ko-translation" lang="ko">(.*?)</div>',s,re.S)
 # Intro is before the first illustration, source remains untouched.
 pos=s.index('<figure');s=s[:pos]+intro+s[pos:];s=s.replace('처음에는 안개가 움직이는 줄 알았다.','시인은 처음에 안개가 움직이는 줄 알았다.',1)
 s=s.replace('</style>','.adaptation-intro{font:var(--size,20px)/1.95 system-ui,sans-serif;word-break:keep-all;padding:15px 0 30px;border-bottom:1px solid #cfc3b4}.adaptation-intro p{margin:0 0 1.2em}</style>')
 assert re.findall(r'<pre lang="de">(.*?)</pre>',s,re.S)==de;assert re.findall(r'<div class="ko-translation" lang="ko">(.*?)</div>',s,re.S)==ko
 f.write_text(s,encoding='utf-8')
p=root/'adaptations/chapter-01.json';d=json.loads(p.read_text(encoding='utf-8'));d['introduction_html']=intro;d['framing']='헌시의 창작자 화자를 이름 없는 시인으로 인물화. 파우스트 및 극장 서막의 시인과 동일인으로 확정하지 않음.';p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8');print('Narrative framing added; German and Korean unchanged')
