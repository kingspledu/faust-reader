# 파우스트 Gemini Canvas TTS

최신 형식은V04,최신 본문은2026-11-17 현대 한국어 문체 수정본입니다.1~14장 전체1113구간이며 독일어 원문·대응 번역·메뉴·화자 라벨은 낭독하지 않습니다.

독백은 나직한 보통 말소리로,지나친 속삭임·숨소리를 피하도록 지시합니다. 생성 뒤에는 불안한 독백·짧은 에코 프리셋의 리버브와 에코를 실제 후처리합니다. 나레이션은 원음을 유지합니다. 프리셋 이름과 별개로 감정은 장면에 맞춥니다.

각 장의 FAUST_CNN_V04_GEMINI_CANVAS_TTS.html을 Canvas에서 실행합니다. 참조 gemini_tts.html의 빈apiKey 구조를 유지했으며 네트워크 호출과 인증 처리는 실행 환경에 따릅니다. 여기서 실제 음성을 생성하거나 다운로드하지 않았습니다.

개별WAV: FAUST_CNN_V04_전체순번_장면ID_화자코드.wav
전체MP3: FAUST_CNN_V04_FULL.mp3

문체 수정과 문단 분할 때문에 일부 파일 순번이 바뀌었습니다. 이전에 다운로드한 음성과 새 색인을 혼용하지 마세요. 파일명이 같아도 내용이 달라질 수 있으며 HTML의 본문·연기지침 지문으로 캐시를 구분합니다. 최신 FAUST_AUDIO_INDEX_V04.json 또는CSV를 기준으로 정리합니다.실제음성 업로드를 요청하면 그때 장면ID·본문해시·누락을 대조합니다.

|장|낭독 구간|
|---|---:|
|1|56|
|2|70|
|3|44|
|4|108|
|5|99|
|6|87|
|7|127|
|8|127|
|9|103|
|10|28|
|11|80|
|12|26|
|13|118|
|14|40|

독백 효과 비교실: FAUST_MONOLOGUE_FX_LAB_V04.html.이전V01~V03과 전용 리소스는 삭제한 상태를 유지합니다.

검증: python verify_modern_dialogue.py / node test_tts_effects.cjs / node test_tts_batch_v04.cjs. 자동검사와 실제음성 청취는 다르며 Canvas의 실제 생성·다운로드·청취 검증은 아직 하지 않았습니다.

13장: [Canvas TTS HTML](FAUST_C13_V04_GEMINI_CANVAS_TTS.html) · [대본](FAUST_C13_V04_SCRIPT.json).나레이션87·독백31,총118구간.

14장: [Canvas TTS HTML](FAUST_C14_V04_GEMINI_CANVAS_TTS.html) · [대본](FAUST_C14_V04_SCRIPT.json). 나레이션30·독백10, 총40구간.
