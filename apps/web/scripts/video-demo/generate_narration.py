"""Tạo lời dẫn tiếng Việt cho bản quay demo; file kết quả ở output/ (không commit)."""

import json
import sys
import time
from pathlib import Path

from gtts import gTTS
from mutagen.mp3 import MP3


ROOT = Path(__file__).resolve().parents[2]
sys.stdout.reconfigure(encoding="utf-8")
SCRIPT = ROOT / "docs/demo-local/LOI_DAN_2026-11-01.json"
OUT = ROOT / "output/video-demo-2026-11-01"
OUT.mkdir(parents=True, exist_ok=True)

scenes = json.loads(SCRIPT.read_text(encoding="utf-8"))
force = set(sys.argv[1:])
for scene in scenes:
    destination = OUT / f"voice-{scene['id']}.mp3"
    if scene["id"] in force or not destination.exists() or destination.stat().st_size < 1000:
        for attempt in range(3):
            try:
                gTTS(text=scene["text"], lang="vi", slow=False).save(str(destination))
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(2 * (attempt + 1))
    scene["seconds"] = round(MP3(destination).info.length, 3)
    print(scene["id"], scene["title"], scene["seconds"], flush=True)

(OUT / "scenes-with-duration.json").write_text(
    json.dumps(scenes, ensure_ascii=False, indent=2), encoding="utf-8"
)
print("TOTAL_VOICE", round(sum(s["seconds"] for s in scenes), 2))
