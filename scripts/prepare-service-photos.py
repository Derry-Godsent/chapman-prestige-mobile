from pathlib import Path

from PIL import Image


SOURCE_IMAGES = {
    "service-photo-laundry.jpg": Path("/home/ubuntu/upload/search_images/Dj7MvoUGmldx.jpg"),
    "service-photo-cleaning.jpg": Path("/home/ubuntu/upload/search_images/q7jkSsdKhMTf.jpeg"),
    "service-photo-detailing.jpg": Path("/home/ubuntu/upload/search_images/w2ty7OzkF8cA.jpg"),
}
TARGET_DIRECTORY = Path("/home/ubuntu/chapman-prestige-client/assets/images")


def main() -> None:
    TARGET_DIRECTORY.mkdir(parents=True, exist_ok=True)
    for filename, source in SOURCE_IMAGES.items():
        image = Image.open(source).convert("RGB")
        image.thumbnail((1280, 900), Image.Resampling.LANCZOS)
        target = TARGET_DIRECTORY / filename
        image.save(target, format="JPEG", quality=84, optimize=True, progressive=True)
        print(f"Created {target.name}: {target.stat().st_size} bytes at {image.width}x{image.height}")


if __name__ == "__main__":
    main()
