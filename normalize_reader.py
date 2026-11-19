"""Apply the shared typography and bilingual fold markup to generated pages."""

from pathlib import Path
import json
import re
from html import escape
from bs4 import BeautifulSoup


def normalize_menu(soup, path):
    sidebar = soup.find("aside", recursive=True)
    if sidebar is None:
        return
    root = Path(__file__).resolve().parent
    nested = path.parent.name == "part-ii"
    prefix = "../" if nested else ""
    home = BeautifulSoup((root / "index.html").read_text(encoding="utf-8"), "html.parser")
    links = home.select('aside a[href^="chapter-"]')
    assert len(links) == 28
    groups = [(1, 3, "이야기가 시작되기 전에"), (4, 9, "파우스트와 메피스토의 계약"),
              (10, 19, "파우스트와 그레첸의 만남"), (20, 28, "그레첸에게 닥친 비극")]
    chapter = int(path.stem[-2:]) if re.fullmatch(r"chapter-\d{2}", path.stem) else None
    act_match = re.match(r"act-(\d{2})", path.stem) if nested else None
    act = int(act_match[1]) if act_match else None
    markup = '<aside class="reader-menu" aria-label="전체 목차"><details open><summary>제1부 · 28장</summary>'
    markup += f'<a href="{prefix}index.html#part-1">제1부 목차</a>'
    for number, (start, end, title) in enumerate(groups, 1):
        opened = " open" if chapter and start <= chapter <= end else ""
        markup += f'<details class="story-act"{opened}><summary>1부 {number}막 · {title}</summary>'
        for link in links[start-1:end]:
            markup += f'<a href="{prefix}{link["href"]}">{escape(link.get_text())}</a>'
        markup += '</details>'
    markup += '</details><details open><summary>제2부 · 5막</summary>'
    data = json.loads((root / "part-ii/reading-sections.json").read_text(encoding="utf-8"))
    target = "" if nested else "part-ii/"
    for number, sections in enumerate(data, 1):
        opened = " open" if act == number else ""
        markup += f'<details class="story-act"{opened}><summary>{number}막</summary>'
        for sub, (_, title) in enumerate(sections, 1):
            markup += f'<a href="{target}act-{number:02}-{sub:02}.html">{number}-{sub}막 · {escape(title)}</a>'
        markup += f'<a href="{target}act-{number:02}.html">{number}막 전체 읽기</a></details>'
    markup += f'<a href="{target}illustration-review.html">1막 원문·번역 대조</a></details></aside>'
    menu = BeautifulSoup(markup, "html.parser").aside
    parts = menu.find_all("details", recursive=False)
    for index, part in enumerate(parts):
        part["name"] = "reader-parts"
        part.attrs.pop("open", None)
        if index == int(nested):
            part["open"] = ""
        for group in part.find_all("details", recursive=False):
            group["name"] = f"reader-acts-{index+1}"
    sidebar.replace_with(menu)
    old = soup.find("script", id="reader-accordion")
    if old:
        old.decompose()
    script = soup.new_tag("script", id="reader-accordion")
    script.string = """document.querySelectorAll('.reader-menu details').forEach(item => {
  item.addEventListener('toggle', () => {
    if (!item.open) return;
    Array.from(item.parentElement.children).forEach(sibling => {
      if (sibling !== item && sibling.tagName === 'DETAILS') sibling.open = false;
    });
  });
});"""
    soup.append(script)


def normalize(path):
    path = Path(path)
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    normalize_menu(soup, path)
    selector = 'pre[lang="de"],.ko-translation,.translation'
    before = [node.get_text() for node in soup.select(selector)]
    for pre in list(soup.select('pre[lang="de"]')):
        comparison = pre.find_parent(class_="comparison")
        fold = comparison.find_parent("details") if comparison else pre.find_parent("details", class_="source-fold")
        if comparison and not fold:
            fold = soup.new_tag("details")
            comparison.wrap(fold)
        if not fold:
            continue
        if not comparison:
            translation = fold.select_one(".ko-translation,.translation")
            comparison = soup.new_tag("div", attrs={"class": "comparison"})
            left = soup.new_tag("div")
            left.append(pre.extract())
            right = soup.new_tag("div")
            if translation:
                right.append(translation.extract())
            comparison.extend([left, right])
            fold.append(comparison)
        fold["class"] = ["source-fold"]
        fold.attrs.pop("open", None)
        summary = fold.find("summary", recursive=False)
        if not summary:
            summary = soup.new_tag("summary")
            fold.insert(0, summary)
        summary.string = "독일어 원문 · 한국어 번역"
    href = "../reader-consistency.css" if path.parent.name == "part-ii" else "reader-consistency.css"
    if not soup.find("link", href=href):
        link = soup.new_tag("link", rel="stylesheet", href=href)
        anchor = soup.find("style") or soup.find("link", rel="stylesheet")
        anchor.insert_after(link)
    assert before == [node.get_text() for node in soup.select(selector)], path
    path.write_text(str(soup), encoding="utf-8")
