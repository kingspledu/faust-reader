from pathlib import Path
import json
r=Path(__file__).parent;p=r/'adaptations/chapter-17.json';d=json.loads(p.read_text(encoding='utf-8'));d['status']='reviewed';p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
units=json.loads((r/'tts-canvas/FAUST_C17_V04_SCRIPT.json').read_text(encoding='utf-8'))['scenes'][0]['segments'];n=sum(x['speaker']=='나레이터' for x in units);m=len(units)-n;assert m==21
total=len(json.loads((r/'tts-canvas/FAUST_AUDIO_INDEX_V04.json').read_text(encoding='utf-8'))['segments'])
p=r/'tts-canvas/README.md';s=p.read_text(encoding='utf-8').replace('1~16장 전체1250구간',f'1~17장 전체{total}구간').replace('|16|28|',f'|16|28|\n|17|{len(units)}|');s+=f'\n17장: [Canvas TTS HTML](FAUST_C17_V04_GEMINI_CANVAS_TTS.html) · [대본](FAUST_C17_V04_SCRIPT.json). 나레이션{n}·독백{m}, 총{len(units)}구간.\n';p.write_text(s,encoding='utf-8')
(r/'PRODUCTION_PROGRESS.md').write_text(f'''# 최신 진행 상태

1~17장 제작 완료. 17장 「숲과 동굴」 최종 배포.

- 독일어 원문6,324자와 대응 번역11묶음 보존, 기본 접기. 독립 원문 대조 통과.
- 현대 대사·중학생용 본문21장면, 새 삽화21컷. 4×4 원본2장과 미사용 대체 구도11컷 보관.
- 그림→관련 본문·독백→원문·번역 순서 및 번역 단위 시작 위치 배치 검증.
- 17장 TTS{len(units)}구간(나레이션{n}·독백{m}), 전체1~17장{total}구간. HTML·대본·파일명 색인 갱신.
- 독백은 낮고 또렷한 보통 말소리와 리버브·짧은 에코, 나레이션 원음. DSP 및17장 일괄 다운로드 경로 모의검사 통과.
- 실제 음성 생성·다운로드·청취 미실행. 다음 제작 대상18장.
''',encoding='utf-8')
print('Chapter17:',len(units),'TTS segments; total',total)
