"""Publish frozen reviewed inputs; never edit editorial decisions or performances."""
import hashlib,json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[2];work=Path(__file__).parent
sys.path.insert(0,str(root/'.tools/audiobook-reader-skill/assets/gemini-canvas-tts/scripts'))
from build import generate
from copy_site import build_copy_site
from sentence_contract import validate_sentence
from voice_identity import validate_voice_identity

def validate_document(doc,cast):
 if doc['cast_revision']!=cast['revision']:raise ValueError('Cast revision changed: review required')
 ids=set()
 for s in doc['sentences']:
  validate_sentence(s)
  if s['sentence_id'] in ids:raise ValueError('Duplicate sentence')
  ids.add(s['sentence_id'])
  if s['voice']!=cast['profiles'][s['cast_id']]['voice_name']:raise ValueError('Voice changed')
 for p in doc['paragraphs']:
  seq=[s for s in doc['sentences'] if s['paragraph_id']==p['paragraph_id']]
  if ''.join(s['source_slice'] for s in seq)!=p['text']:raise ValueError('Paragraph changed')
  for s in seq:
   a,b=s['source_span']
   if p['text'][a:b]!=s['source_slice']:raise ValueError('Source span changed')

def main():
 cast=json.loads((root/'voice-cast.json').read_text(encoding='utf-8'));chapters=[];fingerprints={};books=[]
 validate_voice_identity([json.loads((work/f'chapter-{n:02}-sentences.json').read_text(encoding='utf-8')) for n in (1,2)],cast)
 for n in (1,2):
  path=work/f'chapter-{n:02}-sentences.json';raw=path.read_bytes();doc=json.loads(raw)
  validate_document(doc,cast);fingerprints[str(path)]=hashlib.sha256(raw).hexdigest()
  ids={s['cast_id'] for s in doc['sentences']}
  book=dict(title='파우스트 · 문장별 오디오북',prefix='FAUST_P1',revision='S01',language='ko-KR',execution_mode='canvas-host',model=cast['model'],cast={cid:dict(name=v['display_name'],voice=v['voice_name'],persona=v['persona']) for cid,v in cast['profiles'].items() if cid in ids},chapters=[dict(number=n,title=('헌시' if n==1 else '극장에서의 서막')+f' · 문장별 {len(doc["sentences"])}구간',segments=doc['sentences'])])
  books.append(book)
 combined=books[0]
 for book in books[1:]:combined['cast'].update(book['cast']);combined['chapters']+=book['chapters']
 generate(combined,work/'output')
 build_copy_site((work/'output').glob('*_GEMINI_CANVAS_TTS.html'),root/'tts','파우스트 · 문장별 TTS HTML 코드 복사')
 page=root/'tts/index.html';page.write_text(page.read_text(encoding='utf-8').replace('<a id="download" class="download" hidden>HTML 다운로드</a>','<a id="download" hidden aria-hidden="true" style="display:none!important"></a>'),encoding='utf-8')
 assert all(hashlib.sha256(Path(p).read_bytes()).hexdigest()==h for p,h in fingerprints.items())
 print('PASS: reviewed inputs unchanged; 230 sentences published')
if __name__=='__main__':main()
