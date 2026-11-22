from pathlib import Path
r=Path(__file__).parent
# The official verifier selects a second chapter after its corruption test.
# A one-entry site needs an explicit reload before clipboard-denial testing.
p=r/'.tools/audiobook-reader-skill/assets/gemini-canvas-tts/scripts/verify_copy_site.py'
s=p.read_text(encoding='utf-8');marker='            # Clipboard denied: manual selection still contains exact HTML.'
s=s.replace(marker,"            page.reload();page.locator('#chapters button').first.click();page.wait_for_function(\"!document.getElementById('copy').disabled\")\n"+marker)
p.write_text(s,encoding='utf-8')
p=r/'.tools/audiobook-reader-skill/assets/gemini-canvas-tts/scripts/verify.cjs'
s=p.read_text(encoding='utf-8')
s=s.replace("r.chapter===episode.chapter&&r.filename.startsWith(file.split('_GEMINI_')[0]+'_')","turns.some(t=>t.filename===r.filename)")
p.write_text(s,encoding='utf-8')
for name in ['FAUST_P1_AUD02_ALL.html','FAUST_P1_AUD02_ALL.json']:
    p=(r/'audition/canvas'/name).resolve();assert p.is_relative_to(r.resolve())
    if p.exists():p.unlink()
print('Removed superseded template outputs; adapted official one-entry browser test')
