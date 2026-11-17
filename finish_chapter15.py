from pathlib import Path
from bs4 import BeautifulSoup
import json
r=Path(__file__).parent
p=r/'adaptations/chapter-15.json';d=json.loads(p.read_text(encoding='utf-8'));d['status']='reviewed';p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
p=r/'chapter-15.html';s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser');s.select_one('header a[href="scene-plan.html"]').string='삽화 장면 구성';p.write_text(str(s),encoding='utf-8')
units=json.loads((r/'tts-canvas/FAUST_C15_V04_SCRIPT.json').read_text(encoding='utf-8'))['scenes'][0]['segments'];n=sum(x['speaker']=='나레이터' for x in units);m=len(units)-n;assert (n,m)==(85,24)
p=r/'tts-canvas/README.md';s=p.read_text(encoding='utf-8').replace('1~14장 전체1113구간','1~15장 전체1222구간').replace('|14|40|','|14|40|\n|15|109|');s+='\n15장: [Canvas TTS HTML](FAUST_C15_V04_GEMINI_CANVAS_TTS.html) · [대본](FAUST_C15_V04_SCRIPT.json). 나레이션85·독백24, 총109구간.\n';p.write_text(s,encoding='utf-8')
(r/'PRODUCTION_PROGRESS.md').write_text('''# 최신 진행 상태

1~15장 제작 완료. 15장 「정원」 최종 배포.

- 독일어 원문6,389자와 대응 번역13묶음 보존, 기본 접기. 독립 원문 대조 통과.
- 현대 대사·중학생용 본문24장면, 새 삽화24컷. 4×4 원본2장과 미사용 대체 구도8컷 별도 보관.
- 그림→관련 본문·독백→원문·번역 순서 및 번역 단위 시작 위치 배치 검증.
- 15장 TTS109구간(나레이션85·독백24), 전체1~15장1222구간. HTML·대본·파일명 색인 갱신.
- 독백은 낮고 또렷한 보통 말소리, 리버브·짧은 에코. DSP 및15장 일괄 다운로드 경로 모의검사 통과. 실제 음성 생성·다운로드·청취 미실행.
- 브라우저DOM: 모바일390px·데스크톱1280px 가로 넘침 없음,24장면 순서·13묶음 기본 접기와 펼치기 확인. 화면 캡처는 도구 시간 초과로 미확인.
- 다음 제작 대상16장. 기존 다운로드 음성과 새 색인을 혼용하지 않음.
''',encoding='utf-8')
print('Chapter15 final notes:24 illustrations,13 bilingual units,109 TTS segments')
