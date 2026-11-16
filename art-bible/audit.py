from pathlib import Path
import re,json
root=Path('faust-reader');t=(root/'faust.txt').read_text(encoding='utf-8-sig');t=t.split('*** START OF THE PROJECT')[1].split('*** END OF THE PROJECT')[0]
names=sorted(set(x.strip().rstrip('.') for x in t.splitlines() if re.fullmatch(r'[A-ZÄÖÜ][A-ZÄÖÜẞ -]{1,65}\.',x.strip())))
(root/'art-bible/speaker-audit.json').write_text(json.dumps(names,ensure_ascii=False,indent=2),encoding='utf-8')
print(len(names))
