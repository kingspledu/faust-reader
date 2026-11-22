"""Build source-verified casting auditions without changing published prose/cast."""
import csv, hashlib, html, json, re
from pathlib import Path
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'audition'; OUT.mkdir(exist_ok=True)
GEN=OUT/'canvas';GEN.mkdir(exist_ok=True)
skill=Path.home()/'.codex/skills/gemini-canvas-tts'
template=(skill/'assets/canvas-template.html').read_text(encoding='utf-8')
cast=json.loads((ROOT/'voice-cast.json').read_text(encoding='utf-8'))
source=json.loads((ROOT/'tts-canvas/FAUST_AUDIO_INDEX_V04.json').read_text(encoding='utf-8'))['segments']
sha=lambda text:hashlib.sha256(text.encode()).hexdigest()
primary={'narrator':['Charon','Sulafat','Schedar','Kore'],'character-010':['Orus','Charon','Alnilam','Iapetus'],'character-008':['Fenrir','Algieba','Umbriel','Achird'],'character-053':['Leda','Aoede','Zephyr','Vindemiatrix']}
alternates={'Rasalgethi':['Schedar','Sadaltager'],'Algieba':['Gacrux','Achird'],'Puck':['Sadachbia','Umbriel'],'Achird':['Iapetus','Schedar'],'Leda':['Zephyr','Aoede'],'Laomedeia':['Autonoe','Despina'],'Sadaltager':['Alnilam','Gacrux'],'Algenib':['Fenrir','Rasalgethi'],'Schedar':['Charon','Orus'],'Gacrux':['Algenib','Algieba'],'Sulafat':['Kore','Vindemiatrix'],'Alnilam':['Orus','Sadaltager'],'Vindemiatrix':['Sulafat','Achernar'],'Iapetus':['Charon','Schedar'],'Orus':['Alnilam','Iapetus'],'Kore':['Sulafat','Aoede'],'Zubenelgenubi':['Puck','Achird']}
preferred={'narrator':[1,13,24,28],'character-010':[4,7,16,28],'character-008':[7,3,15,28],'character-053':[10,15,19,28]}
notes={'narrator':['처음 듣는 중학생에게 상황을 친절하게 소개한다. 뉴스/광고/과한 동화 구연 억양 금지.','대화 사이에서 상황을 짚되 인물 목소리를 흉내 내지 않는다.','긴박한 장면도 단어를 선명하게. 청자에게 공포를 강요하지 않는다.','슬픔을 절제하고 인물의 행동을 차분하게 전달한다.'], 'character-010':['학문에 대한 회의. 답을 몰라 답답하지만 지적이고 또렷한 질문을 유지한다.','메피스토에게 반박한다. 상대 말을 받아치는 일상 대화 리듬. 고함 금지.','그레첸의 반응을 살피며 말한다. 부드럽되 과장된 로맨스 낭송 금지.','절박함과 망설임. 급해져도 말이 뭉개지지 않고 같은 음색을 유지한다.'],'character-008':['파우스트에게 느긋한 반말. 상대가 진지할수록 여유를 보인다.','주 앞에서 공손한 척 빈정거린다. 과장된 악당 웃음 금지.','마르테 앞에서 사교적으로 예의 있는 척한다. 같은 인물의 위장이다.','긴박한 상황에서도 차갑게 현실을 짚는다. 괴물 포효 금지.'],'character-053':['낯선 사람의 접근을 단호히 거절한다. 유아 같은 목소리 금지.','가까워진 상대에게 자연스럽게 말한다. 수줍음만으로 인물을 축소하지 않는다.','관계와 믿음을 진지하게 묻는다. 상대에게 답을 듣고 싶은 목적을 분명히 한다.','두려움과 결심이 함께 있다. 통곡만으로 모든 말을 처리하지 않는다.']}
roles=[];pending=[];audit=[];allrows=[]
for cid,p in cast['profiles'].items():
    units=[x for x in source if x['cast_id']==cid]
    if not units:
        pending.append(dict(cast_id=cid,name=p['display_name'],mode=p.get('mode'),status='non-speaking-registered' if p.get('mode')=='non_speaking' else 'source-review-required'));continue
    tier='primary' if cid in primary else 'support' if len(units)>=3 else 'minor'
    n=4 if tier=='primary' else 2 if tier=='support' else 1
    selected=[]
    for ch in preferred.get(cid,[]):
        options=[x for x in units if x['chapter']==ch and x['kind']!='monologue']
        selected.append(next((x for x in options if 25<=len(x['text'])<=230),options[0] if options else units[0]))
    if not selected:
        selected=[units[0]]
        if n==2:selected.append(next((x for x in reversed(units) if x['kind']!=units[0]['kind']),units[-1]))
    voices=primary.get(cid,[p['voice_name']]+alternates.get(p['voice_name'],['Charon','Kore'])[:2 if tier=='support' else 1])
    assert len(voices)==len(set(voices))
    questions=[]
    for i,s in enumerate(selected):
        soup=BeautifulSoup((ROOT/f"chapter-{s['chapter']:02}.html").read_text(encoding='utf-8'),'html.parser')
        texts=[q.get_text(' ',strip=True).strip('‘’“”') for q in soup.select('article .adaptation-prose p, article .adaptation-intro p') if 'voice-label' not in q.get('class',[])]
        assert sha(s['text'])==s['text_sha256'] and s['text'] in texts,(cid,s['segment_id'])
        note=notes[cid][i] if cid in notes else '본문에서 상대에게 무엇을 말하려는지 분명히 전달한다. 앞뒤 장면과 배역의 페르소나를 따른다.'
        if s['kind']=='monologue':note+=' 가까운 사람에게 나직하게 말하되 유성 발성과 또렷한 자음을 유지. 속삭임 금지.'
        questions.append(dict(id=f'Q{i+1:02}',text=s['text'],source_segment_id=s['segment_id'],chapter=s['chapter'],scene_id=s['scene_id'],kind=s['kind'],text_sha256=s['text_sha256'],acting=note))
    segments=[];rows=[]
    for vi,voice in enumerate(voices):
        for q in questions:
            candidate=f'{cid}:{voice}'; filename=f"FAUST_P1_AUD02_{cid.upper().replace('-','_')}_{voice.upper()}_{q['id']}_T01_DRY.wav"
            performance=dict(emotion=q['acting'],intensity=.45,pace='medium',delivery='natural voiced speech',pause_after_ms=0,character_persona=p.get('persona','장면 속 상대에게 의도를 전달하는 또렷한 한국어 발화'),character_state='오디션: 같은 배우의 음색 유지',acting_notes=q['acting']+' 본문 단어를 추가·생략·반복하지 않는다.',mic_direction='잔향 없는 보통 발성. 독백은 나직하되 속삭임·ASMR·과도한 숨소리 금지.',nonverbal='의미에 맞는 자연스러운 호흡만. 웃음·기침·울음·비명·음악을 임의로 추가하지 않는다.',cough_rule='화자 이름·연기 지시문을 낭독하지 않는다.',audio_effect='dry')
            seg=dict(id=f"{cid}_{voice}_{q['id']}",speaker=p['display_name'],kind=q['kind'],cast_id=cid,text=q['text'],scene_id=q['scene_id'],filename=filename,voice=voice,model=cast['model'],cast_revision='AUD02',cast_sha256=sha(json.dumps(cast,sort_keys=True,ensure_ascii=False)),performance=performance)
            segments.append(seg)
            row=dict(role_id=cid,candidate_id=candidate,voice=voice,question_id=q['id'],take_id='T01',filename=filename,effect='dry',model=cast['model'],source_segment_id=q['source_segment_id'],chapter=q['chapter'],scene_id=q['scene_id'],text=q['text'],text_sha256=q['text_sha256'],prompt_sha256=sha(json.dumps(dict(voice=voice,performance=performance,text=q['text']),sort_keys=True,ensure_ascii=False)))
            rows.append(row);allrows.append(row)
    episode=dict(schema_version='canvas-tts-1',chapter=1,title=p['display_name']+' 오디션',language='ko-KR',revision='AUD02',model=cast['model'],execution_mode='canvas-host',cast_revision='AUD02',cast_sha256=segments[0]['cast_sha256'],voices={v:v for v in voices},scenes=[dict(scene_id=cid,title=p['display_name'],segments=segments)])
    encoded=json.dumps(episode,ensure_ascii=False).replace('<','\\u003c')
    page=template.replace('__EPISODE_JSON__',encoded).replace('__FILE_STEM__','FAUST_P1_AUD02_'+cid).replace('__TITLE_HTML__',html.escape(p['display_name']+' · 성우 오디션'))
    page=page.replace("turn.kind==='monologue');","false);").replace("turns[index].kind==='monologue'?'echo-v4':'dry'","'dry'")
    (GEN/(cid+'.html')).write_text(page,encoding='utf-8')
    (GEN/(cid+'.json')).write_text(json.dumps(episode,ensure_ascii=False,indent=2),encoding='utf-8')
    roles.append(dict(id=cid,name=p['display_name'].replace('마르가레테 / 그레첸','그레첸'),tier=tier,count=len(units),persona=p.get('persona','장면과 상대를 고려한 또렷하고 자연스러운 한국어 발화'),voices=voices,questions=questions,files=rows,generator='canvas/'+cid+'.html'))
    audit.append(dict(cast_id=cid,status='selected-transcripts-match-published-prose',checked=len(questions)))
roles.sort(key=lambda x:({'primary':0,'support':1,'minor':2}[x['tier']],-x['count']))
catalog=dict(revision='AUD02',model=cast['model'],roles=roles,pending=pending,requests=len(allrows),audio_status='not-generated',review_status='Current TTS roles only; German-source speaker completeness not yet certified')
(OUT/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'AUDITION_INDEX.json').write_text(json.dumps(dict(schema='faust-audition-index-1',revision='AUD02',segments=allrows),ensure_ascii=False,indent=2),encoding='utf-8')
with (OUT/'AUDITION_INDEX.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(allrows[0]));w.writeheader();w.writerows(allrows)
(OUT/'verification.json').write_text(json.dumps(dict(source_text_checks=audit,roles=len(roles),pending=len(pending),requests=len(allrows),unique_files=len({x['filename'] for x in allrows}),actual_audio_generated=False),ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Built {len(roles)} role HTMLs, {len(allrows)} requests; {len(pending)} source-review/non-speaking entries')
