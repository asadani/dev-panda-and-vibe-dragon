"""Validate the portable comic catalog without reading private production state."""
import argparse
import datetime as dt
import json
from pathlib import Path
import re

DEFAULT_CATALOG = Path(__file__).resolve().parents[2] / "comics"

def validate_catalog(root):
    root = Path(root).resolve()
    errors, records, issues = [], [], set()
    files = sorted(root.rglob("meta.json"))
    if not files:
        return ["No comic metadata found"], []
    for file in files:
        label = file.relative_to(root).as_posix()
        try:
            meta = json.loads(file.read_text(encoding="utf-8-sig"))
            if not isinstance(meta, dict):
                raise ValueError("metadata must be an object")
            if meta.get("schemaVersion") != 1:
                raise ValueError("unsupported schemaVersion")
            for key in ("title", "summary", "slug"):
                if not isinstance(meta.get(key), str) or not meta[key].strip():
                    raise ValueError(f"{key} is required")
            if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", meta["slug"]):
                raise ValueError("slug must be lowercase words separated by hyphens")
            if not isinstance(meta.get("author"), dict) or not meta["author"].get("name"):
                raise ValueError("author.name is required")
            if not isinstance(meta.get("tags"), list) or not all(isinstance(t, str) for t in meta["tags"]):
                raise ValueError("tags must be a list of strings")
            for field in ("createdAt", "publishedAt"):
                if field not in meta:
                    raise ValueError(f"{field} must be present; use null when unknown")
                if meta[field] is not None:
                    if not isinstance(meta[field], str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", meta[field]):
                        raise ValueError(f"{field} must be YYYY-MM-DD")
                    dt.date.fromisoformat(meta[field])
            issue = meta.get("issue")
            if meta.get("status") == "published":
                if type(issue) is not int or issue < 1 or issue in issues:
                    raise ValueError("published issue must be a unique positive integer")
                if not meta.get("publishedAt"):
                    raise ValueError("published comic needs a verified publication date")
                date = dt.date.fromisoformat(meta["publishedAt"])
                expected = f"{date.year:04d}/{date.month:02d}/{issue:03d}-{meta['slug']}"
                issues.add(issue)
                publications = meta.get("publications")
                if not isinstance(publications, dict) or not publications or not all(isinstance(v,str) and v.startswith("https://") for v in publications.values()):
                    raise ValueError("published comic needs HTTPS publication links")
            elif meta.get("status") == "draft":
                if issue is not None or meta.get("publishedAt") is not None:
                    raise ValueError("drafts must have null issue and publishedAt")
                expected = f"drafts/{meta['slug']}"
            else:
                raise ValueError("status must be draft or published")
            if file.parent.relative_to(root).as_posix() != expected:
                raise ValueError(f"expected directory {expected}")
            assets = [meta.get("artwork"), meta.get("details")] + meta.get("alternateArtwork", [])
            for name in assets:
                if not isinstance(name, str) or not name or Path(name).is_absolute():
                    raise ValueError("asset paths must be relative")
                target = (file.parent / name).resolve()
                try:
                    target.relative_to(file.parent.resolve())
                except ValueError:
                    raise ValueError("asset path escapes comic directory")
                if not target.is_file():
                    raise ValueError(f"missing asset: {name}")
            records.append(meta)
        except (ValueError, TypeError, OSError) as error:
            errors.append(f"{label}: {error}")
    return errors, records

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("catalog", nargs="?", type=Path, default=DEFAULT_CATALOG)
    args = parser.parse_args()
    errors, records = validate_catalog(args.catalog)
    print(json.dumps({"valid": not errors, "comics": len(records), "errors": errors}, indent=2))
    return bool(errors)

if __name__ == "__main__":
    raise SystemExit(main())
