from pathlib import Path
p=Path('faust-reader/build_blog.py');s=p.read_text(encoding='utf-8-sig')
s=s.replace("locks={'FAUST'", """for name,img in {'LIESCHEN':'character-lieschen.png','DIE HEXE':'character-witch.png','FROSCH':'character-frosch.png'}.items():
 a,b,_=labels[name];labels[name]=(a,b,img)
locks={'FAUST'""")
s=s.replace("# Preserve entry IDs", """location_images.update({'마르테의 집':'location-marthe-house.png','마르테의 정원':'location-marthe-garden.png','감옥':'location-prison.png'})
for e in entries:
 if e['name'] in location_images:
  e['image']=location_images[e['name']];e['status']='draft_visual'
# Preserve entry IDs""")
s=s.replace("page=page.replace('이미지 시트 3장','이미지 시트 10장').replace('이미지 3장은','이미지 10장은')", """count=sum(bool(e['image']) for e in entries)
page=page.replace('이미지 시트 3장',f'이미지 시트 {count}장').replace('이미지 3장은',f'이미지 {count}장은')""")
p.write_text(s,encoding='utf-8')
