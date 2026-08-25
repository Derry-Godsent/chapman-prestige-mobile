from pathlib import Path

from PIL import Image


project_root = Path(__file__).resolve().parents[1]
source = Path("/home/ubuntu/projects/chapman-app-f6c51d57/CPL LOGO.png")
targets = [
    project_root / "assets/images/icon.png",
    project_root / "assets/images/splash-icon.png",
    project_root / "assets/images/favicon.png",
    project_root / "assets/images/android-icon-foreground.png",
]

with Image.open(source) as logo:
    droplet = logo.convert("RGBA").crop((690, 55, 1325, 735))
    droplet.thumbnail((830, 830), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (1024, 1024), "#001452")
    offset = ((1024 - droplet.width) // 2, (1024 - droplet.height) // 2)
    canvas.alpha_composite(droplet, offset)
    export = canvas.convert("RGB").quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    for target in targets:
        export.save(target, format="PNG", optimize=True, compress_level=9)
        print(f"{target.name}: {target.stat().st_size} bytes")
