"""Build the five Part II act pages from the Gutenberg transcription."""

import json
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SECTIONS = json.loads((ROOT / "reading-sections.json").read_text(encoding="utf-8"))
TITLES = ["꽃이 핀 골짜기", "고딕 양식의 좁은 방", "스파르타의 메넬라오스 궁전 앞", "높은 산악 지대", "탁 트인 들판"]
FIRST_SCENE = [61, 70, 74, 83, 88, 90, 94, 102, 111, 120, 129, 138, 152, 159, 177, 188, 215]
COURT = [215, 222, 226, 234, 242, 248, 253, 258, 264, 272, 278, 291, 303, 312, 320, 328, 333]
COURT_REPORTS = [333, 338, 342, 346, 355, 359, 366, 374, 378, 388, 393, 396, 404, 407, 417, 423, 432]
SOURCE = "https://www.gutenberg.org/ebooks/2230"


def section_toc(prefix="", active=None):
    groups = []
    for act, sections in enumerate(SECTIONS, 1):
        opened = " open" if active == act else ""
        links = "".join(
            f'<a href="{prefix}act-{act:02}-{number:02}.html">{act}-{number}막 · {escape(label)}</a>'
            for number, (_, label) in enumerate(sections, 1)
        )
        groups.append(f'<details class="story-act"{opened}><summary>{act}막</summary>{links}'
                      f'<a href="{prefix}act-{act:02}.html">{act}막 전체 읽기</a></details>')
    return "".join(groups)


def page(title, content, active=None):
    acts = section_toc(active=active)
    return f"""<!doctype html>
<html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)} · 파우스트 제2부</title><link rel="stylesheet" href="reader.css">
<body><header><a href="../"><b>FAUST</b></a><span>괴테 · 파우스트 제2부</span>
<div><button aria-label="글자 축소" onclick="resize(-2)">A−</button> <button aria-label="글자 확대" onclick="resize(2)">A+</button></div>
<a href="../art-bible/index.html">캐릭터·배경 설정집</a><a href="../voice-cast.html">성우·연기 설정</a></header>
<main><aside aria-label="목차"><details><summary>제1부 · 28장</summary><a href="../#part-1">제1부 목차</a></details>
<details open><summary>제2부 · 5막</summary>{acts}<a href="illustration-review.html">1막 원문·번역 대조</a></details></aside><article>
<h1>{escape(title)}</h1>{content}
<footer><a href="{SOURCE}">Project Gutenberg · 독일어 원문</a> · <a href="faust-ii-de.txt">원문 텍스트</a></footer>
</article></main><script>
let size = Number(localStorage.getItem('faust-size')) || 20;
function resize(amount) {{
  size = Math.max(14, Math.min(32, size + amount));
  document.documentElement.style.setProperty('--size', size + 'px');
  localStorage.setItem('faust-size', size);
}}
resize(0);
</script></body></html>"""


def source_block(lines, start, end):
    return '<pre lang="de">' + escape("\n".join(lines[start:end])) + '</pre>'


def render_scene(lines, key, boundaries):
    manuscript = ROOT / f"act-01-{key}.json"
    if not manuscript.exists():
        return ""
    scenes = json.loads(manuscript.read_text(encoding="utf-8"))
    assert len(scenes) == len(boundaries) - 1
    content = ""
    for number, (begin, finish, scene) in enumerate(zip(boundaries, boundaries[1:], scenes), 1):
        scene_id = f"{key}-{number:02}"
        content += f'<section id="{scene_id}">'
        original = source_block(lines, begin, finish)
        translation = f'<p class="translation" lang="ko">{escape(scene["translation"])}</p>'
        content += f'<div class="comparison"><div>{original}</div><div>{translation}</div></div>'
        content += '</section>'
    return content


def render_illustration_review(lines):
    plan = json.loads((ROOT / "act-01-illustration-plan.json").read_text(encoding="utf-8"))
    content = '<p>1막 · 꽃이 핀 골짜기</p>'
    for number, (begin, end, label, translation) in enumerate(plan, 1):
        scene_id = f"valley-{number:02}"
        image_path = f"images/{scene_id}.webp"
        image = ""
        if (ROOT / image_path).is_file():
            image = f'<img src="{image_path}" alt="{escape(label, quote=True)}" loading="lazy">'
        content += f'<section id="{scene_id}">{image}<h2>{number:02} · {escape(label)}</h2>'
        content += f'<div class="comparison"><div><h4>독일어 원문</h4>{source_block(lines, begin, end)}</div>'
        content += f'<div><h4>한국어 번역</h4><p class="translation">{escape(translation)}</p></div></div></section>'
    return content


def build():
    lines = (ROOT / "faust-ii-de.txt").read_text(encoding="utf-8").splitlines()
    starts = [i for i, line in enumerate(lines) if re.match(r"\s+[1-5]\.\s+Akt--", line)]
    end = next(i for i, line in enumerate(lines) if line.startswith("End of the Project Gutenberg EBook"))
    assert starts[0] == FIRST_SCENE[0] and lines[FIRST_SCENE[-1]].strip() == "KAISERLICHE PFALZ"
    assert len(starts) == len(TITLES)
    assert starts == [sections[0][0] for sections in SECTIONS]
    opening = render_scene(lines, "opening", FIRST_SCENE)
    court = render_scene(lines, "court", COURT)
    reports = render_scene(lines, "reports", COURT_REPORTS)
    assert not court or opening
    assert not reports or court
    for index, (start, stop, title) in enumerate(zip(starts, starts[1:] + [end], TITLES), 1):
        filename = f"act-{index:02}.html"
        content = ""
        if index == 1 and opening:
            content = '<h2>꽃이 핀 골짜기 <span lang="de">Anmutige Gegend</span></h2>' + opening
            start = FIRST_SCENE[-1]
            content += '<h2 id="court">황제의 궁정 <span lang="de">Kaiserliche Pfalz</span></h2>' + court
            if court:
                start = COURT[-1]
            if reports:
                content += '<h3 id="court-reports">대신들의 보고와 메피스토의 제안</h3>' + reports
                start = COURT_REPORTS[-1]
        content += source_block(lines, start, stop)
        links = []
        if index > 1:
            links.append(f'<a href="act-{index-1:02}.html">이전 막</a>')
        if index < len(TITLES):
            links.append(f'<a href="act-{index+1:02}.html">다음 막</a>')
        content += '<nav aria-label="막 이동">' + " · ".join(links) + "</nav>"
        (ROOT / filename).write_text(page(f"{index}막 · {title}", content, index), encoding="utf-8")
    divisions = [
        (act, number, start, label)
        for act, sections in enumerate(SECTIONS, 1)
        for number, (start, label) in enumerate(sections, 1)
    ]
    assert [item[2] for item in divisions] == sorted({item[2] for item in divisions})
    filenames = [f"act-{act:02}-{number:02}.html" for act, number, _, _ in divisions]
    stops = [item[2] for item in divisions[1:]] + [end]
    for position, ((act, number, start, label), stop) in enumerate(zip(divisions, stops)):
        content = ""
        if act == 1 and number == 1 and opening:
            content = '<p><a href="illustration-review.html">이 구간의 삽화·원문·번역 대조</a></p>' + opening
            start = FIRST_SCENE[-1]
        if act == 1 and number == 2 and court and reports:
            content = court + reports
            start = COURT_REPORTS[-1]
        if start < stop:
            content += source_block(lines, start, stop)
        links = []
        if position:
            links.append(f'<a rel="prev" href="{filenames[position-1]}">이전 구간</a>')
        links.append(f'<a href="act-{act:02}.html">{act}막 전체</a>')
        if position + 1 < len(filenames):
            links.append(f'<a rel="next" href="{filenames[position+1]}">다음 구간</a>')
        content += '<nav aria-label="구간 이동">' + " · ".join(links) + "</nav>"
        (ROOT / filenames[position]).write_text(page(f"{act}-{number}막 · {label}", content, act), encoding="utf-8")
    review = render_illustration_review(lines)
    (ROOT / "illustration-review.html").write_text(page("1막 삽화·원문·번역 대조", review), encoding="utf-8")
    index_content = '<p>요한 볼프강 폰 괴테</p><p><a href="illustration-review.html">1막 원문·번역 대조</a></p>' + section_toc()
    (ROOT / "index.html").write_text(page("파우스트 제2부", index_content), encoding="utf-8")
    home = ROOT.parent / "index.html"
    markup = home.read_text(encoding="utf-8")
    navigation = section_toc("part-ii/")
    review_link = '<a href="part-ii/illustration-review.html">1막 원문·번역 대조</a>'
    for location, pattern in (
        ("sidebar", r'(<details><summary>제2부 · 5막</summary>).*?(</aside>)'),
        ("main", r'(<details class="part" id="part-2"><summary>.*?</summary>).*?(<footer>)'),
    ):
        markup, count = re.subn(
            pattern, lambda m: m[1] + navigation + review_link + "</details>" + m[2],
            markup, count=1, flags=re.S,
        )
        assert count == 1, location
    if ".part .story-act a{" not in markup:
        markup = markup.replace("</style>", ".part .story-act a{display:block;padding:.35rem .5rem}</style>", 1)
    home.write_text(markup, encoding="utf-8")


if __name__ == "__main__":
    build()
