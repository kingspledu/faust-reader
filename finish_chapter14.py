from pathlib import Path
import json
r=Path('.')
p=r/'adaptations/chapter-14.json';d=json.loads(p.read_text(encoding='utf-8'));d['status']='reviewed';p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
p=r/'tts-canvas/README.md';s=p.read_text(encoding='utf-8').replace('1~13장 전체1073구간','1~14장 전체1113구간').replace('|13|118|','|13|118|\n|14|40|');s+='\n14장: [Canvas TTS HTML](FAUST_C14_V04_GEMINI_CANVAS_TTS.html) · [대본](FAUST_C14_V04_SCRIPT.json). 나레이션30·독백10, 총40구간.\n';p.write_text(s,encoding='utf-8')
(r/'PRODUCTION_PROGRESS.md').write_text('''# 최신 진행 상태

1~14장 제작 완료. 14장 「거리Ⅱ」를 공개 페이지에 반영합니다.

- 독일어 원문 2,110자와 대응 번역 5묶음 보존, 기본 접기. 독립 원문 대조 통과.
- 현대 대사·중학생용 본문 10장면, 새 삽화 10컷. 4×4 원본과 미사용 대체 구도 6컷 별도 보관.
- 그림→본문·독백→관련 원문·번역 순서 및 원문 시작 위치 기준 접기 배치 검증.
- 14장 TTS 40구간(나레이션30·독백10), 전체1~14장1113구간. HTML·대본·파일명 색인 갱신.
- 독백은 나직한 보통 말소리, 리버브·짧은 에코. DSP 및14장 일괄 다운로드 경로 모의검사 통과. 실제 음성 생성·다운로드·청취는 미실행.
- 다음 제작 대상은15장. 기존 다운로드 음성과 새 색인을 혼용하지 않음.
''',encoding='utf-8')
