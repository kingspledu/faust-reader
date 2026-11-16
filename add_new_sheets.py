from pathlib import Path
import shutil
base=Path('C:/Users/고보민/.codex/generated_images/01a1e3cb-ba49-76b0-8e1f-666ca1459747');root=Path('faust-reader');out=root/'art-bible'
files={'exec-c89158cf-daa1-4015-8124-e895a1fe25ab.png':'location-gretchen-room.png','exec-90a966a3-5e10-41bd-944b-1d07701472e0.png':'character-wagner.png','exec-73ff0492-cb78-4fdc-bc7a-a296340e04f7.png':'character-marthe.png','exec-e2513d46-e2a0-4ed6-b9a1-9570b7e12c13.png':'character-valentin.png','exec-81b62de2-dc04-4444-a515-021826c6fdd5.png':'location-tavern.png','exec-a647987b-1e46-4842-a763-06c83e19ac5d.png':'location-witch-kitchen.png'}
for a,b in files.items():shutil.copyfile(base/a,out/b)
p=root/'build_blog.py';s=p.read_text(encoding='utf-8-sig');s=s.replace('entries=[];sections=[]','''entries=[];sections=[]
for name,img in {'MARGARETE / GRETCHEN':'character-gretchen.png','WAGNER':'character-wagner.png','MARTHE':'character-marthe.png','VALENTIN':'character-valentin.png'}.items():
 a,b,_=labels[name];labels[name]=(a,b,img)
''')
s=s.replace("# Preserve entry IDs",'''location_images={'그레트헨의 방':'location-gretchen-room.png','아우어바흐 지하 술집 · 라이프치히':'location-tavern.png','마녀의 부엌':'location-witch-kitchen.png'}
for e in entries:
 if e['name'] in location_images:
  e['image']=location_images[e['name']];e['status']='draft_visual'
# Preserve entry IDs''')
s=s.replace("start=page.index", "page=page.replace('이미지 시트 3장','이미지 시트 10장').replace('이미지 3장은','이미지 10장은')\nstart=page.index")
p.write_text(s,encoding='utf-8')
