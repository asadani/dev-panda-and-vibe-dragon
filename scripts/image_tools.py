"""Decode validation and deterministic platform composition; no generative editing."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageOps


def check(paths):
    results = []
    for path in paths:
        with Image.open(path) as image:
            image.verify()
        with Image.open(path) as image:
            image.load()
            if image.format not in ('PNG', 'JPEG'):
                raise ValueError('Only PNG and JPEG artwork is supported')
            results.append({'file': str(path), 'width': image.width, 'height': image.height})
    return results


def instagram(source, target):
    # Keep the complete lettered panel; pad rather than cropping faces or dialogue.
    with Image.open(source) as image:
        image.load()
        canvas = Image.new('RGB', (1080, 1350), '#f7f2e8')
        artwork = ImageOps.contain(image.convert('RGBA'), (1080, 1350), Image.Resampling.LANCZOS)
        canvas.paste(artwork, ((1080-artwork.width)//2, (1350-artwork.height)//2), artwork)
        canvas.save(target, 'JPEG', quality=94, subsampling=0)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['check', 'instagram'])
    parser.add_argument('paths', nargs='+', type=Path)
    args = parser.parse_args()
    try:
        if args.mode == 'check':
            print(json.dumps(check(args.paths)))
        else:
            if len(args.paths) != 2:
                raise ValueError('instagram requires source and output paths')
            instagram(*args.paths)
    except Exception as exc:
        parser.exit(1, 'Image processing failed: %s\n' % exc)
