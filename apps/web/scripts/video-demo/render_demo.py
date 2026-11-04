"""Ghép các chặng Chrome thật với giọng Việt và phụ đề theo mốc quay."""

import json
import subprocess
import sys
from pathlib import Path

from imageio_ffmpeg import get_ffmpeg_exe


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output/video-demo-2026-11-01"
DOC = ROOT / "docs/demo-local"
FFMPEG = get_ffmpeg_exe()
sys.stdout.reconfigure(encoding="utf-8")

source_scenes = json.loads((OUT / "scenes-with-duration.json").read_text(encoding="utf-8"))
by_id = {item["id"]: item for item in source_scenes}
parts = [("A", [f"{n:02}" for n in range(1, 10)]),
         ("B", [f"{n:02}" for n in range(10, 13)]),
         ("C", [f"{n:02}" for n in range(13, 16)]),
         ("D", ["16"]),
         ("E", ["17", "18"]),
         ("F", ["20", "21", "22", "19"])]


def ffmpeg(args):
    command = [FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *args]
    result = subprocess.run(command, text=True, capture_output=True)
    if result.returncode:
        print(result.stderr[-4000:])
        raise RuntimeError(f"FFmpeg kết thúc với mã {result.returncode}")


def timestamp(seconds):
    millis = max(0, round(seconds * 1000))
    hours, rem = divmod(millis, 3600000)
    minutes, rem = divmod(rem, 60000)
    secs, ms = divmod(rem, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{ms:03}"


def chunks(text, max_chars=88):
    # Cắt ở khoảng trắng để hai dòng phụ đề không quá dài; gTTS không trả timestamp từng từ.
    words = text.split()
    result, current = [], []
    for word in words:
        if current and len(" ".join([*current, word])) > max_chars:
            result.append(" ".join(current))
            current = []
        current.append(word)
    if current:
        result.append(" ".join(current))
    return result


rendered = []
cues = []
chapters = []
offset = 0.0
for part, ids in parts:
    manifest = json.loads((OUT / f"manifest-{part}.json").read_text(encoding="utf-8"))
    rows = [row for row in manifest["scenes"] if row["id"] in ids and row["endMs"] > row["startMs"]]
    if [row["id"] for row in rows] != ids:
        raise RuntimeError(f"Chặng {part} thiếu cảnh hoàn tất: {[row['id'] for row in rows]}")
    # Chừa hai khung cuối, nhưng không dính khung đầu của cảnh quay lỗi kế tiếp.
    duration = rows[-1]["endMs"] / 1000 + 0.08
    args = ["-i", manifest["video"]]
    for scene_id in ids:
        args.extend(["-i", str(OUT / f"voice-{scene_id}.mp3")])
    filters = []
    audio_nodes = []
    for index, row in enumerate(rows, 1):
        delay = max(0, row["startMs"])
        label = f"a{index}"
        filters.append(f"[{index}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay={delay}:all=1[{label}]")
        audio_nodes.append(f"[{label}]")
        scene = by_id[row["id"]]
        voice_start = offset + delay / 1000
        chapters.append((timestamp(voice_start), row["role"], row["title"], row["id"]))
        bits = chunks(scene["text"])
        total = sum(len(bit) for bit in bits)
        elapsed = 0.0
        for bit in bits:
            seconds = scene["seconds"] * len(bit) / total
            cues.append((voice_start + elapsed, voice_start + elapsed + seconds, bit))
            elapsed += seconds
    if len(audio_nodes) > 1:
        filters.append("".join(audio_nodes) + f"amix=inputs={len(audio_nodes)}:duration=longest:normalize=0[aout]")
    else:
        filters.append(f"{audio_nodes[0]}anull[aout]")
    target = OUT / f"part-{part}.mp4"
    args.extend([
        "-filter_complex", ";".join(filters),
        "-map", "0:v:0", "-map", "[aout]",
        "-t", f"{duration:.3f}",
        "-vf", "fps=24,format=yuv420p",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart", str(target),
    ])
    print("RENDER", part, f"{duration:.1f}s", flush=True)
    ffmpeg(args)
    rendered.append(target)
    offset += duration

concat_file = OUT / "concat-list.txt"
concat_file.write_text("".join(f"file '{path.as_posix()}'\n" for path in rendered), encoding="utf-8")
intermediate = OUT / "gop-demo-no-captions.mp4"
ffmpeg(["-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", "-movflags", "+faststart", str(intermediate)])

srt = DOC / "gop-demo-co-loi-dan-2026-11-01.srt"
with srt.open("w", encoding="utf-8") as handle:
    for index, (start, end, text) in enumerate(cues, 1):
        handle.write(f"{index}\n{timestamp(start)} --> {timestamp(end)}\n{text}\n\n")

final = DOC / "gop-demo-co-loi-dan-2026-11-01.mp4"
ffmpeg(["-i", str(intermediate), "-i", str(srt),
        "-map", "0:v:0", "-map", "0:a:0", "-map", "1:s:0",
        "-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text",
        "-metadata:s:s:0", "language=vie", "-movflags", "+faststart", str(final)])

chapter_file = DOC / "MOC_VIDEO_2026-11-01.md"
chapter_file.write_text(
    "# Mốc cảnh video demo Góp — 01/11/2026\n\n"
    "Phụ đề có trong MP4 và file `.srt` riêng. Mốc phụ đề chia theo câu, dựa trên độ dài lời đọc nên có thể lệch nhẹ so với từng từ.\n\n"
    "| Mốc | Vai trò | Cảnh |\n| --- | --- | --- |\n"
    + "".join(f"| {at[:8]} | {role} | {title} |\n" for at, role, title, _ in chapters),
    encoding="utf-8",
)
spoken_file = DOC / "LOI_DAN_2026-11-01.md"
spoken_file.write_text(
    "# Lời dẫn video Góp — 01/11/2026\n\n"
    "Giọng tổng hợp tiếng Việt, nội dung bên dưới là bản lời dẫn đã ghép vào MP4. "
    "Tên kỹ thuật tiếng Anh chỉ để trên màn hình, lời đọc dùng từ Việt tương ứng.\n\n"
    + "".join(
        f"## {at[:8]} · {title} ({role})\n\n{by_id[scene_id]['text']}\n\n"
        for at, role, title, scene_id in chapters
    ),
    encoding="utf-8",
)
print("FINAL", final, final.stat().st_size, "bytes", timestamp(offset), flush=True)
