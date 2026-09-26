# Dev Panda & Vibe Dragon: Comic Studio

A Codex-assisted production workflow for turning technical topics and source material into character-driven comics and platform-specific publishing packages.

Dev Panda is a curious junior developer. Vibe Dragon is an experienced principal engineer. They maintain the same software product, learn from one another, and occasionally get things wrong together.

## What this project is building

The studio separates creative work from predictable production operations:

- Codex coordinates research, story writing, independent review, and reference-guided image generation.
- Local utilities preserve episode state, render exact lettering and branding, validate packages, and prepare platform exports.
- Project-local memory records approved canon, explicit preferences, episode history, and evidence-backed decisions.
- Publishing adapters will eventually connect approved packages to creator accounts.

The first release is a **local prototype**, not a hosted service. Publishing is limited to exports and dry-run preparation. There is no OAuth connection, live posting, scheduler, or visual studio interface. A standalone Node process cannot invoke Codex's built-in image-generation tool.

## Workflow

Production checkpoints require explicit role/task/goal contracts and independent evidence tied to artifact hashes. See [the production pipeline](docs/production-pipeline.md). The revised Routermaxing pilot completed all seven review checkpoints locally. Generated episodes, publishing packages, research captures and local environments are excluded from this framework repository.

1. Supply a topic or source folder in Codex.
   If the folder has no usable input, Codex researches the topic on the web. With neither sources nor a topic, it discovers relevant AI/software story candidates and presents three choices. Intake reports this route; web research runs through the Codex Researcher, not the standalone CLI.
2. Review three story angles and select one.
3. Produce a structured script, illustrations, and a rendered strip.
4. Check the result at phone size and inspect the review findings.
5. Export the comic, individual panels, captions, transcript, and platform packages.
6. Publish manually and record the publication outcome separately.

**Reference selection belongs in each episode brief.** The earlier [Bold Ink reference](assets/characters/bold-ink-v1/reference-sheet.png) remains available, but the latest pilot uses the detailed graphite treatment from Tool Addiction and Fairness. Current user corrections take precedence over older defaults. Panda keeps his spectacles; Dragon reads as a mature, wise senior colleague without looking elderly. Existing comics remain historical examples.

## Local command interface

An opt-in **DDGS + Crawl4AI web research trial** is available via `research <episode-dir>`. See [setup, intake routing, limits, and evidence outputs](docs/web-research.md). It uses a separate environment and does not replace the default Codex Researcher yet.

Run these commands from the repository root with Node 20+ and Python 3.9+. The renderer uses `@resvg/resvg-js` and `fontkit`; Python image validation and Instagram export use Pillow, and PDF text extraction uses `pypdf`. None of the CLI commands calls an LLM or generates artwork.

```powershell
npm install
python -m pip install pillow pypdf
npm test
python -m unittest discover -s tests -p "test_*.py"
python -m unittest discover -s skills/comic-production/tests -p "test_*.py"
```

Initialize an episode and retain its actual date-prefixed directory:

```powershell
$episode = node scripts/studio.mjs init agent-retries --topic "When an AI agent retries forever"
node scripts/studio.mjs status $episode
node scripts/studio.mjs intake $episode README.md
```

In Codex, use [the production skill](skills/comic-production/SKILL.md) to develop the source brief, populate `angles.json`, and choose an angle. The following sequence assumes angle `angle-1` exists, `episode.json` contains the completed script and local PNG/JPEG art, and `copy.json` contains the publishing copy:

```powershell
node scripts/studio.mjs select $episode angle-1
node scripts/studio.mjs validate $episode
node scripts/studio.mjs render $episode
node scripts/studio.mjs package $episode
node scripts/studio.mjs publish $episode --platform linkedin --dry-run
node scripts/studio.mjs publish $episode --platform instagram --dry-run
node scripts/studio.mjs publish $episode --platform substack --dry-run
```

`status` prints the stored episode JSON. Packages deliberately remain `needs_review`; there is no CLI command that promotes them to ready or published. Instagram exports are 1080×1350 JPEGs with padding that preserves the full panel; exports are not uploads. Intake records URLs for later web reading and images for later visual inspection; it does not fetch URLs or perform OCR.

To exercise rendering, packaging, and publishing dry runs with a clearly labelled layout proof:

```powershell
npm run demo
```

The demo writes to `episodes/<date>-layout-proof` and reuses the historical logo as sample art. It does not generate new scenes or establish approved character canon.

Inspect memory and preview skill installation with:

```powershell
python skills/comic-production/scripts/memory.py index --root .
python skills/comic-production/scripts/memory.py retrieve --root . --query "agent retries"
python skills/comic-production/scripts/memory.py sync --root . --dry-run
```

Omit `--dry-run` to explicitly install the skill into the local Codex skills directory. Existing installations require `--update`, which creates a backup. Memory metrics import and automatic lesson promotion are not implemented.

## Architecture and demonstration

Read [architecture and contracts](docs/architecture.md), [demo runbook](docs/demo.md), and the editable diagrams:

- [Architecture SVG](docs/diagrams/architecture.svg) · [Mermaid source](docs/diagrams/architecture.mmd)
- [Workflow SVG](docs/diagrams/workflow.svg) · [Mermaid source](docs/diagrams/workflow.mmd)
- [Memory SVG](docs/diagrams/memory.svg) · [Mermaid source](docs/diagrams/memory.mmd)

For a public demo, distinguish live generation, previously generated assets, and publishing dry runs explicitly. A prepared package is not a published post.
