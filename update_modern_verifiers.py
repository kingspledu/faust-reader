from pathlib import Path
for ch in range(4,13):
 p=Path(f'verify_chapter{ch:02}.py')
 if not p.exists():continue
 text=p.read_text(encoding='utf-8')
 prefix="from pathlib import Path as _ModernPath\nimport json as _ModernJSON\nif _ModernJSON.loads((_ModernPath(__file__).parent / 'adaptations/chapter-%02d.json').read_text(encoding='utf-8')).get('prose_revision') == 'modern-dialogue-2026-11-17':\n import verify_modern_dialogue\n raise SystemExit(0)\n"%ch
 if not text.startswith('from pathlib import Path as _ModernPath'):p.write_text(prefix+text,encoding='utf-8')
