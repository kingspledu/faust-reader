from pathlib import Path
import re,json
root=Path('faust-reader');exec((root/'build.py').read_text(encoding='utf-8-sig').split("page='''")[0])
shots=['extreme-wide','close-up','detail-hands-prop','medium-two-shot','over-shoulder','high-angle-wide','extreme-close-up','low-angle-medium']
plan=[]
for ci,c in enumerate(chapters):
 t=c['text'];ends=[m.end() for m in re.finditer(r'[.!?…]+[”’»"\)]*(?=\s|$)',t)]
 # Speaker labels are not prose sentences.
 ends=[end for end in ends if not re.search(r'(?:^|\n)[A-ZÄÖÜẞ ,\-]+\.$',t[:end])]
 start=0;k=0
 for j in range(3,len(ends),4):
  end=ends[j];plan.append({'id':f'dense-c{ci+1:02}-{k+1:03}','chapter':ci+1,'start':start,'end':end,'source_excerpt':t[start:end],'shot':shots[k%len(shots)],'status':'storyboard_draft','note':'자동 문장 경계 초안. 운문·줄임표·무대지시를 수동 검토한 후 생성.'});start=end;k+=1
 if start<len(t):plan.append({'id':f'dense-c{ci+1:02}-{k+1:03}','chapter':ci+1,'start':start,'end':len(t),'source_excerpt':t[start:],'shot':shots[k%len(shots)],'status':'storyboard_draft','note':'마지막 잔여 구간은 1~4문장 허용. 생성 전 수동 검토.'})
(root/'dense-scene-plan.json').write_text(json.dumps({'target_sentences':{'min':3,'max':4},'shots':shots,'policy':'New images for missing intervals; never duplicate existing illustrations as filler. Existing source text unchanged. Review poem punctuation manually before generation.','scenes':plan},ensure_ascii=False,indent=2),encoding='utf-8')
p=root/'AGENTS.md';s=p.read_text(encoding='utf-8');s+='\n## Illustration density and composition\n\nUser requests an illustration every 3–4 source sentences, with varied close-ups, details, medium shots, wide/pull-back shots, over-shoulder, high and low angles. Do not count German uppercase speaker headings as sentences. Review verse and stage directions manually. Generate in exact 4x4 row-major batches; split into 16 unique scene assets and insert beside source anchors. Never reuse a repeated crop to fill density. dense-scene-plan.json is a draft, not completed generation. Generate next batch while editing and verifying preceding one; publish verified batches sequentially.\n';p.write_text(s,encoding='utf-8');print('Draft intervals:',len(plan))
