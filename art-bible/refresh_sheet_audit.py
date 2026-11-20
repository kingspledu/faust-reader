"""Refresh the character sheet audit from the active index."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
index = ROOT / "reference-index.json"
data = json.loads(index.read_text(encoding="utf-8"))
for entry in data["entries"]:
    if entry["id"] == "character-ii-charioteer-source":
        entry["name"] = "마차 소년"
index.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
path = ROOT / "carnival-references.json"
references = json.loads(path.read_text(encoding="utf-8"))
for row in references:
    if row[0] == "character-ii-charioteer-source":
        row[1] = "마차 소년"
path.write_text(json.dumps(references, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
entries = [e for e in data["entries"] if e.get("kind") == "character" and e.get("sheet_scope") == "individual" and e.get("image") and (ROOT / e["image"]).is_file()]
pending = [e for e in entries if Image.open(ROOT / e["image"]).size != (1536, 1024)]
lines = ["# 개인 캐릭터 시트 교체 현황", "", "기준: 첨부 파우스트 마스터 시트, 1536×1024. 집단·장소·소품은 이 목록에서 제외한다.", "", f"등록된 개인·개인 변형 시트: {len(entries)}개", f"크기 불일치: {len(pending)}개", "", "크기 일치는 구성 완성을 보장하지 않는다. 교체 시트의 검수 내용과 파일 확인값은 인덱스의 sheet_review와 sheet_sha256에 기록한다. 이미지 속 부가 설명과 소품은 창작 설정이며 원문 사실의 근거로 사용하지 않는다. 원문 배역명은 source_name을 따른다.", "", "## 크기 불일치 항목", "", "| ID | 이름 | 크기 |", "|---|---|---|"]
for entry in pending:
    w, h = Image.open(ROOT / entry["image"]).size
    lines.append(f"| {entry['id']} | {entry['name']} | {w}×{h} |")
(ROOT / "CHARACTER_TEMPLATE_AUDIT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"Individual sheets: {len(entries)}, size mismatches: {len(pending)}")
