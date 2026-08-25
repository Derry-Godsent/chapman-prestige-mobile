from pathlib import Path

from PIL import Image


project_root = Path(__file__).resolve().parents[1]
source = Path("/home/ubuntu/webdev-static-assets/chapman-prestige-icon.png")
targets = [
    project_root / "assets/images/icon.png",
    project_root / "assets/images/splash-icon.png",
    project_root / "assets/images/favicon.png",
    project_root / "assets/images/android-icon-foreground.png",
]

with Image.open(source) as original:
    rendered = original.convert("RGBA").resize((512, 512), Image.Resampling.LANCZOS)
    quantized = rendered.convert("RGB").quantize(colors=96, method=Image.Quantize.MEDIANCUT)
    for target in targets:
        quantized.save(target, format="PNG", optimize=True, compress_level=9)
        print(f"{target.name}: {target.stat().st_size} bytes")
