"""Replace the active reading script using only the new manuscript."""
import json
from pathlib import Path

from bs4 import BeautifulSoup

from render_dialogue_script import render


root = Path(__file__).parent
cast = json.loads((root / "voice-cast.json").read_text(encoding="utf-8"))
cast["aliases"]["군중"] = cast["aliases"]["민중 / 군중"]
manuscript = (root / "cleanroom-novel.txt").read_text(encoding="utf-8")
chapters = {}
for line in manuscript.splitlines():
    if line.startswith("# "):
        chapter = int(line[2:])
        chapters[chapter] = {}
    elif line.strip():
        scene, text = line.split("|", 1)
        speaker, separator, spoken = text.partition(">")
        if separator:
            role = "monologue" if speaker.startswith("~") else "dialogue"
            speaker = speaker.lstrip("~")
            overrides = cast["chapter_alias_overrides"].get(str(chapter), {})
            cast_id = overrides.get(speaker) or cast["aliases"][speaker]
            text = spoken
        else:
            role, speaker, cast_id = "narration", "나레이터", "narrator"
        chapters[chapter].setdefault(int(scene), []).append(
            dict(role=role, speaker=speaker, cast_id=cast_id, text=text)
        )

assert list(chapters) == list(range(1, 29))


def protected(page):
    return [str(node) for node in page.select("article pre[lang=de], article .ko-translation, article figure")]


for chapter, scenes in chapters.items():
    path = root / f"chapter-{chapter:02}.html"
    page = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    blocks = page.select("article .adaptation-prose")
    assert 0 < min(scenes) <= max(scenes) <= len(blocks), (chapter, len(blocks), list(scenes))
    snapshot = protected(page)
    title = page.select_one("article h1").get_text(" ", strip=True)
    for intro in page.select("article .adaptation-intro"):
        assert not protected(intro)
        intro.decompose()
    for number, block in enumerate(blocks, 1):
        block["data-script-revision"] = "cleanroom-v1"
        if number not in scenes:
            block["hidden"] = ""
        else:
            block.attrs.pop("hidden", None)
    scripts = [scenes.get(i, []) for i in range(1, len(blocks) + 1)]
    payload = dict(title=title, prose_revision="cleanroom-v1", voice_cast="voice-cast.json")
    if chapter == 1:
        payload["scripts"] = scripts
    else:
        payload["scenes"] = [
            dict(id=block.parent.get("data-scene"), script=script)
            for block, script in zip(blocks, scripts)
        ]
    (root / f"adaptations/chapter-{chapter:02}.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    path.write_text(str(page), encoding="utf-8")
    render(chapter)
    rendered = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    assert snapshot == protected(rendered), chapter
    from normalize_reader import normalize
    normalize(path)
