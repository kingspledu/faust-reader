"""Regenerate the unified audition through the pinned updated skill renderer."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('rebuild_audition_skill.py')),run_name='__main__')
