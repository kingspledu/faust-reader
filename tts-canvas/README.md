# 파우스트 Gemini Canvas TTS 묶음

최신 확정 버전은 **V04**입니다. 독백은 `불안한 독백 · 짧은 에코`를 실제 후처리하며 나레이션은 원음입니다. 1~12장 HTML·대본·색인은 `V04` 파일을 사용하세요. 이전 버전과 전용 리소스는 삭제했습니다. 비교실 `FAUST_MONOLOGUE_FX_LAB_V04.html`도 기본 선택을 짧은 에코로 변경했습니다. 프리셋 이름과 별개로 인물의 감정 연기는 장면에 맞춥니다.

현재 웹소설이 완성된 1~12장만 포함합니다. 각 장 HTML을 Canvas에서 실행하고 대본을 로드한 뒤 생성/다운로드하세요. 참조 HTML의 빈 apiKey 실행 경로와 UI를 유지했습니다. 이 파일은 오프라인 TTS가 아니며 Canvas 런타임이 인증을 처리하는지는 실행 환경에 달려 있습니다. 사용자 API 키를 넣거나 외부 API로 미리 생성하지 않았습니다.

개별 WAV: FAUST_C장번호_V04_전체순번_장면ID_화자.wav
전체 MP3: FAUST_C장번호_V04_FULL.mp3

파일명을 변경하지 마세요. 생성 후 색인 JSON/CSV와 함께 다운로드 폴더에서 찾으면 됩니다. 파일명 충돌이나 브라우저 (1) 복제본을 확인하고 장별 폴더에 정리할 수 있습니다. 이후 업로드 요청 시 색인의 장면 ID와 해시로 웹사이트 연결을 확인할 수 있습니다. 현재 사이트에 오디오를 연결하지 않았습니다.

감정·호흡·작은 웃음·울먹임을 구간별 지침에 넣었습니다. 모델이 모든 지침을 보장하지 않으므로 청취 검수가 필요합니다. 원문에 없는 기침이나 과도한 통곡을 모든 문장에 강제하지 않습니다. 음성 생성·다운로드 실검증은 아직 하지 않았습니다.

8장: [Canvas TTS HTML](FAUST_C08_V04_GEMINI_CANVAS_TTS.html) · [대본](FAUST_C08_V04_SCRIPT.json). 120구간(나레이션60·독백60). 독백은 나직한 보통 말소리로, 과도한 속삭임을 피하며 짧은 에코를 후처리합니다.

9장: [Canvas TTS HTML](FAUST_C09_V04_GEMINI_CANVAS_TTS.html) · [대본](FAUST_C09_V04_SCRIPT.json). 나레이션46·독백46, 총92구간.

10장: [Canvas TTS HTML](FAUST_C10_V04_GEMINI_CANVAS_TTS.html) · [대본](FAUST_C10_V04_SCRIPT.json). 나레이션12·독백12, 총24구간.

11장: [Canvas TTS HTML](FAUST_C11_V04_GEMINI_CANVAS_TTS.html) · [대본](FAUST_C11_V04_SCRIPT.json). 나레이션21·독백21, 총42구간.

12장: [Canvas TTS HTML](FAUST_C12_V04_GEMINI_CANVAS_TTS.html) · [대본](FAUST_C12_V04_SCRIPT.json). 나레이션9·독백9, 총18구간.
