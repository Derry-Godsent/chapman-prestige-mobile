from pathlib import Path

from PIL import Image


SOURCE = Path("/home/ubuntu/projects/chapman-app-f6c51d57/CPL LOGO.png")
TARGET = Path("/home/ubuntu/chapman-prestige-client/assets/images/cpl-original-logo.jpg")
MAX_SIZE = (960, 640)


def main() -> None:
    image = Image.open(SOURCE).convert("RGB")
    image.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    image.save(TARGET, format="JPEG", quality=88, optimize=True, progressive=True)
    print(f"Created {TARGET} at {TARGET.stat().st_size} bytes ({image.width}x{image.height})")


if __name__ == "__main__":
    main()
