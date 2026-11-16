from pathlib import Path
import json,re,html
root=Path(__file__).parent
names=['헌시','극장 서막','천상의 서곡','밤','성문 밖','서재 Ⅰ','서재 Ⅱ','라이프치히의 아우어바흐 지하 술집','마녀의 부엌','거리 Ⅰ','저녁','산책길','이웃 여인의 집','거리 Ⅱ','정원','정원의 작은 집','숲과 동굴','그레트헨의 방','마르테의 정원','우물가','성벽 안쪽 성모상 감실','밤, 그레트헨 집 앞 거리','대성당','발푸르기스의 밤','발푸르기스의 밤의 꿈','흐린 날, 들판','밤, 탁 트인 들판','감옥']
ko='''그대들이 다시 다가오는구나, 흔들리는 형상들이여,
일찍이 흐릿한 내 눈앞에 나타났던 그대들이여.
이번에는 그대들을 붙잡아 보려 하는가?
내 마음은 아직도 그 옛 환상으로 기우는가?
그대들이 밀려오는구나! 좋다, 마음껏 나를 지배하라,
연무와 안개 속에서 내 주위로 떠오르는 대로.
그대들의 행렬을 감싸는 마법 같은 숨결에
내 가슴은 젊은 날처럼 떨리는구나.
그대들은 즐거웠던 날들의 모습을 데려오고,
정다운 그림자들도 여럿 떠오르는구나.
오래되어 반쯤 잊힌 전설처럼
첫사랑과 우정도 함께 되살아나는구나.
아픔은 새로워지고, 탄식은 되풀이하네,
미로처럼 헤매던 삶의 길을.
행복에 속아 아름다운 시간을 꿈꾸다가
나보다 먼저 사라진 좋은 이들의 이름을 부르네.
그들은 이어지는 이 노래를 듣지 못하리,
내가 처음 노래를 들려주었던 그 영혼들은.
다정하게 모였던 무리는 흩어졌고,
아아, 첫 메아리도 사라졌구나.
내 노래는 낯선 군중에게 울려 퍼지고,
그들의 박수마저 내 마음을 불안하게 하네.
한때 내 노래를 기뻐했던 이들은,
아직 살아 있다면, 세상 곳곳에 흩어져 헤매리.
그리고 오래 잊었던 그리움이 나를 사로잡네,
저 고요하고 엄숙한 영혼의 세계를 향한 그리움이.
내 나직한 노래는 아직 정해지지 않은 음조로,
바람에 울리는 하프처럼 떠도네.
전율이 나를 붙들고, 눈물 뒤에 눈물이 흐르며,
굳었던 마음은 온화하고 부드러워지네.
내가 지닌 것은 아득히 멀리 있는 듯 보이고,
사라진 것은 내게 현실이 되어 돌아오네.'''.splitlines()
(root/'translations').mkdir(exist_ok=True)
(root/'translations/chapter-01.ko.json').write_text(json.dumps({'chapter':1,'language':'ko','status':'draft_translation','translator_note':'독일어 원문을 바탕으로 새로 작성한 한국어 번역 초안. 기존 출판 번역을 전재하지 않음.','lines':ko},ensure_ascii=False,indent=2),encoding='utf-8')
for directory in [root,root/'dist']:
 for f in [directory/'index.html',*directory.glob('chapter-*.html')]:
  s=f.read_text(encoding='utf-8')
  for i,n in enumerate(names):
   s=re.sub(r'(href="chapter-'+f'{i+1:02}'+r'\.html">\d+ · [^<]+)(</a>)',lambda m:m[1]+' / '+n+m[2] if ' / '+n not in m[1] else m[0],s)
  match=re.match(r'chapter-(\d+)\.html',f.name)
  if match:
   c=int(match[1]);s=re.sub(r'(<h1 lang="de">)(.*?)(</h1>)',lambda m:m[1]+m[2]+'<small lang="ko" style="display:block;font:24px/1.7 system-ui">'+names[c-1]+'</small>'+m[3] if '<small' not in m[2] else m[0],s,count=1)
   if c==1:
    cursor=[0]
    def bilingual(m):
     raw=m[1];nonempty=[x for x in html.unescape(raw).splitlines() if x.strip()]
     if not nonempty:return m[0]
     k=ko[cursor[0]:cursor[0]+len(nonempty)];cursor[0]+=len(nonempty)
     return m[0]+'<div class="ko-translation" lang="ko">'+html.escape('\n'.join(k))+'</div>'
    if 'class="ko-translation"' not in s:s=re.sub(r'<pre lang="de">(.*?)</pre>',bilingual,s,flags=re.S);assert cursor[0]==32
   note='<p class="translation-note">'+('한국어는 원문을 바탕으로 새로 작성한 번역 초안입니다. / Korean translation draft.' if c==1 else '이 장의 한국어 본문 번역은 준비 중입니다. 현재는 제목·목차만 병기되어 있습니다. / Korean body translation pending.')+'</p>'
   if 'class="translation-note"' not in s:s=s.replace('</h1>','</h1>'+note,1)
  css='.ko-translation{white-space:pre-wrap;font:var(--size,20px)/1.95 system-ui,sans-serif;color:#62564a;margin:12px 0 32px;padding:16px 20px;border-left:2px solid #b3987c;background:#eee7db}.translation-note{font:13px/1.7 system-ui;color:#786b5e}'
  if '.ko-translation{' not in s:s=s.replace('</style>',css+'</style>')
  f.write_text(s,encoding='utf-8')
print('28 bilingual titles and menus; dedication 32 lines translated; remaining chapters explicitly pending')
