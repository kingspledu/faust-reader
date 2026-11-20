"""Install explicitly mapped, visually checked character-sheet replacements."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent

def install(mapping_path):
    mapping = json.loads(Path(mapping_path).read_text(encoding="utf-8"))
    index_path = ROOT / "reference-index.json"
    data = json.loads(index_path.read_text(encoding="utf-8"))
    entries = {entry["id"]: entry for entry in data["entries"]}
    for key, source in mapping.items():
        entry = entries[key]
        assert entry.get("sheet_scope") == "individual", key
        image = Image.open(source).convert("RGB")
        assert image.size == (1536, 1024), (key, image.size)
        destination = ROOT / entry["image"]
        assert destination.resolve().parent == ROOT.resolve()
        image.save(destination, format="WEBP", quality=94, method=6)
        entry["sheet_template"] = "character-faust.png"
        entry["sheet_rebuilt_on"] = "2026-11-20"
        entry["sheet_sha256"] = hashlib.sha256(destination.read_bytes()).hexdigest()
        entry["sheet_review"] = "Visual review of identity, three views, six expressions, four gestures, details, costume layers, props and palette."
        print(key, image.size, entry["sheet_sha256"])
    index_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mapping")
    install(parser.parse_args().mapping)
