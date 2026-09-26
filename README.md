# Dev Panda & Vibe Dragon

A comic series about building software in the AI era, and the framework used to produce it.

- [Comics catalog](comics/README.md): published issues organized by year/month and stable issue number, plus unnumbered drafts.
- [Production framework](framework/README.md): research, agent contracts, review gates, editable composition and platform exports.

```text
framework/                   # Code, tests, skills, docs, reusable art and fonts
comics/YYYY/MM/NNN-slug/      # Published comic.png, meta.json and details.md
comics/drafts/slug/           # Unnumbered drafts; no invented publication date
.local/                      # Ignored production work and generated packages
.local-archive/              # Ignored historical working material
```

## Development

```sh
cd framework
npm ci
python -m pip install -r requirements.txt
npm test
python -m unittest discover -s tests -p "test_*.py"
python -m unittest discover -s skills/comic-production/tests -p "test_*.py"
python scripts/catalog.py
```

Publishing adapters are not live. Exports and dry-run reports do not publish posts.

See [security and repository hygiene](framework/docs/security.md). Original artwork is retained unchanged; publication metadata is sourced from the public Substack archive. Article summaries are editorial catalog notes, not new verification of every historical claim.
