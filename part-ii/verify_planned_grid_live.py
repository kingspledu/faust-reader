"""Compare deployed assets with the installed manifest and protected pages."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from urllib.request import urlopen

root=Path(__file__).resolve().parents[1]
manifest_path=Path(sys.argv[1])
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
paths=['part-ii/'+r['image'] for r in manifest['records']]
paths+=['part-ii/'+s+'.html' for s in sorted({r['section'] for r in manifest['records']})]
paths+=['part-ii/illustration-progress.json','art-bible/reference-index.json','art-bible/index.html']
index=json.loads((root/'art-bible/reference-index.json').read_text(encoding='utf-8'))
for ident in manifest['references']:
    item=next((e for e in index['entries'] if e['id']==ident),None)
    if item: paths.append('art-bible/'+item['image'])
for path in dict.fromkeys(paths):
    with urlopen('https://kingspledu.github.io/faust-reader/'+path+'?revision='+revision,timeout=40) as response:
        remote=response.read()
    local=(root/path).read_bytes()
    if path.endswith(('.html','.json')):
        remote=remote.replace(b'\r\n',b'\n');local=local.replace(b'\r\n',b'\n')
    assert hashlib.sha256(remote).digest()==hashlib.sha256(local).digest(),path
print(f'PASS: {len(set(paths))} public files match; text line endings normalized, images exact SHA-256')
