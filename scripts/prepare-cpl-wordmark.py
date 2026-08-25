from pathlib import Path

from PIL import Image


source = Path("/home/ubuntu/projects/chapman-app-f6c51d57/CPL LOGO.png")
target = Path(__file__).resolve().parents[1] / "assets/images/cpl-wordmark.png"

with Image.open(source) as logo:
    cropped = logo.convert("RGBA").crop((300, 65, 1370, 880))
    cropped.thumbnail((760, 580), Image.Resampling.LANCZOS)
    cropped.save(target, format="PNG", optimize=True, compress_level=9)
    print(f"Saved {target} ({target.stat().st_size} bytes)")
