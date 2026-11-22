"""Verify the updated skill outputs; actual speech synthesis is separate."""
from pathlib import Path
import subprocess
r=Path(__file__).parent
subprocess.run(['node',str(r/'.tools/audiobook-reader-skill/assets/gemini-canvas-tts/scripts/verify.cjs'),str(r/'audition/canvas')],check=True)
