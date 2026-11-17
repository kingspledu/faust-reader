from pathlib import Path
import json,subprocess
r=Path('.')
for ch in range(1,18):
 name=f'adaptations/chapter-{ch:02}.json'
 old=json.loads(subprocess.check_output(['git','-c','safe.directory=C:/Users/고보민/Downloads/codex/listening test/faust-reader','show','HEAD:'+name],encoding='utf-8'));new=json.loads((r/name).read_text(encoding='utf-8'))
 a=old['scripts'] if ch==1 else [b['script'] for b in old['scenes']];b=new['scripts'] if ch==1 else [b['script'] for b in new['scenes']]
 assert [[x for x in f if x['role']!='narration'] for f in a]==[[x for x in f if x['role']!='narration'] for f in b]
print('PASS:all existing dialogue and inner thoughts match deployed revision verbatim')
p=r/'FAUST_PRODUCTION_GUIDELINES.md';s=p.read_text(encoding='utf-8');s+='\n## 친절한 의도·갈등 서술 보충 · 최신 요청\n\n기존 독백을 그대로 유지한 채 나레이션을 덧붙인다. 메피스토가 왜 질문을 피하거나 농담·칭찬·재촉을 쓰는지, 그 행동으로 상대를 어느 쪽으로 움직이려 하는지 원문 맥락 안에서 설명한다. 다른 인물도 원하는 것과 걱정하는 것이 어떻게 충돌하는지 익숙한 말로 풀어 준다. 대사·독백을 친절한 설명으로 대체하거나 줄이지 않는다. 이미 충분한 장면에 같은 뜻을 반복하거나 원문에 없는 확정된 과거·계획을 만들지 않는다.\n';p.write_text(s,encoding='utf-8')
