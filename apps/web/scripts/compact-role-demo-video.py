"""Giữ khung thao tác thật, chỉ rút bớt đoạn màn hình đứng yên quá lâu."""

from pathlib import Path
import re
import subprocess
import sys


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "output/playwright/demo-nhat-ky-roles-2026-10-21-source.webm"
OUTPUT = ROOT / "docs/demo-local/demo-nhat-ky-roles-2026-10-21.mp4"


def seconds(value: str) -> float:
    hours, minutes, secs = value.split(":")
    return int(hours) * 3600 + int(minutes) * 60 + float(secs)


def main() -> None:
    ffmpeg = sys.argv[1]
    result = subprocess.run(
        [ffmpeg, "-hide_banner", "-loglevel", "info", "-i", str(SOURCE),
         "-vf", "freezedetect=n=-45dB:d=5", "-an", "-f", "null", "NUL"],
        capture_output=True, text=True, errors="replace", check=True,
    )
    times = re.findall(r"time=(\d\d:\d\d:\d\d\.\d+)", result.stderr)
    if not times:
        raise RuntimeError("Không đọc được thời lượng video gốc")
    duration = seconds(times[-1])
    frozen = []
    pending = None
    for kind, at in re.findall(r"lavfi\.freezedetect\.freeze_(start|end): ([\d.]+)", result.stderr):
        if kind == "start":
            pending = float(at)
        elif pending is not None:
            frozen.append((pending, float(at)))
            pending = None
    if pending is not None:
        frozen.append((pending, duration))

    cuts = [(start + 3.5, end - 0.5) for start, end in frozen if end - start > 7]
    spans = []
    position = 0.0
    for start, end in cuts:
        if start > position:
            spans.append((position, start))
        position = max(position, end)
    if position < duration:
        spans.append((position, duration))
    expr = "+".join(f"between(t,{start:.3f},{end:.3f})" for start, end in spans)
    kept = sum(end - start for start, end in spans)
    print(f"Source {duration:.1f}s; trimmed {len(cuts)} long still sections; kept ~{kept:.1f}s.", flush=True)
    subprocess.run(
        [ffmpeg, "-hide_banner", "-loglevel", "warning", "-y", "-i", str(SOURCE),
         "-vf", f"select='{expr}',setpts=N/(20*TB)", "-an", "-c:v", "libx264",
         "-preset", "veryfast", "-crf", "27", "-pix_fmt", "yuv420p", "-r", "20",
         "-movflags", "+faststart", str(OUTPUT)],
        check=True,
    )
    print(OUTPUT.name)


if __name__ == "__main__":
    main()
