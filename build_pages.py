from pathlib import Path
import re,html
root=Path(__file__).parent
exec((root/'build.py').read_text(encoding='utf-8-sig').split("page='''")[0])
css=re.search(r'<style>(.*?)</style>',(root/'index.html').read_text(encoding='utf-8'),re.S).group(1)
css+='a{color:inherit}nav a{border:1px solid #b8b3a6;padding:12px;text-decoration:none}header a{text-decoration:none}.chapter-list li{margin:18px 0;font-size:20px}'
def filename(i):return f'chapter-{i+1:02}.html'
def make(i=None):
 toc=''.join(f'<a class="{"active" if i==j else ""}" href="{filename(j)}">{j+1:02} · {html.escape(c["title"])}</a>' for j,c in enumerate(chapters))
 if i is None:
  title='Faust · 장면 목차';content='<h1>Faust.</h1><p>괴테 · 파우스트 제1부 독일어 원문</p><h2>장면별 목차</h2><ol class="chapter-list">'+''.join(f'<li><a href="{filename(j)}">{html.escape(c["title"])}</a></li>' for j,c in enumerate(chapters))+'</ol>'
 else:
  c=chapters[i];title=c['title']+' · Faust';content=f'<p class="eyebrow">장면 {i+1:02} / 28</p><h1 lang="de">{html.escape(c["title"])}</h1><pre lang="de">{html.escape(c["text"])}</pre><nav>'
  content+=(f'<a rel="prev" href="{filename(i-1)}">← 이전 장면</a>' if i else '<span></span>')+'<a href="index.html">전체 목차</a>'+(f'<a rel="next" href="{filename(i+1)}">다음 장면 →</a>' if i<27 else '<span></span>')+'</nav>'
 return f'''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)}</title><style>{css}</style><header><a href="index.html"><b>FAUST</b></a><span>괴테 · 파우스트 제1부</span><div><button onclick="resize(-2)" aria-label="글자 축소">A−</button> <button onclick="resize(2)" aria-label="글자 확대">A+</button></div></header><main><aside><p class="eyebrow">INHALT / 장면 목차</p>{toc}</aside><article>{content}<footer>Johann Wolfgang von Goethe<br>출처: <a href="https://www.gutenberg.org/ebooks/2229">Project Gutenberg · #2229</a> · <a href="faust.txt">전체 원문 및 라이선스</a></footer></article></main><script>let size=Number(localStorage.getItem('faust-size'))||20;function resize(n){{size=Math.max(14,Math.min(32,size+n));document.documentElement.style.setProperty('--size',size+'px');localStorage.setItem('faust-size',size)}}resize(0);</script></html>'''
for directory in [root,root/'dist']:
 for i in [None,*range(28)]:
  (directory/('index.html' if i is None else filename(i))).write_text(make(i),encoding='utf-8')
for i,c in enumerate(chapters):
 s=(root/filename(i)).read_text(encoding='utf-8');assert html.escape(c['text']) in s
 for link in re.findall(r'href="([^"]+)"',s):
  if not link.startswith('https:'):assert (root/link).is_file(),link
print('Verified 28 complete chapter pages and all local links.')
