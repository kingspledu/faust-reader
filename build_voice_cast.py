from pathlib import Path
import json,html,hashlib
r=Path(__file__).parent
voices=dict(Zephyr='밝음',Puck='활기',Charon='설명에 적합',Kore='단단함',Fenrir='흥분감',Leda='젊음',Orus='단단함',Aoede='산뜻함',Callirrhoe='느긋함',Autonoe='밝음',Enceladus='숨결',Iapetus='명료함',Umbriel='느긋함',Algieba='매끈함',Despina='매끈함',Erinome='명료함',Algenib='거침',Rasalgethi='설명에 적합',Laomedeia='활기',Achernar='부드러움',Alnilam='단단함',Schedar='균일함',Gacrux='성숙함',Pulcherrima='적극적',Achird='친근함',Zubenelgenubi='편안함',Vindemiatrix='온화함',Sadachbia='생동감',Sadaltager='박식함',Sulafat='따뜻함')
# 음성의 공식 특성은 위 표. 아래 높이·나이감·성격은 작품용 연출 지시이며 실제 샘플 청취 전 배역안이다.
spec='''1|Rasalgethi|중저음, 빠른 판단과 실무 감각. 관객과 공연 준비를 챙기며 짧게 재촉한다.
2|Algieba|차분한 중음, 작품을 소중히 여기는 작가. 설명할 때 천천히, 자존심을 건드리면 분명하게 말한다.
3|Puck|가벼운 중음, 재치 있는 현장 배우. 상대의 진지함을 깨지 않으면서 짧게 받아친다.
4|Iapetus|맑고 안정된 중음. 태양과 질서를 경이롭게 바라보며 긴 문장도 또렷하게 전한다.
5|Erinome|밝고 투명한 중음. 지구와 바다의 움직임을 넓은 호흡으로 전한다.
6|Alnilam|단단한 중저음. 폭풍의 힘을 장중하게 전하되 고함을 쓰지 않는다.
7|Iapetus|대천사 셋의 공동 발화. 라파엘·가브리엘·미카엘 배역을 유지하고 임의의 새 인물로 만들지 않는다.
8|Fenrir|거칠지 않은 중저음, 여유 있고 능청스러운 관찰자. 파우스트에게는 느긋한 반말로 약점을 찌른다. 마르테·낯선 사람에게는 예의 있는 척하는 해요체. 주 앞에서는 정중하되 빈정거린다. 웃음은 가끔 작게, 킬킬킬 반복·괴물 포효·특정 배우 성대모사 금지.
9|Sadaltager|낮고 따뜻한 권위. 판단을 서두르지 않으며 차분하게 질문하고 단언한다. 웅장한 효과음 없이 보통 발성.
10|Orus|지적이고 또렷한 중저음. 파고드는 질문과 조급한 감정이 공존한다. 메피스토에게는 반말, 낯선 사람에게는 존댓말. 그레첸에게는 관계가 가까워지는 정도에 따라 부드럽게 변한다. 회춘 전후에도 같은 배우를 유지한다.
11|Alnilam|깊고 단단한 저음. 인간과 다른 규모의 존재를 느리게 표현하되 악마 포효·기계 변조 금지.
12|Achird|친근한 중음, 배우려는 열의가 앞선 조수. 존중하는 해요체와 조심스러운 질문, 설명에서는 약간 빨라진다.
13|Vindemiatrix|밝고 부드러운 천사 합창 대표 낭독. 가사로 표시된 부분만 리듬을 주고 합창 음원을 가장하지 않는다.
14|Sulafat|따뜻한 여인들 공동 낭독. 상실과 놀람을 또렷하게, 과한 울음 없이.
15|Gacrux|낮고 절제된 제자들 공동 낭독. 남겨진 슬픔과 그리움을 천천히 전한다.
16|Puck|일에서 벗어난 청년 무리. 밝고 편안한 반말, 서로 길을 권하며 짧게 끊는다.
17|Achird|5장 익명 응답 무리. 주변 무리와 대조되는 가벼운 반응. 문맥별 다른 사람이며 고유 인물로 합치지 않는다.
18|Puck|첫 나들이 무리, 들뜬 중음. 행선지를 자신 있게 권한다.
19|Puck|첫 직공 청년. 활기 있는 중음과 빠른 제안, 장난기.
20|Achird|두 번째 직공 청년. 편안한 중음, 현실적인 반박과 길 사정에 대한 투덜거림.
21|Sadachbia|두 번째 나들이 무리. 첫 무리보다 높고 빠른 반응.
22|Zubenelgenubi|세 번째 직공 청년. 느긋한 중음, 남들과 함께 가고 싶은 마음이 앞선다.
23|Iapetus|네 번째 직공 청년. 짧고 명료하게 장소를 확인한다.
24|Orus|다섯 번째 직공 청년. 약간 낮고 호기로운 목소리, 허세와 장난을 구별한다.
25|Laomedeia|하녀 역할. 생기 있는 중음, 친구를 설득하며 일상적인 말투.
26|Kore|첫 번째 하녀. 단단하고 또렷한 말끝, 서운함과 고집을 감추지 않는다.
27|Puck|5장의 학생 무리. 들뜬 나들이 말투이며 7장 신입생과 별개 배역.
28|Autonoe|시민 집안의 처녀. 자존심이 상해 툴툴대는 중음, 계층 편견을 서술자의 판단처럼 낭독하지 않는다.
29|Achird|두 번째 학생. 조심스럽고 친근한 중음, 마음에 둔 사람 앞에서 속도가 늦어진다.
30|Fenrir|첫 번째 학생. 들뜬 중음, 친구를 재촉하는 짧은 반말. 메피스토와 달리 조급하고 가벼운 리듬.
31|Rasalgethi|첫 번째 시민. 시장과 도시 사정을 불평하는 중저음, 생활인의 투덜거림.
32|Achernar|거지. 지친 낮은 발성으로 부탁하되 힘없는 속삭임이나 희화화 금지.
33|Schedar|두 번째 시민. 균일한 중저음, 전쟁 소문을 한발 떨어져 이야기한다.
34|Alnilam|세 번째 시민. 단단한 중음, 멀리서 벌어지는 전쟁을 자기 안락과 대비한다.
35|Gacrux|늙은 여자. 성숙한 중저음, 친근하게 다가가며 예언을 흥정하듯 말한다. 목을 긁는 과장 금지.
36|Laomedeia|아가테. 친구와 속마음을 나누는 밝은 중음, 기대와 경계가 교차한다.
37|Alnilam|군인들 대표. 힘 있는 중저음과 행진 리듬, 전쟁의 허세를 과도한 고함 없이 표현한다.
38|Gacrux|늙은 농부. 느리고 따뜻한 중저음, 감사의 뜻을 소박하게 전한다.
39|Achird|5장의 공동 발화. 해당 군중의 반응이며 새 한 사람으로 만들지 않는다.
40|Callirrhoe|6장의 정령들. 부드러운 중음과 은근한 유혹. 속삭임만으로 발성하지 않는다.
41|Vindemiatrix|7장의 정령 합창. 위로하는 듯 다정한 리듬, 악마의 제안과 이어지는 모호함.
42|Leda|7장의 신입 학생. 젊고 맑은 중음, 기대에서 혼란으로. 모르는 것을 묻는 존댓말.
43|Puck|프로슈. 빠르고 장난기 많은 중음, 분위기를 띄우며 남을 놀린다.
44|Rasalgethi|브란더. 묵직한 중저음, 노래를 주도하고 웃음 뒤에 불쾌함을 숨기지 않는다.
45|Algenib|지벨. 거친 중저음과 툭툭 던지는 말, 놀라면 짧고 강해진다. 포효하지 않는다.
46|Schedar|알트마이어. 비교적 느리고 낮은 목소리, 투덜거리는 농담과 어지러움을 구분한다.
47|Puck|술집 합창 대표. 흥에 겨운 리듬, 실제 다중 합창을 생성한 것으로 간주하지 않는다.
48|Rasalgethi|술집 모두의 반응. 기존 네 배역의 공동 반응이며 별개 인격이 아니다.
49|Sadachbia|마녀 부엌 동물들의 공동 발화. 빠르고 엉뚱한 리듬, 알아들을 수 있게 발음한다.
50|Puck|수컷 원숭이. 재잘거리고 계산적인 중음, 엉뚱한 말도 당당히 한다. 동물 소리로 단어를 덮지 않는다.
51|Sadachbia|수컷·암컷 원숭이 공동 발화. 두 배역의 정체성을 유지하며 함께 하는 반응만 담당한다.
52|Gacrux|마녀. 낮고 까칠한 목소리, 호통에서 비굴한 환대로 급변한다. 주문은 단어를 정확히, 과한 비명 금지.
53|Leda|그레첸. 맑고 자연스러운 중음, 어린아이 흉내 금지. 처음에는 조심스러운 해요체, 친밀해지며 부드러워진다. 감정이 깊어져도 말뜻을 또렷하게 유지한다.
54|Sulafat|마르테. 성숙하고 따뜻한 중음, 생활감 있는 빠른 질문. 슬픔·분노·호기심의 전환이 뚜렷하다.
55|Laomedeia|리스헨. 빠르고 호기심 많은 중음, 소문을 신나게 전하며 상대 반응을 떠본다.
56|Alnilam|발렌틴. 단단한 중저음, 군인의 자존심과 가족에 대한 분노. 고함보다 눌러 말하는 힘.
57|Achird|거리 민중 대표. 놀람과 수군거림을 구분하며 대사를 명확히.
58|Algenib|악령. 낮고 건조하며 집요한 추궁, 지나친 공포 효과나 속삭임 금지.
59|Rasalgethi|대성당 합창 대표. 장중하고 균일한 리듬, 라틴어는 본문이 있을 때만.
60|Sadachbia|도깨비불. 가볍고 빠르게 방향을 바꾸는 중고음. 길 안내는 분명하게 말한다.
61|Orus|파우스트·메피스토·도깨비불 공동 발화. 구성원 기존 목소리를 순서대로 배정하는 그룹이며 새 인물이 아니다.
62|Gacrux|마녀들 대표. 들뜬 거친 리듬, 발음이 뭉개지지 않게 한다.
63|Iapetus|24장 익명 목소리. 또렷하고 짧은 호출, 정체를 임의로 확정하지 않는다.
64|Callirrhoe|24장 합창 대표. 산길의 집단 리듬, 앞뒤 마녀 무리와 문맥을 구분한다.
65|Autonoe|마녀 합창 대표. 날카롭고 활기찬 중음, 가사와 지시문을 구분한다.
66|Algenib|마법사들 반쪽 합창. 낮고 거친 리듬, 다른 반쪽과 대비한다.
67|Laomedeia|나머지 반쪽 합창. 밝고 빠른 응답 리듬.
68|Sadachbia|여러 목소리 대표. 짧은 호출을 선명하게, 가짜 다중 합성 효과 금지.
69|Alnilam|두 합창단 공동 발화. 낮은 안정감으로 합쳐지는 구절을 전달한다.
70|Zephyr|반쪽 마녀. 급하고 조급한 중고음, 뒤따라가려는 마음.
71|Autonoe|마녀들의 합창. 들뜬 리듬과 정확한 자음, 끊임없는 비명 금지.
72|Alnilam|장군. 명령에 익숙한 낮은 목소리, 지난 권위를 아쉬워한다.
73|Sadaltager|대신. 점잖고 계산적인 중저음, 자기 이익을 당연하게 말한다.
74|Pulcherrima|벼락출세자. 과시하는 중음과 앞서는 말, 잘난 척을 살린다.
75|Algieba|작가. 자의식 강한 중음, 불만을 논리처럼 늘어놓는다.
76|Gacrux|잡동사니 파는 마녀. 낮고 재빠른 장사 말투, 물건을 권할 때 신이 난다.
77|Aoede|젊은 춤 상대. 산뜻한 중음, 짓궂게 응수한다. 유혹을 과도하게 성적 발성으로 표현하지 않는다.
78|Gacrux|늙은 춤 상대. 성숙한 낮은 목소리, 농담을 익숙하게 받아친다.
79|Sadaltager|프로크토판타스미스트. 권위적인 중저음, 믿지 않는 것을 길게 따지는 말투.
80|Achird|세르비빌리스. 손님을 이끄는 공손하고 빠른 안내 말투.
81|Rasalgethi|극장 감독. 실무적인 중저음, 공연 진행을 짧고 명료하게 지시한다.
82|Iapetus|전령. 맑은 중음, 청중에게 전달할 공지를 또렷하게.
83|Orus|오베론. 왕다운 차분한 중저음, 명령보다 확신으로 이끈다.
84|Puck|퍽. 장난기 많은 빠른 중음, 짧은 풍자를 즐긴다. 특정 작품 캐릭터 흉내 금지.
85|Aoede|아리엘. 가볍고 유려한 중음, 공기처럼 이어지는 리듬.
86|Kore|티타니아. 단단하고 명료한 중음, 여왕의 자신감과 장난기.
87|Rasalgethi|오케스트라 총주 표제의 의인화된 발언. 대사가 있을 때만 장중히 낭독하며 음악 음원을 대신 만들지 않는다.
88|Erinome|독주·독창 표제의 발언. 맑은 중음으로 단독 구절을 낭독한다. 악기 소리를 흉내 내지 않는다.
89|Zephyr|형성 중인 정령. 조심스럽고 가벼운 중고음, 막 모습을 찾는 불확실함.
90|Leda|한 쌍의 연인 대표. 다정하고 젊은 중음, 서로 다른 발화로 나뉘면 별도 구성원 ID를 쓴다.
91|Achird|호기심 많은 여행자. 친근한 중음, 새로운 광경을 보고 바로 질문한다.
92|Alnilam|정통주의자. 흔들림 없는 단정적인 중저음, 권위를 의심하지 않는다.
93|Algieba|북방 예술가. 약간 느린 중음, 자기 취향을 진지하게 평가한다.
94|Erinome|순수주의자. 선명하고 깐깐한 말끝, 기준에 어긋나는 것을 못마땅해한다.
95|Laomedeia|젊은 마녀. 빠르고 밝은 중음, 들뜬 자신감.
96|Gacrux|나이 든 부인. 성숙한 중저음, 세태를 평가하는 단정한 말투.
97|Schedar|악장. 균일하고 정확한 중저음, 박자와 질서를 챙긴다.
98|Zubenelgenubi|풍향계. 말의 방향이 쉽게 바뀌는 편안한 중음, 변덕을 리듬으로 표현한다.
99|Iapetus|크세니엔. 짧고 날카로운 풍자 구절, 또렷하게 말하고 설명을 덧붙이지 않는다.
100|Rasalgethi|헤닝스. 자기 평가에 확신이 강한 중저음, 풍자극 배역임을 유지한다.
101|Algieba|무사게트. 예술을 이끄는 듯 우아한 중음, 과장된 노래 발성 금지.
102|Sadaltager|지난 시대의 천재. 성숙한 중저음, 인정받던 시절의 자부심과 불만.
103|Iapetus|두루미 의인화. 가늘고 또렷한 중고음, 실제 새 울음으로 대사를 덮지 않는다.
104|Zubenelgenubi|세속의 자식. 느긋하고 실용적인 중음, 거창한 논쟁을 가볍게 받아친다.
105|Aoede|무용수. 산뜻한 중음과 유연한 리듬, 움직임에 맞춘 짧은 말.
106|Kore|무용 교사. 또렷하고 단호한 중음, 동작을 가르치듯 정확히 끊는다.
107|Erinome|바이올린 연주자. 맑고 예민한 중음, 악기 소리를 대신 흉내 내지 않는다.
108|Alnilam|독단주의자. 낮고 단정적인 말끝, 자기 전제를 의심하지 않는다.
109|Algieba|관념론자. 사색적인 중음, 머릿속 생각을 따라 차근차근 말한다.
110|Orus|실재론자. 단단한 중저음, 손에 잡히는 근거를 강조한다.
111|Vindemiatrix|초자연주의자. 온화하고 경이로운 중음, 보이지 않는 힘을 확신한다.
112|Schedar|회의론자. 건조한 중저음, 질문 끝을 짧게 끊으며 판단을 미룬다.
113|Sadachbia|재주 좋은 무리. 활기차고 빠른 공동 반응, 리듬이 가볍다.
114|Zubenelgenubi|서투른 무리. 조금 늦고 머뭇거리는 공동 반응, 지적 능력을 희화화하지 않는다.
115|Zephyr|도깨비불 무리. 가벼운 중고음과 빠른 리듬, 24장 안내자와 별도 그룹.
116|Autonoe|별똥별. 밝고 짧게 튀는 중고음, 긴 잔향으로 단어를 흐리지 않는다.
117|Algenib|육중한 무리. 낮고 느린 공동 반응, 과도한 괴물 소리 금지.
118|Schedar|오케스트라 표제의 의인화 발언. 본문이 있는 구절만 명료하게 낭독하고 음악을 생성하지 않는다.
119|Vindemiatrix|28장 위에서 들리는 목소리. 따뜻하고 확고한 구원의 말, 메피스토와 대비되는 안정감.
120|Despina|릴리트. 차분하고 매끈한 중저음의 연출안. 원문에 직접 발언이 없으면 새 대사를 만들지 않는다.
121|Leda|그레첸의 환영. 실제 그레첸과 같은 음색. 원문에 직접 대사가 없는 환영에 새 목소리를 주지 않는다.
122|Fenrir|메피스토의 푸들 형태. 인간 대사 없음. 짖음·신음은 원문에 필요할 때 별도 효과 자산으로 다룬다.
123|Laomedeia|암컷 원숭이. 빠르고 명료한 중고음, 장난과 당황이 쉽게 바뀐다. 새끼들은 별도 대사가 없으면 목소리를 추가하지 않는다.
124|Vindemiatrix|천상의 군대. 직접 가사가 있을 때만 부드러운 대표 낭독, 배경 군중 소리를 임의로 생성하지 않는다.
125|Achird|농민들과 춤추는 사람들. 친근한 중음과 춤의 리듬, 원문 무리별 구분 유지.
126|Rasalgethi|대성당 회중. 조용하고 장중한 공동 낭독, 실제 다중 합창 음원으로 간주하지 않는다.
127|Orus|검은 말 두 마리. 인간 대사 없음. 원문에 없는 말소리나 의인화 독백 금지.
128|Gacrux|처형장 주변 마녀 무리. 원문에 발언이 있을 때만 거친 중저음, 배경 공포 음원 생성 금지.'''
entries=[e for v in json.loads((r/'art-bible/reference-index.json').read_text(encoding='utf-8')).values() if isinstance(v,list) for e in v if isinstance(e,dict) and e.get('kind')=='character']
specs={int(a):(b,c) for a,b,c in (line.split('|',2) for line in spec.splitlines())};assert len(entries)==len(specs)==128
profiles={}
for e in entries:
 n=int(e['id'][-3:]);voice,persona=specs[n];assert voice in voices
 mode='non_speaking' if n in (120,121,122,127) else 'joint_existing' if n in (7,51,61) else 'collective_representative' if any(w in e['name'] for w in ['합창','무리','모두','공동','총주','오케스트라','군대','회중']) else 'individual'
 profiles[e['id']]=dict(id=e['id'],display_name=e['name'],source_name=e.get('source_name'),chapters=e.get('chapter_numbers',[]),voice_name=voice,persona=persona,mode=mode,pronunciation='한국어 표준 발음. 이름은 메피스토·그레첸. 원문 언어 구절만 해당 언어를 발음한다.',pace='medium',identity_rule='감정·장·독백 여부가 달라져도 음색 정체성 유지. 음높이와 속도는 연출 지시이며 API 수치 옵션이 아님.',audition_status='not_auditioned')
profiles['narrator']=dict(id='narrator',display_name='나레이터',voice_name='Charon',persona='중학생에게 이야기를 들려주는 따뜻하고 또렷한 전지적 서술자. 인물의 마음과 상황을 친절하게 잇되 대사를 대신 설명하지 않는다. 본문 끝에 교훈을 덧붙이지 않는다.',mode='narrator',audition_status='not_auditioned')
profiles['dedication-poet']=dict(id='dedication-poet',display_name='헌시의 시인',voice_name='Algieba',persona='지난 삶과 사람들을 돌아보는 이름 없는 창작자. 조용하고 절제된 그리움. 2장 극작가와 같은 인물이라고 단정하지 않는다.',mode='individual',audition_status='not_auditioned')
extras={'목동':('extra-shepherd','Achird','소박하고 친근한 중음, 들판의 춤 노래를 자연스럽게 전달한다.'),'춤추는 사람':('extra-dancer','Achird','친근하고 들뜬 중음, 상대의 반응에 맞춰 짧게 말한다.'),'춤추는 아가씨':('extra-dancer-woman','Aoede','산뜻하고 또렷한 중음, 춤 상대에게 재치 있게 응수한다.')}
for name,(id,v,persona) in extras.items():profiles[id]=dict(id=id,display_name=name,voice_name=v,persona=persona,mode='individual',audition_status='not_auditioned')
alias={'나레이터':'narrator','시인':'character-002','지배인':'character-001','희극 배우':'character-003','라파엘':'character-004','가브리엘':'character-005','미카엘':'character-006','메피스토':'character-008','메피스토펠레스':'character-008','주':'character-009','하느님':'character-009','파우스트':'character-010','지령':'character-011','바그너':'character-012','천사들의 합창':'character-013','여인들의 합창':'character-014','제자들의 합창':'character-015','직공 청년':'character-019','두 번째 직공 청년':'character-020','세 번째 직공 청년':'character-022','네 번째 직공 청년':'character-023','다섯 번째 직공 청년':'character-024','다른 하녀':'character-025','첫 번째 하녀':'character-026','시민의 딸':'character-028','두 번째 학생':'character-029','첫 번째 학생':'character-030','첫 번째 시민':'character-031','거지':'character-032','두 번째 시민':'character-033','세 번째 시민':'character-034','노파':'character-035','아가테':'character-036','군인':'character-037','늙은 농부':'character-038','정령들':'character-040','정령들의 합창':'character-041','학생':'character-042','프로슈':'character-043','브란더':'character-044','지벨':'character-045','알트마이어':'character-046','수컷 원숭이':'character-050','마녀':'character-052','그레첸':'character-053','그레트헨':'character-053','마르가레테':'character-053','마르테':'character-054','암컷 원숭이':'character-123',**{k:v[0] for k,v in extras.items()}}
for e in entries:alias.setdefault(e['name'],e['id'])
d=dict(schema='faust-voice-cast-1',revision='CAST-2026-11-18',model='gemini-2.5-flash-preview-tts',language='ko-KR',verified_date='2026-11-18',documentation=['https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-preview-tts','https://ai.google.dev/gemini-api/docs/speech-generation#voices'],prebuilt_voices=voices,profiles=profiles,aliases=alias,chapter_alias_overrides={'1':{'시인':'dedication-poet'}},notes=['128개 참조 항목에는 집단·공동발화·비발화 형상도 포함되며128명의 독립 인물이 아님.','음색은30종을 재사용한다. 동시 장면의 주요인물은 구별되는 음색을 우선 배정한다.','구간별 단일 화자 생성 후 합쳐 다수 화자를 지원한다. 합창은 대표 낭독이며 실제 합창 생성 아님.','API 모델의 음색 이름과 페르소나는 성우 연출안이며 실존 성우·배우를 지정하거나 복제하지 않는다.','실제 모델 호출·음성 생성·청취는 미실행. 계정·환경별 가용성과 발음·음색은 실제 청취 후 확인해야 함.'])
path=r/'voice-cast.json';path.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
md=['# 파우스트 오디오북 공통 배역표',f'모델: `{d["model"]}` · 배역표: `{d["revision"]}`','기본 음성은 공식30종에서 선택했다. 아래 나이감·음높이·성격은 작품용 연출 지시이며 청취로 검증된 음색 평가는 아니다. 같은 음색을 쓰는 조연은 말속도·리듬·말끝으로 구분한다. 비발화 인물에게 새 대사를 만들지 않는다.','일반 대사와 나레이션은 원음, 마음속 독백만 나직한 보통 말소리와 리버브·짧은 에코. 속삭임·과한 웃음·울음·기침은 넣지 않는다.','|ID|배역|음성|연기 페르소나|처리|','|---|---|---|---|---|']
for p in profiles.values():md.append(f'|{p["id"]}|{p["display_name"]}|{p["voice_name"]}|{p["persona"]}|{p["mode"]}|')
md.extend(['','공식 문서: '+ ' · '.join(d['documentation']),'','전체 구간은 이 배역표를 참조한다. 모르는 화자는 나레이터 음색으로 몰래 대체하지 않고 빌드 오류로 처리한다. 형상·나이·옷차림이 바뀌어도 같은 인물 ID를 사용한다. 파우스트의 회춘은 동일 Orus 배우를 유지하고 피로·말속도만 조절한다. 그레첸의 환영도 동일 Leda 배우이며 원문에 없는 환영 대사는 만들지 않는다.'])
(r/'VOICE_CAST.md').write_text('\n\n'.join(md),encoding='utf-8')
body=''.join(f'<article id="{p["id"]}"><h2>{html.escape(p["display_name"])}</h2><p><code>{p["id"]}</code> · {p["voice_name"]} · {p["mode"]}</p><p>{html.escape(p["persona"])}</p></article>' for p in profiles.values())
(r/'voice-cast.html').write_text('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>파우스트 성우·연기 설정</title><style>body{max-width:850px;margin:auto;padding:24px;background:#f6f2e9;color:#292b26;font:18px/1.9 system-ui}article{padding:22px 0;border-bottom:1px solid #ccc}h2{font-size:22px}input{font:inherit;width:100%;padding:12px;position:sticky;top:8px}a{color:inherit}</style><h1>파우스트 성우·연기 설정</h1><p>Gemini 2.5 Flash Preview TTS · 고정 음색과 배역별 연기 지침. 실제 생성·청취 전 배역안입니다. 집단과 비발화 형상을 포함하며 모든 항목이 독립된 대사 배역은 아닙니다.</p><p><a href="index.html">독서 목차</a> · <a href="voice-cast.json">기계 참조 JSON</a></p><input id="search" aria-label="배역 찾기" placeholder="이름·음색·ID로 찾기">'+body+'<script>document.getElementById("search").oninput=e=>document.querySelectorAll("article").forEach(a=>a.hidden=!a.textContent.toLowerCase().includes(e.target.value.toLowerCase()));</script></html>',encoding='utf-8')
print('Voice cast:',len(entries),'reference entries + narrator, dedication poet and3 scoped speakers;',len(profiles),'profiles')
