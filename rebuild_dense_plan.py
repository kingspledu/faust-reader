from pathlib import Path
import re,json,html
root=Path(__file__).parent;exec((root/'build.py').read_text(encoding='utf-8-sig').split("page='''")[0])
shots=[('close-up','클로즈업','표정과 시선의 변화를 포착'),('prop-detail','소품 디테일','원문에 등장한 손·책·의복·공간 재질 등 세부. 새 소품을 발명하지 않음'),('medium','중경','대화 상대와 몸짓의 관계'),('wide','전경','장소 전체와 인물의 상대 위치'),('high-angle','하이 앵글','인물과 주변 공간을 위에서 관찰'),('low-angle','로우 앵글','낮은 시점에서 인물·건축의 긴장감')]
index=json.loads((root/'art-bible/reference-index.json').read_text(encoding='utf-8'));existing=json.loads((root/'scene-manifest.json').read_text(encoding='utf-8'));result=[];chap_summ=[]
for ci in range(1,len(chapters)):
 t=chapters[ci]['text'];sent=[];start=0
 # Punctuation is a source sentence boundary; speaker headings and stage instructions are excluded from counts.
 depth=0;mask=list(t)
 for pos,ch in enumerate(t):
  if ch=='(':depth+=1
  if depth:mask[pos]=' '
  if ch==')' and depth:depth-=1
 clean=''.join(mask)
 for match in re.finditer(r'(?m)^\s*[A-ZÄÖÜẞ][A-ZÄÖÜẞ ,—-]*\.',clean):
  clean=clean[:match.start()]+' '*(match.end()-match.start())+clean[match.end():]
 for m in re.finditer(r'[.!?…]+[”’»"\)]*(?=\s|$)',clean):
  if clean[start:m.end()].strip():sent.append((start,m.end()));start=m.end()
 if start<len(t) and t[start:].strip():
  if sent:sent[-1]=(sent[-1][0],len(t))
  else:sent=[(0,len(t))]
 total=len(sent);sizes=[];remain=total
 while remain>4:
  take=3 if remain in [6,9] else 4;sizes.append(take);remain-=take
 if remain:sizes.append(remain)
 cursor=0;count=0
 for size in sizes:
  a=0 if cursor==0 else sent[cursor][0];b=sent[cursor+size-1][1];excerpt=t[a:b];sid=f'c{ci+1:02}-dense-{count+1:03}';shot=shots[count%len(shots)]
  cues=list(dict.fromkeys(re.findall(r'(?m)^\s*([A-ZÄÖÜẞ][A-ZÄÖÜẞ ,—-]*)[.(]',excerpt)))
  refs=[e['id'] for e in index['entries'] if ci+1 in e['chapter_numbers'] and e['image'] and (e['kind']=='place' or any(n.strip() in e['source_name'] for n in cues))]
  matches=[e['id'] for e in existing['scenes'] if e['chapter']==ci+1 and a<=e['char_offset']<b and e.get('status')=='published']
  result.append({'id':sid,'chapter':ci+1,'chapter_title':chapters[ci]['title'],'sentence_count':size,'source_start':a,'source_end':b,'source_text':excerpt,'shot':shot[0],'shot_ko':shot[1],'composition':shot[2],'source_speaker_cues':cues,'reference_ids':refs,'existing_images':matches,'status':'covered_review' if matches else 'needs_image','batch':None,'review_note':'운문 느낌표·줄임표·인용부호로 인한 경계는 생성 전에 문맥 검토. 발화 표제와 괄호 무대지시는 문장 수 제외.','exception':size<3})
  cursor+=size;count+=1
 assert ''.join(e['source_text'] for e in result if e['chapter']==ci+1)==t
 chap_summ.append({'chapter':ci+1,'title':chapters[ci]['title'],'source_sentences':total,'planned_images':count,'short_tail_exception':bool(sizes and sizes[-1]<3)})
for i,e in enumerate(result):e['batch']=f'dense-batch-{i//16+1:03}';e['tile_row']=(i%16)//4;e['tile_column']=i%4
payload={'version':2,'scope':'Chapters 2–28. Chapter 1 retains existing lyric-specific treatment.','sentence_policy':'3–4 source sentences, excluding uppercase speaker labels and parenthesized stage directions. Final short tail explicitly flagged. Poetry punctuation requires contextual review before generation.','shot_cycle':[{'id':a,'label':b,'guidance':c} for a,b,c in shots],'chapters':chap_summ,'scenes':result}
(root/'dense-scene-plan.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
page=['<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>파우스트 · 세부 장면 구성</title><style>body{max-width:960px;margin:40px auto;padding:0 22px;background:#f6f2e9;color:#302a27;font:16px/1.8 system-ui}a{color:#743c40}section{border-top:1px solid #cfc3b4;padding:24px 0}pre{white-space:pre-wrap;font:18px/1.8 Georgia}small{color:#827164}nav{display:flex;flex-wrap:wrap;gap:12px}h1{font-size:36px}</style><a href="index.html">원문 목차</a> · <a href="art-bible/">설정집</a><h1>2~28장 세부 장면 구성</h1><p>3~4문장 단위의 삽화 구성 초안입니다. 새 이미지가 게시된 목록이 아닙니다. 클로즈업 → 소품 디테일 → 중경 → 전경 → 하이 앵글 → 로우 앵글 순서로 교차합니다.</p><nav>']
page+= [f'<a href="#chapter-{c["chapter"]}">{c["chapter"]:02} {html.escape(c["title"])}</a>' for c in chap_summ];page+=['</nav>']
for c in chap_summ:
 page.append(f'<h2 id="chapter-{c["chapter"]}">{c["chapter"]:02} {html.escape(c["title"])}</h2><p>{c["source_sentences"]}문장 · {c["planned_images"]}개 세부 구간</p>')
 for e in [x for x in result if x['chapter']==c['chapter']]:
  page.append(f'<section id="{e["id"]}"><small>{e["id"]} · {e["sentence_count"]}문장 · {e["batch"]}</small><h3>{e["shot_ko"]}</h3><p>{e["composition"]}</p><p>{"기존 삽화가 있으나 범위·구도 재검토 필요" if e["existing_images"] else "추가 삽화 필요"}</p>'+('<p>장 끝 잔여 문장 예외</p>' if e['exception'] else '')+f'<details><summary>원문 구간</summary><pre lang="de">{html.escape(e["source_text"])}</pre></details></section>')
(root/'scene-plan.html').write_text(''.join(page)+'</html>',encoding='utf-8');print('Verified exact source coverage:',len(result),'segments across',len(chap_summ),'chapters; exceptions',sum(e['exception'] for e in result))
