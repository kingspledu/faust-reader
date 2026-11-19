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
COURT_SCENE = "../part-ii/act-01-02.html"
NEW_MASK_REFERENCES = [("character-ii-furies","??? ???","FURIES","?? ??? ???? ?? ??? ? ??.",["?? ??? ??? ??","?? ??"]),("character-ii-charioteer","?? ??","KNABE WAGENLENKER","??? ??? ?? ?? ??.",["?? ???? ?? ??","???","?? ?? ??"]) ]
COURT_REFERENCES = [
    ("character-ii-emperor", "황제", "KAISER", "궁정 회의를 주재한다.", ["적갈색 머리와 각진 수염", "아이보리 금실 예복", "작은 금관"]),
    ("character-ii-astrologer", "점성술사", "ASTROLOG", "황제의 오른편에 선다.", ["길고 가는 회색 머리", "연보라 예복", "황동 천구의"]),
    ("character-ii-courtier-one", "첫 번째 궁정 신하", "JUNKER", "기존 광대가 계단에서 쓰러졌다고 보고한다.", ["짧고 곧은 갈색 앞머리", "남색 더블릿"]),
    ("character-ii-courtier-two", "두 번째 궁정 신하", "ZWEITER JUNKER", "새 광대가 들어오는 모습을 전한다.", ["곱슬곱슬한 밝은 머리", "짙은 녹색 더블릿"]),
    ("character-ii-old-jester", "기존 궁정 광대", "NARR", "황제가 입장할 때 계단에서 쓰러진 광대.", ["큰 체구", "둥근 회색 수염", "노랑과 파랑이 섞인 광대옷"]),
    ("group-ii-palace-guards", "궁정 경비대", "WACHE", "도끼창을 엇갈려 새 광대를 막는다.", ["철제 투구", "짙은 버건디 겉옷", "도끼창"]),
    ("group-ii-palace-attendants", "궁정 시종들", "HOFGESINDE", "황제의 입장에 앞서 모습을 드러낸다.", ["회색 리넨", "궁정 문장이 달린 장식"]),
    ("variant-ii-mephisto-jester", "메피스토 · 궁정 광대 차림", "MEPHISTOPHELES", "쓰러진 광대를 대신해 황제 곁에 자리를 잡는다.", ["제1부와 같은 검은 머리와 붉은 눈", "검정·버건디 광대 모자와 금빛 방울", "검은 장갑과 붉은 보석"]),
    ("character-ii-chancellor", "재상", "KANZLER", "제국의 법과 재판이 무너진 상황을 보고한다.", ["각진 회색 수염", "붉은 벨벳 예복"]),
    ("character-ii-commander", "총사령관", "HEERMEISTER", "제국의 군사 상황과 용병의 체불 봉급을 보고한다.", ["관자놀이에 센 머리", "회색 판금 갑옷", "짙은 갈색 망토"]),
    ("character-ii-treasurer", "재무관", "SCHATZMEISTER", "동맹국의 지원금이 끊기고 국고가 비었다고 말한다.", ["쓸어 올린 회색 머리와 안경", "겨자색 조끼와 파란 겉옷"]),
    ("character-ii-court-marshal", "궁정 살림을 맡은 대신", "MARSCHALK", "궁정의 살림과 외상 문제를 보고한다.", ["짙은 곱슬머리와 짧은 수염", "보라색 예복", "열쇠 고리"]),
    ("group-ii-court-council", "궁정 대신들", "STAATSRAT / GEMURMEL", "황제를 기다리고 새 광대가 들어오자 서로 수군거린다.", ["색을 절제한 궁정 예복", "고딕 양식의 옷깃과 장식"]),
    ("place-ii-throne-room", "황제의 알현실", "SAAL DES THRONES", "황제와 대신들의 회의가 열리는 궁정 공간.", ["붉은 장막 앞 3단 단상의 금빛 왕좌", "맞은편의 청동 양문", "짙은 석재 천장과 주황빛 조명"]),
]


def register():
    index = ROOT / "reference-index.json"
    page = ROOT / "index.html"
    data = json.loads(index.read_text(encoding="utf-8"))
    markup = page.read_text(encoding="utf-8")
    posts = []
    carnival = json.loads((ROOT / "carnival-references.json").read_text(encoding="utf-8"))
    references = REFERENCES + COURT_REFERENCES + NEW_MASK_REFERENCES + carnival
    known_ids = {ref[0] for ref in references}
    data["entries"] = [entry for entry in data["entries"] if entry["id"] not in known_ids]
    for key, name, german, note, locks in references:
        asset = key + ".webp"
        assert (ROOT / asset).is_file(), asset
        court = (key, name, german, note, locks) in COURT_REFERENCES
        mask = (key, name, german, note, locks) in NEW_MASK_REFERENCES
        kind = "place" if key.startswith("place") else "character"
        group = "places" if kind == "place" else "forms" if court else "heaven"
        scene = "../part-ii/act-01-06.html" if [key, name, german, note, locks] in carnival else COURT_SCENE if court or mask else SCENE
        data["entries"].append({
            "id": key, "kind": kind, "name": name, "source_name": german,
            "category": "궁정" if court else "정령", "part": 2,
            "act_numbers": [1], "chapter_numbers": [], "source_urls": [scene],
            "image": asset, "status": "draft_visual", "visual_locks": locks,
            "canonical_note": note, "variants_note": "", "unresolved": [],
            "menu_group": group,
        })
        if key.startswith("variant"):
            data["entries"][-1]["variant_of"] = "character-008"
        markup = re.sub(rf'<article class="post" id="{key}".*?</article>', "", markup, flags=re.S)
        rules = "".join(f"<li>{escape(rule)}</li>" for rule in locks)
        posts.append(
            f'<article class="post" id="{key}" data-group="{group}" data-kind="{kind}">'
            f'<p class="meta">제2부 · 1막 · 시각 초안</p><h2><a href="#{key}">{name}</a></h2>'
            f'<p class="de">{german}</p><figure><a href="{asset}"><img loading="lazy" src="{asset}" alt="{name} 설정 시트"></a></figure>'
            f'<p>{note}</p><details><summary>일관성 규칙과 원문 근거</summary><ul>{rules}</ul>'
            f'<p><a href="{scene}">제2부 1막 원문</a></p></details></article>'
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
