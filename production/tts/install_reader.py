"""Idempotent Faust adapter; keeps original source folds and text intact."""
import hashlib,json,re
from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parents[2]

def install(path):
 html=path.read_text(encoding='utf-8');before=BeautifulSoup(html,'html.parser')
 protected=[str(x) for x in before.select('.source-fold')]
 texts=[p.get_text() for p in before.select('.adaptation-prose p,.adaptation-intro p')]
 images=[i.get('src') for i in before.select('article img')]
 if path.name in ('chapter-01.html','chapter-02.html') and path.parent==root:
  doc=json.loads((root/f'production/tts/{path.stem}-sentences.json').read_text(encoding='utf-8'))
  paras=[p for p in before.select('.adaptation-prose p,.adaptation-intro p') if 'voice-label' not in p.get('class',[])]
  if len(paras)!=len(doc['paragraphs']):raise ValueError('Paragraph count changed')
  for p,expected in zip(paras,doc['paragraphs']):
   if p.get_text(' ',strip=True)!=expected['text']:raise ValueError('Published text changed: '+expected['paragraph_id'])
   if p.get('id')==expected['paragraph_id']:
    seq=[s for s in doc['sentences'] if s['paragraph_id']==expected['paragraph_id']]
    assert [(x.get('id'),x.get_text()) for x in p.select('[data-sentence]')]==[(s['sentence_id'],s['source_slice']) for s in seq]
    continue
   if any(getattr(c,'name',None) for c in p.contents):raise ValueError('Inline markup requires explicit mapping')
   original=str(p);p['id']=expected['paragraph_id'];p.clear()
   for s in doc['sentences']:
    if s['paragraph_id']!=expected['paragraph_id']:continue
    span=before.new_tag('span',id=s['sentence_id']);span['class']='reading-sentence';span['data-sentence']=s['sentence_id'];span.string=s['source_slice'];p.append(span)
   html=html.replace(original,str(p),1)
 base='../' if path.parent!=root else ''
 pwa=f'<link rel="manifest" href="{base}manifest.webmanifest"/>'
 if pwa not in html:html+=pwa
 css=f'<link rel="stylesheet" href="{base}assets/audiobook/reader.css"/>'
 if css not in html:html=html.replace('</head>',css+'</head>')
 theme=f'<link rel="stylesheet" href="{base}assets/audiobook/theme.css" data-faust-theme="1"/>'
 if 'data-faust-theme="1"' not in html:
  html=html.replace('</head>',theme+'</head>') if '</head>' in html else html+theme
 html=re.sub(r'<script src="(?:\.\./)?assets/audiobook/player.js"[^>]*></script>\s*','',html)
 html=re.sub(r'<link[^>]*data-faust-reader[^>]*>\s*','',html)
 html=re.sub(r'<script[^>]*data-faust-reader[^>]*></script>\s*','',html)
 html+=f'\n<link rel="stylesheet" href="{base}assets/audiobook/reader.css" data-faust-reader="1">\n<script src="{base}assets/audiobook/reader.js" data-faust-reader="1" defer></script>\n'
 html=re.sub(r'<script[^>]*data-faust-theme-script[^>]*></script>\s*','',html)
 html+=f'<script src="{base}assets/audiobook/theme.js" data-faust-theme-script="1" defer></script>\n'
 html=re.sub(r'<script[^>]*data-faust-extension[^>]*></script>\s*','',html)
 html+=f'<script src="{base}assets/audiobook/reading-position.js" data-faust-extension="1" defer></script>\n'
 html+=f'<script src="{base}assets/audiobook/timeline.js" data-faust-extension="1" defer></script>\n'
 html+=f'<script src="{base}assets/audiobook/vocabulary.js" data-faust-extension="1" defer></script>\n'
 if path.name in ('chapter-01.html','chapter-02.html') and path.parent==root:html+=f'<script src="assets/audiobook/player.js" data-audio-manifest="audio/part-1/{path.stem}/manifest.json" defer></script>\n'
 after=BeautifulSoup(html,'html.parser')
 assert [str(x) for x in after.select('.source-fold')]==protected
 assert [p.get_text() for p in after.select('.adaptation-prose p,.adaptation-intro p')]==texts
 assert [i.get('src') for i in after.select('article img')]==images
 if path.name=='chapter-01.html':assert len(after.select('[data-sentence]'))==60
 path.write_text(html,encoding='utf-8')

def main():
 paths=sorted(root.glob('chapter-*.html'))+sorted((root/'part-ii').glob('act-*.html'))
 for path in paths:install(path)
 print('PASS: text, source folds, images preserved;',len(paths),'reader pages installed')
if __name__=='__main__':main()
