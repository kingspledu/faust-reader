"""Read-only integration audit against audiobook-reader b0227c5."""
import hashlib,json,subprocess
from pathlib import Path
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parents[2];work=Path(__file__).parent
manifest=json.loads((root/'audio/part-1/chapter-01/manifest.json').read_text(encoding='utf-8'))
doc=json.loads((work/'chapter-01-sentences.json').read_text(encoding='utf-8'))
html=(root/'chapter-01.html').read_text(encoding='utf-8');soup=BeautifulSoup(html,'html.parser')
rows=manifest['sentences'];assert len(rows)==len(doc['sentences'])==60
for r,s in zip(rows,doc['sentences']):
 assert r['sentence_id']==s['sentence_id'] and r['text']==s['text'] and r['voice']==s['voice']
 data=(root/'audio/part-1/chapter-01'/r['url']).read_bytes()
 assert len(data)==r['bytes'] and hashlib.sha256(data).hexdigest()==r['sha256']
assert len({r['sentence_id'] for r in rows})==60
paragraphs=[p for p in soup.select('.adaptation-prose p,.adaptation-intro p') if 'voice-label' not in p.get('class',[])]
assert [p.get_text(' ',strip=True) for p in paragraphs]==[p['text'] for p in doc['paragraphs']]
skill_commit=subprocess.check_output(['git','-C',str(root/'.tools/audiobook-reader-skill'),'rev-parse','HEAD'],text=True).strip()
report=dict(skill_commit=skill_commit,sentence_files=60,all_audio_bytes_hashes_match=True,paragraph_text_order_preserved=True,dom_sentence_ids=len(soup.select('[data-sentence]')),dom_paragraph_ids=sum(bool(p.get('id')) for p in paragraphs),paragraphs=len(paragraphs),chapters_loading_player=[p.name for p in root.glob('chapter-*.html') if 'assets/audiobook/player.js' in p.read_text(encoding='utf-8')],landscape_dom_contract={selector:bool(soup.select_one(selector)) for selector in ['article','#floating-reader','#font-size','#font-value','#install-app','section.chapter','.reading-sentence']},listening_verified=False,device_verified=False)
(work/'skill-integration-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(report)
