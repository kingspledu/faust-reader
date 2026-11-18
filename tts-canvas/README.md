# 파우스트 Gemini Canvas TTS

현재 본문·배역 기준: cleanroom-v1 / CAST-2026-11-18. 모델은 `gemini-2.5-flash-preview-tts`. 1~28장 전체249구간. 원문·대응 번역·메뉴·화자 라벨은 낭독하지 않는다.

[성우·연기 설정](../voice-cast.html) · [배역 원본 JSON](../voice-cast.json) · [제작 규칙](../FAUST_PRODUCTION_GUIDELINES.md)

발화마다 narration/dialogue/monologue를 구분한다. 일반 대사는 해당 인물의 고정 음색과 보통 말소리로 읽으며 원음이다. 나레이션은 Charon 원음, 독백만 같은 인물 음색의 낮고 또렷한 보통 발성과 리버브·짧은 에코를 적용한다. 속삭임·과한 웃음·숨소리 금지.

각 장의 `FAUST_CNN_V04_GEMINI_CANVAS_TTS.html`을 Canvas에서 실행한다. 참조 `gemini_tts.html`의 빈 apiKey 구조와 WAV/전체MP3/재다운로드 흐름을 유지했다. 실제 음성 생성·다운로드·청취는 미실행이며 모델 가용성·인증·브라우저 저장은 실행 환경에서 확인해야 한다.

이번 변경으로 배역 코드·발화 순서·본문이 바뀌었다. V04 이름이 같아도 이전 다운로드·캐시·색인과 혼용하지 않는다. 새 `FAUST_AUDIO_INDEX_V04.json/csv`의 filename·segment_id·본문 해시와 배역표를 기준으로 정리한다.

파일명: `FAUST_CNN_V04_전체순번_장면ID_배역ID.wav` / 전체MP3: `FAUST_CNN_V04_FULL.mp3`. 배역표·본문·효과 변경은 프롬프트와 파일 지문에 반영한다.

|장|전체|일반 발화|마음속 독백|HTML|

|---|---:|---:|---:|---|

|1|18|0|2|[Canvas HTML](FAUST_C01_V04_GEMINI_CANVAS_TTS.html)|

|2|64|35|0|[Canvas HTML](FAUST_C02_V04_GEMINI_CANVAS_TTS.html)|

|3|13|4|0|[Canvas HTML](FAUST_C03_V04_GEMINI_CANVAS_TTS.html)|

|4|12|3|0|[Canvas HTML](FAUST_C04_V04_GEMINI_CANVAS_TTS.html)|

|5|8|0|0|[Canvas HTML](FAUST_C05_V04_GEMINI_CANVAS_TTS.html)|

|6|9|2|0|[Canvas HTML](FAUST_C06_V04_GEMINI_CANVAS_TTS.html)|

|7|7|2|0|[Canvas HTML](FAUST_C07_V04_GEMINI_CANVAS_TTS.html)|

|8|5|0|0|[Canvas HTML](FAUST_C08_V04_GEMINI_CANVAS_TTS.html)|

|9|6|0|0|[Canvas HTML](FAUST_C09_V04_GEMINI_CANVAS_TTS.html)|

|10|5|1|0|[Canvas HTML](FAUST_C10_V04_GEMINI_CANVAS_TTS.html)|

|11|5|0|0|[Canvas HTML](FAUST_C11_V04_GEMINI_CANVAS_TTS.html)|

|12|5|2|0|[Canvas HTML](FAUST_C12_V04_GEMINI_CANVAS_TTS.html)|

|13|5|0|0|[Canvas HTML](FAUST_C13_V04_GEMINI_CANVAS_TTS.html)|

|14|5|2|0|[Canvas HTML](FAUST_C14_V04_GEMINI_CANVAS_TTS.html)|

|15|5|0|0|[Canvas HTML](FAUST_C15_V04_GEMINI_CANVAS_TTS.html)|

|16|3|0|0|[Canvas HTML](FAUST_C16_V04_GEMINI_CANVAS_TTS.html)|

|17|5|1|0|[Canvas HTML](FAUST_C17_V04_GEMINI_CANVAS_TTS.html)|

|18|4|0|1|[Canvas HTML](FAUST_C18_V04_GEMINI_CANVAS_TTS.html)|

|19|8|3|0|[Canvas HTML](FAUST_C19_V04_GEMINI_CANVAS_TTS.html)|

|20|4|1|0|[Canvas HTML](FAUST_C20_V04_GEMINI_CANVAS_TTS.html)|

|21|3|1|0|[Canvas HTML](FAUST_C21_V04_GEMINI_CANVAS_TTS.html)|

|22|5|0|0|[Canvas HTML](FAUST_C22_V04_GEMINI_CANVAS_TTS.html)|

|23|4|0|0|[Canvas HTML](FAUST_C23_V04_GEMINI_CANVAS_TTS.html)|

|24|6|0|0|[Canvas HTML](FAUST_C24_V04_GEMINI_CANVAS_TTS.html)|

|25|5|0|0|[Canvas HTML](FAUST_C25_V04_GEMINI_CANVAS_TTS.html)|

|26|7|2|0|[Canvas HTML](FAUST_C26_V04_GEMINI_CANVAS_TTS.html)|

|27|2|0|0|[Canvas HTML](FAUST_C27_V04_GEMINI_CANVAS_TTS.html)|

|28|21|5|0|[Canvas HTML](FAUST_C28_V04_GEMINI_CANVAS_TTS.html)|



검증: `python verify_dialogue_cast.py`, `node test_tts_effects.cjs`, `node test_cast_routing.cjs`, `node test_tts_batch_v04.cjs`. 자동·모의검사는 실제 청취와 다르다. V01~V03은 삭제 상태를 유지한다.