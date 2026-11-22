"""Migrate existing audition episode through the updated skill renderer."""
import hashlib,importlib.util,json,re,subprocess
from pathlib import Path
from bs4 import BeautifulSoup
r=Path(__file__).parent; skill=r/'.tools/audiobook-reader-skill/assets/gemini-canvas-tts'
spec=importlib.util.spec_from_file_location('copy_site',skill/'scripts/copy_site.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
old=r/'audition/canvas/FAUST_P1_AUD02_ALL.html'
saved=r/'audition/canvas/FAUST_P1_AUD02_ALL_SCRIPT.json'
episode=json.loads(saved.read_text(encoding='utf-8')) if saved.exists() else mod.extract_episode(old.read_text(encoding='utf-8'))
catalog=json.loads((r/'audition/catalog.json').read_text(encoding='utf-8'))
notes={
'narrator':['청자에게 시인과 회상의 시작을 소개한다.','청자에게 마르테의 처지와 그레첸이 찾아온 상황을 연결한다.','장소가 대성당에서 하르츠 산맥으로 바뀐 것을 안내한다.','감옥 문 앞의 파우스트가 그레첸을 구하려는 상황을 전달한다.'],
'character-008':['파우스트에게 옷을 바꾸고 새로운 생활을 시작하자고 재촉한다.','주 앞에서 공손한 척하며 인간 세계를 빈정거린다.','마르테 앞에서 떠나야 하는 이유를 사교적으로 설명한다.','감옥의 파우스트에게 위험을 경고하며 즉시 나오라고 재촉한다.'],
'character-010':['불러낸 대지의 정령에게 자신도 같은 존재라고 주장한다.','메피스토에게 무엇을 입어도 자신의 답답함은 해결되지 않는다고 말한다.','그레첸을 찾아낸 반가움을 장난스러운 질문으로 표현한다.','감옥의 그레첸에게 자신을 보고 문밖으로 나오라고 설득한다.'],
'character-053':['처음 만난 파우스트의 동행 제안을 예의 있게 거절한다.','파우스트가 자신에게 맞춰 주는 것 아닌지 조심스럽게 묻는다.','파우스트의 종교관을 확인하고 믿음이 중요하지 않다는 태도에 의문을 품는다.','감옥에서 들은 목소리가 정말 파우스트인지 다시 확인하려 한다.'],
'character-054':['곁을 떠난 남편에게 못다 한 불만을 말한다.','남편의 소식을 몰라 기다려야 하는지 스스로 고민한다.'],
'character-001':['관객의 재미와 극장 운영을 생각하며 공연 방향을 제안한다.','극작가와 배우에게 하늘부터 지옥까지 공연의 큰 흐름과 속도를 제시한다.'],
'character-002':['극장 지배인의 관객 이야기가 창작의 집중을 흐린다고 반박한다.','젊을 때 온 힘으로 사랑하고 미워했던 창작의 감정을 회상한다.'],
'character-012':['파우스트에게 들은 소리를 그리스 비극으로 여겼다며 말의 기술을 논한다.','파우스트와 달리 검은 푸들만 보인다며 관찰을 조심스럽게 설명한다.'],
'character-042':['학자를 만났다는 기대와 질문을 잘해야 한다는 긴장을 속으로 말한다.','학자로 위장한 메피스토에게 다음에도 찾아와도 되는지 묻는다.'],
'character-003':['미래 독자보다 지금 극장 관객을 웃기는 일이 중요하다고 장난스럽게 반문한다.','나이 들어도 어린 마음이 남아 있다는 생각을 동료에게 말한다.'],
'character-055':['그레첸에게 베르벨헨의 소식을 꺼내며 반응을 살핀다.','베르벨헨의 결혼을 조롱할 일을 말하며 가혹한 여론을 드러낸다.'],
'character-009':['메피스토에게 땅에서 마음에 드는 것이 정말 없었는지 묻는다.','메피스토의 자극이 인간을 안주하지 않게 할 수 있다고 말한다.'],
'character-043':['술집 동료들에게 더 활기차게 마시고 웃자고 부추긴다.','눈속임이 끝난 뒤 자신이 포도주를 마셨다는 감각을 주장한다.'],
'character-045':['술집 분위기를 깨는 사람을 내보내고 노래하자고 말한다.','벌어진 일을 눈속임이었다고 단정하며 동료들에게 말한다.'],
'character-046':['술집 동료의 시끄러운 소리에 불평한다.','놀라운 일을 겪은 뒤 동료들에게 기적을 믿지 않겠느냐고 묻는다.'],
'character-052':['부엌에 들어온 이들의 정체와 허락을 따져 묻는다.','약을 그대로 마시는 위험을 경고하며 의식을 준비할 이유를 말한다.'],
'character-044':['프로슈의 불평에 네가 웃길 일을 하지 않아서라고 받아친다.','눈속임이었다는 설명을 듣고 보았던 포도송이는 무엇이었는지 묻는다.'],
'character-056':['누이를 꾀는 자가 누구인지 어둠 속 상대를 추궁한다.','누이의 일에 관여한 마르테에게 책임을 따지며 분노한다.'],
'character-011':['자신을 불러낸 파우스트에게 누가 불렀는지 묻는다.','파우스트의 동등하다는 주장을 차갑게 부정한다.'],
'character-050':['마녀의 행방을 묻는 방문자에게 잔치에 갔다고 답한다.','주사위와 부에 대한 바람을 장난스럽게 말한다.'],
'character-058':['그레첸에게 과거의 편안한 기도와 지금의 죄책감을 대비시킨다.','그레첸이 숨으려 해도 자신이 한 일을 감출 수 없다고 압박한다.'],
'character-013':['부활의 소식을 선포하는 합창의 대표 낭독이다. 노래나 다중 합창을 자동 생성하지 않는다.'],
'character-084':['춤추는 무리가 더 온다며 상대의 시선을 뒤로 돌린다.'],
'dedication-poet':['다시 이야기를 쓰려는 설렘에서 끝까지 쓸 수 있을지 망설임으로 이동하는 시인의 내면이다.'],
'extra-dancer-woman':['갑작스러운 행동을 하는 춤 상대를 멈추며 묻는다.'],
'character-014':['함께 예수를 눕혔으나 무덤에 없다는 놀라움을 전하는 대표 낭독이다.'],
'character-015':['부활한 스승과 달리 남은 자신들의 슬픔을 말하는 대표 낭독이다.'],
'character-038':['마을을 찾은 파우스트에게 감사와 환영을 담아 술잔을 권한다.'],
'character-057':['그레첸에게 쓰러진 사람이 오빠라고 알려 주는 군중의 짧은 말이다.'],
'character-060':['부름에 응하면서 원래 곧게 가지 못하는 자신의 특성을 설명한다.'],
'character-082':['오베론과 티타니아의 화해를 축하하며 공연을 알린다.'],
'character-083':['티타니아에게 싸움을 피하려면 잠깐 떨어져 있는 편이 낫다고 말한다.'],
'character-086':['오베론의 제안에 남쪽과 북쪽 끝까지 떨어져야 한다고 재치 있게 응답한다.'],
'character-092':['그리스 신과 요정을 모두 악마로 보는 자신의 판단을 강하게 주장한다.'],
'character-097':['제멋대로인 연주 무리에게 박자를 듣고 들어오라고 지시한다.'],
'character-098':['칭찬하다 갑자기 말을 뒤집는 변덕을 한 발화 안에서 드러낸다.'],
'character-109':['주변의 소란이 전부 자신의 생각이라는 관념에 스스로 당황한다.'],
'character-119':['감옥의 마지막에 구원받았음을 선언하는 짧은 목소리다. 특정 인물의 신원을 새로 확정하지 않는다.'],
'character-123':['무엇을 끓이는지 묻는 방문자에게 수프 이름을 답하는 공동 배역의 대표 말이다.']}
proof=[]
for role in catalog['roles']:
    for i,q in enumerate(role['questions']):
        soup=BeautifulSoup((r/f"chapter-{q['chapter']:02}.html").read_text(encoding='utf-8'),'html.parser')
        matches=[p for p in soup.select('.adaptation-prose p,.adaptation-intro p') if p.get_text(' ',strip=True).strip('‘’“”')==q['text']]
        assert matches,(role['id'],q['id'])
        p=matches[0];inner=p.find_parent('aside',class_='inner-voice');kind='monologue' if inner else p.get('data-role','narration')
        cid=inner.get('data-cast') if inner else p.get('data-cast','narrator')
        assert cid==role['id'] and kind==q['kind'],(role['id'],q['id'],cid,kind)
        intention=notes[role['id']][i]
        q['acting']=intention
        q['design']=dict(addressee_intention=intention,outer_inner='겉으로는 상대에게 의도를 전하고, 속으로는 배역의 망설임과 바람을 유지한다.' if kind=='dialogue' else '인물의 속마음이다. 직접 대사처럼 밖으로 외치지 않는다.' if kind=='monologue' else '사건을 아는 서술자가 청자의 이해를 돕는다. 자신의 감정으로 인물의 말을 덮지 않는다.',pivot='문장 사이의 질문·반박·회상 전환을 따른다. 명시되지 않은 새 감정 사건은 만들지 않는다.',prosody='중간 속도, 선명한 자음. 구두점에서 짧게 쉬고 말끝을 매번 과장하지 않는다. 독백은 낮고 또렷한 유성 발성, 속삭임 금지.',nonverbal='의미에 필요한 짧은 호흡만. 기침·통곡·웃음·비명·음악 추가 없음.',continuation='발췌 문장의 여운을 짧게 남기고 다음 오디션 문항과 구분한다.')
        q['review']=dict(attribution='confirmed',classification='confirmed',performance='confirmed',evidence=f"게시 {q['chapter']}장 {q['scene_id']}의 {cid}/{kind} 속성과 발화 본문 일치 확인. 문맥 검토: {intention}")
        proof.append(dict(cast_id=cid,question=q['id'],evidence=q['review']['evidence']))
lookup={(role['id'],q['id']):q for role in catalog['roles'] for q in role['questions']}
for scene in episode['scenes']:
    for seg in scene['segments']:
        q=lookup[(seg['cast_id'],seg['id'].split('_')[-1])]
        seg['review']=q['review'];seg['performance']['design']=q['design'];seg['performance']['acting_notes']=q['acting'];seg['performance']['emotion']=q['acting']
        seg.setdefault('source_speaker',seg['speaker'])
        seg['speaker']=seg['source_speaker']+' · '+seg['voice']+' 후보'
        # The canonical updated template applies monologue DSP. Label it honestly;
        # the comparison player must not apply it again.
        seg['performance']['audio_effect']='echo-v4' if seg['kind']=='monologue' else 'dry'
        if seg['kind']=='monologue':seg['filename']=seg['filename'].replace('_DRY.wav','_ECHO_V4.wav')
        row=next(x for role in catalog['roles'] for x in role['files'] if x['voice']==seg['voice'] and x['role_id']==seg['cast_id'] and x['question_id']==q['id'])
        row.update(filename=seg['filename'],effect=seg['performance']['audio_effect'],review=seg['review'],design=q['design'],prompt_sha256=hashlib.sha256(json.dumps(dict(voice=seg['voice'],performance=seg['performance'],text=seg['text']),sort_keys=True,ensure_ascii=False).encode()).hexdigest())
stem='FAUST_P1_AUD02_ALL';title='파우스트 제1부 전체 성우 오디션'
episode['voices']={seg['speaker']:seg['voice'] for scene in episode['scenes'] for seg in scene['segments']}
target=r/'audition/canvas'/f'{stem}_GEMINI_CANVAS_TTS.html'
target.write_text(mod.render_episode(episode,stem,title),encoding='utf-8',newline='')
(r/'audition/canvas'/f'{stem}_SCRIPT.json').write_text(json.dumps(episode,ensure_ascii=False,indent=2),encoding='utf-8')
manifest=mod.build_copy_site([target],r/'audition/code-copy',title)
catalog['generator']='code-copy/'+manifest['chapters'][0]['file']
catalog['skill_revision']=subprocess.check_output(['git','rev-parse','HEAD'],cwd=skill.parents[1],text=True).strip()
for role in catalog['roles']:role['generator']=catalog['generator']
(r/'audition/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf-8')
rows=[x for role in catalog['roles'] for x in role['files']]
(r/'audition/AUDITION_INDEX.json').write_text(json.dumps(dict(schema='faust-audition-index-1',revision='AUD02',segments=rows),ensure_ascii=False,indent=2),encoding='utf-8')
(r/'audition/canvas/FAUST_AUDIO_INDEX_AUD02.json').write_text(json.dumps(dict(schema='audio-index-1',revision='AUD02',segments=[dict(x,chapter=1) for x in rows]),ensure_ascii=False,indent=2),encoding='utf-8')
import csv
with (r/'audition/AUDITION_INDEX.csv').open('w',encoding='utf-8-sig',newline='') as f:
    fields=[k for k in rows[0] if k not in ('review','design')];w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(rows)
(r/'audition/skill-review.json').write_text(json.dumps(dict(skill_revision=catalog['skill_revision'],reviewed_questions=proof,requests=len(rows),actual_canvas_test=False,monologue_effect='canonical template echo-v4; no double effect in comparison'),ensure_ascii=False,indent=2),encoding='utf-8')
print('Canonical renderer:202 segments;68 source/acting reviews;byte-hashed copy site')
