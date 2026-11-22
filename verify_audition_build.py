from pathlib import Path
import hashlib,json,re,subprocess,tempfile
r=Path(__file__).parent;c=json.loads((r/'audition/catalog.json').read_text(encoding='utf-8'))
rows=json.loads((r/'audition/AUDITION_INDEX.json').read_text(encoding='utf-8'))['segments']
assert len(c['roles'])==39 and len(rows)==202
assert len({x['filename'] for x in rows})==202
for x in rows:assert hashlib.sha256(x['text'].encode()).hexdigest()==x['text_sha256']
with tempfile.TemporaryDirectory() as t:
    for role in c['roles']:
        path=r/'audition'/role['generator'];s=path.read_text(encoding='utf-8')
        assert 'const apiKey = ""' in s
        assert "pause_after_ms,false)" in s
        assert '__EPISODE_JSON__' not in s
        scripts=re.findall(r'<script[^>]*>(.*?)</script>',s,re.S)
        for i,js in enumerate(scripts):
            if not js.strip():continue
            p=Path(t)/f'{role["id"]}-{i}.js';p.write_text(js,encoding='utf-8')
            subprocess.run(['node','--check',str(p)],check=True,capture_output=True)
print('PASS:39 Canvas HTML JS syntax;202 unique names/text hashes;empty key;dry generation')
