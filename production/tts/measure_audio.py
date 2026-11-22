"""Conservative browser-only gain and boundary hints; never rewrite MP3 bytes."""
import json,math
from pathlib import Path
import av,numpy as np
root=Path(__file__).resolve().parents[2];folder=root/'audio/part-1/chapter-01';path=folder/'manifest.json'
doc=json.loads(path.read_text(encoding='utf-8'));groups={};measurements=[]
for row in doc['sentences']:
 resampler=av.AudioResampler(format='fltp',layout='mono',rate=24000);samples=[]
 for frame in av.open(str(folder/row['url'])).decode(audio=0):
  for mono in resampler.resample(frame):samples.append(mono.to_ndarray().ravel())
 x=np.concatenate(samples);rms=float(np.sqrt(np.mean(x*x)));peak=float(np.max(np.abs(x)));window=240
 levels=np.array([np.sqrt(np.mean(x[i:i+window]**2)) for i in range(0,len(x),window)])
 active=np.flatnonzero(levels>10**(-50/20));duration=len(x)/24000
 # Keep 150ms padding; only trim short outer silence, never internal pauses or long tails.
 start=max(0,active[0]*.01-.15) if len(active) else 0
 end=min(duration,(active[-1]+1)*.01+.15) if len(active) else duration
 if start>1:start=0
 if duration-end>1:end=duration
 row.update(trim_start=round(start,4),trim_end=round(end,4),effects_applied='unknown-export-history',rms_dbfs=round(20*math.log10(max(rms,1e-10)),2),peak_dbfs=round(20*math.log10(max(peak,1e-10)),2))
 groups.setdefault(row['voice'],[]).append(row['rms_dbfs']);measurements.append(dict(sentence_id=row['sentence_id'],trim_start=row['trim_start'],trim_end=row['trim_end'],rms_dbfs=row['rms_dbfs'],peak_dbfs=row['peak_dbfs']))
means={v:float(np.median(values)) for v,values in groups.items()};target=min(-21,min(means.values()))
for row in doc['sentences']:row['playback_gain']=round(10**((target-means[row['voice']])/20),5)
doc['measurement_policy']='10ms RMS -50dBFS boundary detector, 150ms padding, max 1s removal; voice median attenuation only; no MP3 rewrite or DSP'
path.write_text(json.dumps(doc,ensure_ascii=False,indent=2),encoding='utf-8')
report=dict(voices_median_rms_dbfs=means,target_dbfs=target,files_unchanged=True,effects_not_added=True,human_listening=False,measurements=measurements)
(root/'production/tts/chapter-01-audio-measurements.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(means,target)
