import hashlib,json
from pathlib import Path
from urllib.parse import urlparse,unquote
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parents[2];files={};chapters={}
def add(path):
 key=path.relative_to(root).as_posix();data=path.read_bytes();files[key]=dict(bytes=len(data),sha256=hashlib.sha256(data).hexdigest());return key
for path in sorted(root.glob('chapter-*.html'))+sorted((root/'part-ii').glob('act-*.html')):
 key=path.relative_to(root).as_posix();entries={add(path)}
 soup=BeautifulSoup(path.read_text(encoding='utf-8'),'html.parser')
 for node in soup.select('img[src],script[src],link[rel=stylesheet][href]'):
  ref=node.get('src') or node.get('href');parsed=urlparse(ref)
  if parsed.scheme or ref.startswith('//'):continue
  target=(path.parent/unquote(parsed.path)).resolve()
  if target.is_relative_to(root) and target.is_file():entries.add(add(target))
 if key=='chapter-01.html':
  for target in (root/'audio/part-1/chapter-01').glob('*'):entries.add(add(target))
 entries.add(add(root/'sw.js'));chapters[key]=sorted(entries)
 for shared in ('manifest.webmanifest','index.html','assets/audiobook/icon-192.png','assets/audiobook/icon-512.png'):
  if (root/shared).exists():entries.add(add(root/shared))
 chapters[key]=sorted(entries)
(root/'offline-manifest.json').write_text(json.dumps(dict(schema=1,chapters=chapters,files=files),ensure_ascii=False,indent=2),encoding='utf-8')
print('Offline manifest:',len(chapters),'chapters,',len(files),'unique files')
