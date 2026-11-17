from pathlib import Path
from bs4 import BeautifulSoup
import json,sys
r=Path(__file__).parent
def render(ch):
 p=r/f'chapter-{ch:02}.html';s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser');d=json.loads((r/f'adaptations/chapter-{ch:02}.json').read_text(encoding='utf-8'))
 before=[str(x) for x in s.select('article pre[lang="de"],article .ko-translation,article figure')]
 for i,prose in enumerate(s.select('article .adaptation-prose')):
  flow=d['scripts'][i] if ch==1 else d['scenes'][i]['script'];prose.clear()
  for x in flow:
   if x['role']=='monologue':
    a=s.new_tag('aside',attrs={'class':'inner-voice','data-role':'monologue','data-speaker':x['speaker'],'data-cast':x['cast_id']});z=s.new_tag('p',attrs={'class':'voice-label'});z.string=f'[독백: {x["speaker"]}]';a.append(z);z=s.new_tag('p');z.string='‘'+x['text']+'’';a.append(z);prose.append(a)
   else:
    z=s.new_tag('p',attrs={'data-role':x['role'],'data-speaker':x['speaker'],'data-cast':x['cast_id']});z.string='“'+x['text']+'”' if x['role']=='dialogue' else x['text'];prose.append(z)
 assert before==[str(x) for x in s.select('article pre[lang="de"],article .ko-translation,article figure')]
 p.write_text(str(s),encoding='utf-8')
 print('Rendered current structured script:',ch)
if __name__=='__main__':
 for ch in map(int,sys.argv[1:]):render(ch)
