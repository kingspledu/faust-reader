from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parents[2]
paths=[root/'index.html',root/'voice-cast.html',root/'scene-plan.html']+list((root/'art-bible').glob('*.html'))
for path in paths:
 if not path.exists():continue
 html=path.read_text(encoding='utf-8');base='../' if path.parent!=root else ''
 if 'data-faust-theme="1"' not in html:
  link=f'<link rel="stylesheet" href="{base}assets/audiobook/theme.css" data-faust-theme="1"/>'
  html=html.replace('</head>',link+'</head>') if '</head>' in html else html+link
 if 'data-faust-theme-script' not in html:html+=f'\n<script src="{base}assets/audiobook/theme.js" data-faust-theme-script="1" defer></script>\n'
 path.write_text(html,encoding='utf-8')
print('Themed supplementary pages:',len(paths))
