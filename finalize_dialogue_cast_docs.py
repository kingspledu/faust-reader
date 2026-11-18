from pathlib import Path
from bs4 import BeautifulSoup
import json
r=Path(__file__).parent
v=json.loads((r/'dialogue-cast-verification.json').read_text(encoding='utf-8'));rows=v['chapters'];dialogue=sum(e['dialogue'] for e in rows);mono=sum(e['monologues'] for e in rows)
md=['# 파우스트 Gemini Canvas TTS','현재 본문·배역 기준: dialogue-cast-v3 / CAST-2026-11-18. 모델은 `gemini-2.5-flash-preview-tts`. 1~17장 전체'+str(v['tts_segments'])+'구간. 원문·대응 번역·메뉴·화자 라벨은 낭독하지 않는다.','[성우·연기 설정](../voice-cast.html) · [배역 원본 JSON](../voice-cast.json) · [제작 규칙](../FAUST_PRODUCTION_GUIDELINES.md)','발화마다 narration/dialogue/monologue를 구분한다. 일반 대사는 해당 인물의 고정 음색과 보통 말소리로 읽으며 원음이다. 나레이션은 Charon 원음, 독백만 같은 인물 음색의 낮고 또렷한 보통 발성과 리버브·짧은 에코를 적용한다. 속삭임·과한 웃음·숨소리 금지.','각 장의 `FAUST_CNN_V04_GEMINI_CANVAS_TTS.html`을 Canvas에서 실행한다. 참조 `gemini_tts.html`의 빈 apiKey 구조와 WAV/전체MP3/재다운로드 흐름을 유지했다. 실제 음성 생성·다운로드·청취는 미실행이며 모델 가용성·인증·브라우저 저장은 실행 환경에서 확인해야 한다.','이번 변경으로 배역 코드·발화 순서·본문이 바뀌었다. V04 이름이 같아도 이전 다운로드·캐시·색인과 혼용하지 않는다. 새 `FAUST_AUDIO_INDEX_V04.json/csv`의 filename·segment_id·본문 해시와 배역표를 기준으로 정리한다.','파일명: `FAUST_CNN_V04_전체순번_장면ID_배역ID.wav` / 전체MP3: `FAUST_CNN_V04_FULL.mp3`. 배역표·본문·효과 변경은 프롬프트와 파일 지문에 반영한다.','|장|전체|일반 발화|마음속 독백|HTML|','|---|---:|---:|---:|---|']
for e in rows:md.append(f'|{e["chapter"]}|{e["tts_segments"]}|{e["dialogue"]}|{e["monologues"]}|[Canvas HTML](FAUST_C{e["chapter"]:02}_V04_GEMINI_CANVAS_TTS.html)|')
md+=['','검증: `python verify_dialogue_cast.py`, `node test_tts_effects.cjs`, `node test_cast_routing.cjs`, `node test_tts_batch_v04.cjs`。 자동·모의검사는 실제 청취와 다르다. V01~V03은 삭제 상태를 유지한다.']
(r/'tts-canvas/README.md').write_text('\n\n'.join(md).replace('`。','`.'),encoding='utf-8')
(r/'PRODUCTION_PROGRESS.md').write_text(f'''# 최신 진행 상태

1~17장 대화·문체·배역 일관성 수정 완료.18~28장은 원문 페이지 유지, 다음 제작은18장.

- 이름은 메피스토·그레첸. 독일어 원문과 기존 대응 번역·삽화 경로·장면 앵커를 보존.
- 원문에 근거한 일반 발화 {dialogue}구간, 독백 {mono}구간. 기존 대사와 독백을 그대로 유지하고, 인물의 의도와 갈등을 전지적 서술로 보충한다.
- 메피스토는 파우스트에게 느긋한 반말과 짓궂은 농담, 주·마르테·낯선 사람 앞에서는 공손한 척하는 존댓말.
- voice-cast.json:128개 참조 항목 전체에 고정 음색·페르소나·처리방식 지정. 나레이터·헌시 시인·문맥별3개 화자 포함 총133프로필. 집단·비발화 형상을 독립된128명으로 해석하지 않음.
- TTS 모델 gemini-2.5-flash-preview-tts, 전체{v['tts_segments']}구간. 일반 대사·나레이션 원음, 독백만 리버브·짧은 에코.
- 원문·번역·그림 보존, 배역·페르소나·효과·색인 대응 및 DSP·일괄 저장 모의검사 통과. 실제 음성 생성·다운로드·청취 미실행.
- V04라도 발화순서·배역코드가 바뀌었으므로 이전 다운로드 음성과 새 색인을 혼용하지 않음.
''',encoding='utf-8')
completed=rows[-1]['chapter']
for name in ['tts-canvas/README.md','PRODUCTION_PROGRESS.md']:
 p=r/name
 s=p.read_text(encoding='utf-8').replace('dialogue-cast-v3', 'cleanroom-v1').replace('1~17장',f'1~{completed}장').replace('18~28장은 원문 페이지 유지, 다음 제작은18장.',f'{completed+1}~28장은 원문 페이지를 제공한다.' if completed<28 else '제1부 28장 클린룸 재작성 완료.')
 p.write_text(s,encoding='utf-8')
for name in ['index.html','art-bible/index.html']:
 p=r/name;s=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser');target='voice-cast.html' if name=='index.html' else '../voice-cast.html'
 if not s.find('a',href=target):
  a=s.new_tag('a',href=target);a.string='성우·연기 설정';(s.header or s.body or s).append(a)
 p.write_text(str(s),encoding='utf-8')
print('Documentation updated:',dialogue,'spoken turns,',mono,'inner thoughts,',v['tts_segments'],'total TTS segments')
