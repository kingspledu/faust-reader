import json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[2];folder=root/'assets/audiobook';folder.mkdir(exist_ok=True)
for size in (192,512):
 im=Image.new('RGB',(size,size),'#f7f4e9');d=ImageDraw.Draw(im);d.rounded_rectangle((size*.08,size*.08,size*.92,size*.92),radius=size*.16,fill='#263e30');font=ImageFont.truetype('C:/Windows/Fonts/georgia.ttf',int(size*.62));d.text((size*.28,size*.13),'F',font=font,fill='#d6e17b');im.save(folder/f'icon-{size}.png')
manifest=dict(id='./',name='파우스트 · 삽화 오디오북',short_name='파우스트',lang='ko',start_url='./index.html',scope='./',display='standalone',background_color='#f7f4e9',theme_color='#263e30',icons=[dict(src=f'assets/audiobook/icon-{n}.png',sizes=f'{n}x{n}',type='image/png',purpose='any') for n in (192,512)])
(root/'manifest.webmanifest').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
