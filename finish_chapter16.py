from pathlib import Path
import json
r=Path(__file__).parent;p=r/'adaptations/chapter-16.json';d=json.loads(p.read_text(encoding='utf-8'));d['status']='reviewed';p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
units=json.loads((r/'tts-canvas/FAUST_C16_V04_SCRIPT.json').read_text(encoding='utf-8'))['scenes'][0]['segments'];assert len(units)==28 and sum(x['speaker']=='나레이터' for x in units)==22
p=r/'tts-canvas/README.md';s=p.read_text(encoding='utf-8').replace('1~15장 전체1222구간','1~16장 전체1250구간').replace('|15|109|','|15|109|\n|16|28|');s+='\n16장: [Canvas TTS HTML](FAUST_C16_V04_GEMINI_CANVAS_TTS.html) · [대본](FAUST_C16_V04_SCRIPT.json). 나레이션22·독백6, 총28구간.\n';p.write_text(s,encoding='utf-8')
(r/'PRODUCTION_PROGRESS.md').write_text('''# 최신 진행 상태

1~16장 제작 완료. 16장 「정원의 작은 집」 최종 배포.

- 독일어 원문916자와 대응 번역3묶음 보존, 기본 접기. 독립 원문 대조 통과.
- 현대 대사·중학생용 본문6장면, 새 삽화6컷. 4×4 원본1263×1246과 미사용 대체 구도10컷 보관.
- 그림→관련 본문·독백→원문·번역 순서 및 번역 단위 시작 위치 배치 검증.
- 16장 TTS28구간(나레이션22·독백6), 전체1~16장1250구간. HTML·대본·파일명 색인 갱신.
- 독백은 낮고 또렷한 보통 말소리와 리버브·짧은 에코, 나레이션 원음. DSP 및16장 일괄 다운로드 경로 모의검사 통과.
- 실제 음성 생성·다운로드·청취 미실행. 다음 제작 대상17장.
''',encoding='utf-8')
print('Chapter16 notes and TTS index documentation finalized')
