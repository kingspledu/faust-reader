"""Register the visual references for Part II without rebuilding Part I."""

import json
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REFERENCES = [
    ("character-ii-ariel", "아리엘", "ARIEL", "파우스트를 돌보는 정령들에게 노래로 일을 맡긴다.", ["진주빛 은발 단발과 가운데 가르마", "이끼색 눈", "아이보리 튜닉과 옅은 세이지색 비대칭 망토", "황동 잎 브로치", "날개 없음"]),
    ("group-ii-elf-chorus", "작은 정령 합창", "CHOR", "작은 정령들이 한 명씩, 둘씩, 여럿이 번갈아 또는 함께 노래한다.", ["날개 없는 작은 정령들", "이끼색·리넨색·회청색 튜닉", "은은한 금빛 입자", "아리엘과 구분되는 작은 크기"]),
]
SCENE = "../part-ii/act-01.html#opening-01"


def register():
    index = ROOT / "reference-index.json"
    page = ROOT / "index.html"
    data = json.loads(index.read_text(encoding="utf-8"))
    markup = page.read_text(encoding="utf-8")
    posts = []
    known_ids = {ref[0] for ref in REFERENCES}
    data["entries"] = [entry for entry in data["entries"] if entry["id"] not in known_ids]
    for key, name, german, note, locks in REFERENCES:
        asset = key + ".webp"
        assert (ROOT / asset).is_file(), asset
        data["entries"].append({
            "id": key, "kind": "character", "name": name, "source_name": german,
            "category": "합창 집단" if key.startswith("group") else "정령", "part": 2,
            "act_numbers": [1], "chapter_numbers": [], "source_urls": [SCENE],
            "image": asset, "status": "draft_visual", "visual_locks": locks,
            "canonical_note": note, "variants_note": "", "unresolved": [],
            "menu_group": "heaven",
        })
        markup = re.sub(rf'<article class="post" id="{key}".*?</article>', "", markup, flags=re.S)
        rules = "".join(f"<li>{escape(rule)}</li>" for rule in locks)
        posts.append(
            f'<article class="post" id="{key}" data-group="heaven" data-kind="character">'
            f'<p class="meta">제2부 · 1막 · 시각 초안</p><h2><a href="#{key}">{name}</a></h2>'
            f'<p class="de">{german}</p><figure><a href="{asset}"><img loading="lazy" src="{asset}" alt="{name} 설정 시트"></a></figure>'
            f'<p>{note}</p><details><summary>일관성 규칙과 원문 근거</summary><ul>{rules}</ul>'
            f'<p><a href="{SCENE}">제2부 1막 첫 장면</a></p></details></article>'
        )
    data["scope"] = "Goethe Faust Part I and registered Part II references"
    data["part_ii_source"] = "https://www.gutenberg.org/ebooks/2230"
    marker = '<div class="journal">'
    assert markup.count(marker) == 1
    page.write_text(markup.replace(marker, marker + "".join(posts)), encoding="utf-8")
    index.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    guide = ROOT / "CODEX_REFERENCE.md"
    text = guide.read_text(encoding="utf-8").replace("Scope: Part I only.", "Scope: Part I and registered Part II references.")
    rule = "For Part II, register every new character sheet on the public art-bible page and in the index before generating its first scene. Attach existing reference art directly for returning characters."
    if rule not in text:
        text += "\n" + rule + "\n"
    guide.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    register()
