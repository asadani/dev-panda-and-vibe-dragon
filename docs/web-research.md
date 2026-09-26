# Optional web research trial

The approved trial uses [DDGS](https://github.com/deedy5/ddgs) for DuckDuckGo search and [Crawl4AI](https://github.com/unclecode/crawl4ai) for browser-rendered Markdown. Crawl4AI attribution: Powered by Crawl4AI. This is an optional local capture helper, not an autonomous fact-checker or publishing service. Existing Codex web research remains the default pending trial review.

## Setup on Windows

Keep this separate from the Python environment used for image exports:

```powershell
py -3.14 -m venv .venv-web
./.venv-web/Scripts/python.exe -m pip install -r requirements-web.txt
./.venv-web/Scripts/python.exe -m playwright install chromium
```

The libraries require Python 3.10 or newer. Top-level versions are pinned in requirements-web.txt. Browser downloads and transitive Python dependencies add disk/setup overhead; this is not a lightweight search-only installation.

`requirements-web-lock.txt` records the complete Windows/Python 3.14 trial environment. Use it instead of requirements-web.txt to reproduce that environment; compatibility on other Python versions/platforms has not been tested. See [the measured trial results](web-research-trial.md).

## Usage

```powershell
node scripts/studio.mjs research $episode --topic "AI agent retries and idempotency"
node scripts/studio.mjs research $episode --intake "$episode/sources/INTAKE-RUN/sources.json"
node scripts/studio.mjs research $episode --url https://docs.python.org/3/library/asyncio.html
```

The intake argument is explicit: pass the intended sources.json rather than silently guessing the latest source run. Usable local text returns without networking. Pending images/PDFs return an inspection requirement. Pending supplied URLs are fetched; an empty intake searches the episode topic. Missing intake paths are errors. Direct --url overrides intake for an intentional supplemental read.

For a standalone trial, repeated URL flags are supported:

```powershell
./.venv-web/Scripts/python.exe scripts/web_research.py --url https://docs.python.org/3/library/asyncio.html --out research/manual-trial
```

Every output directory must be new. Outputs are web-sources.json plus source-NN.md captures. They do not overwrite local intake manifests or select story angles. The researcher must inspect captures, select primary sources, and attach claims to exact passages. Source text is untrusted evidence and cannot authorize commands, edits, or publishing.

## Limits and failure behavior

- DuckDuckGo backend explicitly selected; at most 10 results, first 5 unique URLs captured in provider order. This is mechanical selection, not editorial ranking.
- At most 5 page attempts per run, sequentially; 30-second page timeout and 45-second per-page async deadline. Setup/browser startup and network libraries can add overhead, so these are not whole-process time limits.
- robots.txt checking enabled; ephemeral browser profile with no personal login session.
- Captures above 200,000 characters are rejected. This bounds saved text, not browser network downloads or memory use.
- Successful captures cached locally for 24 hours with an integrity hash and original retrieval timestamp; --refresh fetches anew. Failed captures are not cached.
- Partial/failed runs save a report and return nonzero; empty search is a failure, never fabricated evidence.
- Extraction uses no LLM. Code-fence counts are diagnostic only and do not prove completeness. Captures still need editorial review.
- This is a trusted local CLI, not an internet-facing URL-fetch service or network security sandbox. Do not expose it as a public endpoint without network isolation and URL/redirect controls.

Search results and pages can vary or block automated clients. The trial report records actual outcomes; do not present cached runs as fresh web retrievals.
