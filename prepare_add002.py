from pathlib import Path
p=Path('faust-reader/add_illustrations.py');s=p.read_text(encoding='utf-8-sig');s=s.replace('exec-716efb5d-e94d-45a5-90b3-c355c976f5b0.png','exec-23a140ae-f00e-4fe7-b70c-a8c1ba75d036.png').replace('batch-001.png','batch-002.png').replace("for e in manifest['scenes']:","for e in [x for x in manifest['scenes'] if x['chapter']==3]:").replace("f=directory/'chapter-02.html'","f=directory/'chapter-03.html'")
s=s.replace("original=html.unescape(m[1]);", "original=html.unescape(m[1]);")
Path('faust-reader/add_batch002.py').write_text(s,encoding='utf-8')
