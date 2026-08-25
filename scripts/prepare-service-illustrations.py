from pathlib import Path

from PIL import Image


SOURCE = Path("/home/ubuntu/webdev-static-assets")
DESTINATION = Path("/home/ubuntu/chapman-prestige-client/assets/images")
SERVICES = ("laundry", "cleaning", "fabric", "fumigation", "detailing", "polytank")


def main() -> None:
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for service in SERVICES:
        source = SOURCE / f"chapman-illustration-{service}.png"
        destination = DESTINATION / f"service-{service}.jpg"
        image = Image.open(source).convert("RGB")
        image.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
        image.save(destination, "JPEG", quality=84, optimize=True, progressive=True)
        print(destination)


if __name__ == "__main__":
    main()
