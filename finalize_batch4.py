from pathlib import Path
p=Path('faust-reader/build_blog.py');s=p.read_text(encoding='utf-8-sig');s=s.replace('# Preserve entry IDs', '''for e in entries:
 if e['source_name']=='DICHTER':
  e['canonical_note']='극장 서막에서 지배인·희극 배우와 예술과 공연에 관해 대화하는 시인.'
  e['unresolved'].append('이미지의 파우스트와 교유한다는 소개는 근거 없는 생성 문구이므로 참조 제외.')
# Preserve entry IDs''');p.write_text(s,encoding='utf-8')
