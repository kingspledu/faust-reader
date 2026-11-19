"""Apply the shared typography and bilingual fold markup to generated pages."""

from pathlib import Path
from bs4 import BeautifulSoup


def normalize(path):
    path = Path(path)
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
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
