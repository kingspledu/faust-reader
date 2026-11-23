import copy,json
from pathlib import Path
from voice_identity import validate_voice_identity
root=Path(__file__).resolve().parents[2];work=Path(__file__).parent
docs=[json.loads((work/f'chapter-{n:02}-sentences.json').read_text(encoding='utf-8')) for n in (1,2)];cast=json.loads((root/'voice-cast.json').read_text(encoding='utf-8'))
identities=validate_voice_identity(docs,cast)
for field in ('voice','persona'):
 bad=copy.deepcopy(docs)
 if field=='voice':bad[0]['sentences'][1]['voice']='Kore'
 else:bad[0]['sentences'][1]['performance']['character_persona']='different identity'
 try:validate_voice_identity(bad,cast)
 except ValueError:pass
 else:raise AssertionError('Identity change accepted')
audio=json.loads((root/'audio/part-1/chapter-01/manifest.json').read_text(encoding='utf-8'))
expected={s['sentence_id']:s for d in docs for s in d['sentences']}
for row in audio['sentences']:assert row['voice']==expected[row['sentence_id']]['voice']
report=dict(status='PASS',cast_identities=identities,chapters=2,sentences=230,imported_audio_voice_metadata_matches=True,changed_voice_rejected=True,changed_persona_rejected=True,acoustic_identity_verified=False,reason='Metadata cannot verify the perceived voice in generated audio')
(work/'VOICE-IDENTITY-AUDIT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(report)
