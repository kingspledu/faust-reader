from pathlib import Path
import json,re
r=Path(__file__).parent
p=r/'FAUST_PRODUCTION_GUIDELINES.md';s=p.read_text(encoding='utf-8')
latest='''## 최신 확정 규칙 · 2026-11-18

이 절이 이전 문체·TTS 기준보다 우선한다.

1. 새 웹소설·대사·독백·메뉴·설정집·TTS의 이름은 메피스토, 그레첸. 독일어 원문과 기존 대응 번역은 보존한다. ID·영문 경로와 시트 이미지 속 글자는 별개다.
2. 중학생이 사건과 대화 맥락을 이해하도록 친절한 전지적 과거형 서술을 쓴다. 인물의 질문·대답·반박을 설명문으로 모두 요약하지 않고 실제 대사로 살린다. 상대 말에 반응하는 현대 한국어 대화 리듬을 쓴다. 원문 발언을 우선하며 새 인물·사건·관계·조건을 만들지 않는다.
3. 메피스토는 파우스트에게 느긋한 반말을 쓴다. 진지한 파우스트를 관찰하며 약점을 건드리고 혼자 상황을 즐긴다. ‘킬킬킬’ 반복 대신 표정·잠깐의 웃음·상대 반응으로 장난기를 드러낸다. 주·마르테·낯선 사람 앞에서는 공손한 척하는 존댓말을 쓸 수 있다. 류크를 포함한 특정 작품의 대사·성우·음색을 복제하지 않는다.
4. 파우스트는 메피스토에게 자연스러운 반말, 낯선 상대에게는 존댓말. 그레첸과는 첫 만남의 존댓말에서 친밀해지는 과정에 맞게 바뀐다. 그레첸은 자연스러운 일상 말투를 쓰며 애기 목소리·과장된 수줍음을 피한다.
5. 독백은 매 삽화마다 의무적으로 넣지 않는다. 나레이션·대사를 반복하면 제거하고, 말하지 못한 판단·갈등이 필요한 곳만 남긴다. 나레이션 이름표와 제작 안내 문구는 독서 본문에 넣지 않는다. 독백만 `[독백: 이름]`으로 표시한다.
6. 번역투와 AI 문체는 단어 치환으로 처리하지 않는다. 문단과 대화 전체를 읽고 어순·말끝·반응을 다시 쓴다. 추상적인 감정 설명, 같은 뜻의 결론, 기계적인 대구·병렬, 불필요한 과장을 줄인다. Humanizer 참고 원칙은 `review/HUMANIZER_RESEARCH_AND_REVIEW.md`에 기록한다. 금칙어 검사나 탐지 점수만으로 자연스러움을 보증하지 않는다.
7. `voice-cast.json`이 모든 배역의 단일 음성·페르소나 원본이다. 모델은 `gemini-2.5-flash-preview-tts`. 128개 참조 항목에는 집단·비발화 형상도 포함되므로 독립된128명으로 해석하지 않는다. 같은 인물은 나이·의상·장·독백 여부가 달라져도 동일 음색 ID를 유지한다. 공동 발화는 기존 배역들의 발화 또는 명시된 대표 낭독으로 처리하고 새 인물을 만들지 않는다. 원문에 말이 없는 동물·환영은 새 대사를 만들지 않는다.
8. 원고 `script`의 각 항목은 `role(narration/dialogue/monologue)`, `speaker`, `cast_id`, `text`를 가진다. 일반 대사와 나레이션은 원음. 마음속 독백만 낮고 또렷한 보통 발성과 리버브·짧은 에코. 인물이라는 이유만으로 모든 대사에 에코를 넣지 않는다.
9. TTS는 발화 구간별 단일 화자로 생성한 뒤 순서대로 합친다. 장마다 배역을 임의 변경하거나 누락 화자를 나레이터로 대체하지 않는다. 생성 요청의 프롬프트에는 고정 음색·페르소나·인물 상태·역할·배역표 지문·앞뒤 문맥이 들어간다. 빈 API 키의 Canvas 형식과 WAV·전체MP3·재다운로드 색인을 유지한다. 다른 모델로 자동 전환하지 않는다.
10. 본문·배역·효과 지침을 바꾸면 TTS HTML·대본·색인을 함께 다시 만든다. V04 파일명도 내용·순번·배역이 달라질 수 있으므로 이전 음성·색인과 혼용하지 않는다. 캐시는 프롬프트·목소리·모델·배역표 지문으로 구분한다. 실제 생성·저장·청취 전에는 완료했다고 주장하지 않는다.
11. 현재 완료 범위는1~17장.18~28장은 원문 페이지를 유지하고 차례대로 제작한다. 현재 원고는 `adaptations/chapter-NN.json`의 `script`가 기준이다. 재렌더링은 `render_dialogue_script.py`, TTS는 `build_tts_canvas.py`, 검증은 `verify_dialogue_cast.py`, DSP·다운로드 모의검사는 기존 Node 스크립트로 수행한다. 과거 원고 작성 스크립트를 재실행해 새 원고를 덮어쓰지 않는다.

'''
s=s.replace('## 최신 문체 수정 확정 · 2026-11-17',latest+'## 이전 문체 기준 · 현재 규칙과 충돌하면 위 절 우선')
s=s.replace('메피스토가 파우스트를 상대할 때는 예의를 차리는 척하는 해요체와 빈정거림을 기본으로 한다','메피스토가 파우스트를 상대할 때는 느긋한 반말과 짓궂은 농담을 기본으로 한다')
s=s.replace('각 장면에는 자연스러운 나레이션과 인물의 속마음을 넣는다.','각 장면에는 필요한 나레이션과 원문에 근거한 대화를 넣으며, 속마음은 필요한 자리에서만 쓴다.')
s=s.replace('- 나레이션: `[나레이션: 이야기 밖에서 인물의 마음까지 알려 주는 서술자]`','- 나레이션: 화자 이름표 없이 본문으로 쓴다.')
s=s.replace('3. 화자가 표시된 독백','3. 필요한 경우 화자가 표시된 독백').replace('- 나레이션과 독백의 화자가 명시됐는가?','- 대사 화자는 문맥과 데이터에서 명확하고, 독백에만 이름표가 붙었는가?')
p.write_text(s,encoding='utf-8')
(r/'AGENTS.md').write_text('''# Faust reader project rules

Read `FAUST_PRODUCTION_GUIDELINES.md` first. Its latest2026-11-18 rules and the user’s latest instructions override older notes and generators.

- Display names: 메피스토 / 그레첸. Preserve German and existing aligned Korean source translations verbatim inside closed source folds.
- Friendly omniscient narration for middle-school readers, natural Korean dialogue based on source exchanges. No narrator labels or adaptation disclaimers. Keep inner thoughts only where needed, labelled with the character name.
- Mephisto speaks relaxed informal Korean to Faust, enjoying his reactions; polite speech is an intentional social disguise with other people. No copied Death Note lines/actor imitation or repeated laugh syllables.
- `adaptations/chapter-NN.json` structured `script` is canonical. Do not rerun legacy prose writers. Use `render_dialogue_script.py` to render existing structured scripts.
- `voice-cast.json` is the single source for actor voice and persona. Model: `gemini-2.5-flash-preview-tts`. Never fall back silently for an unmapped speaker. Narration/dialogue are dry; only inner monologue gets the approved short echo and reverb with low but normally voiced delivery.
- Regenerate `build_tts_canvas.py` outputs and indexes after script/cast changes. Run `verify_dialogue_cast.py`, `node test_tts_effects.cjs`, and `node test_tts_batch_v04.cjs`. Real generation/listening is separate from static/mock tests.
- Keep all original chapter URLs, image anchors and protected source/translation pairs. Character/location sheets are generated only on demand, with existing reference identities checked first. User requests exact4x4 grids, unique row-major crops and varied compositions every3–4 source sentences.
- Existing authorized deployment: kingspledu/faust-reader main root GitHub Pages. Publish only scoped changes and confirm expected build SHA and public files. Do not stage unrelated review experiments or downloads.
''',encoding='utf-8')
# 古い検証・レンダリング入口も新しい正本に委譲する。
for p in [r/'verify_modern_dialogue.py']+list(r.glob('verify_chapter*.py')):
 if p.name not in {f'verify_chapter{i:02}.py' for i in range(1,18)}|{'verify_modern_dialogue.py'}:continue
 text=p.read_text(encoding='utf-8');guard="from pathlib import Path as _CastPath\nimport runpy as _CastRun\nif (_CastPath(__file__).parent/'dialogue-cast-revision-audit.json').exists():\n _CastRun.run_path(str(_CastPath(__file__).parent/'verify_dialogue_cast.py'),run_name='__main__');raise SystemExit(0)\n"
 if not text.startswith('from pathlib import Path as _CastPath'):p.write_text(guard+text,encoding='utf-8')
for p in r.glob('render_chapter*.py'):
 m=re.fullmatch(r'render_chapter(\d+)\.py',p.name)
 if not m or not 1<=int(m[1])<=17:continue
 ch=int(m[1]);text=p.read_text(encoding='utf-8');guard=f"from pathlib import Path as _CastPath\nimport json as _CastJSON\nif _CastJSON.loads((_CastPath(__file__).parent/'adaptations/chapter-{ch:02}.json').read_text(encoding='utf-8')).get('prose_revision')=='dialogue-cast-v3':\n from render_dialogue_script import render\n render({ch});raise SystemExit(0)\n"
 if not text.startswith('from pathlib import Path as _CastPath'):p.write_text(guard+text,encoding='utf-8')
p=r/'test_tts_effects.cjs';s=p.read_text(encoding='utf-8').replace("turn.speaker!=='나레이터')","turn.kind==='monologue')").replace("effect:turns[index].speaker!=='나레이터'?'echo-v4':'dry'","effect:turns[index].kind==='monologue'?'echo-v4':'dry'").replace("s.speaker==='나레이터'?'dry':'echo-v4'","s.kind==='monologue'?'echo-v4':'dry'");p.write_text(s,encoding='utf-8')
# 배역표를 설정집의 모든 참조 항목에 연결한다.
p=r/'art-bible/reference-index.json';data=json.loads(p.read_text(encoding='utf-8'))
for v in data.values():
 if isinstance(v,list):
  for e in v:
   if isinstance(e,dict) and e.get('kind')=='character':e['voice_cast_id']=e['id'];e['voice_cast_reference']='../voice-cast.json'
p.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print('Latest guidelines,entry points and cast references aligned')
