# Comics catalog

Published issues keep global issue numbers across years. Directories use the verified publication year/month. Exact dates are in meta.json. Creation dates remain null when unknown.

| Issue | Published | Comic |
|---|---|---|
| 001 | 2026-04-29 | [What is more important?](2026/04/001-what-is-more-important/details.md) |
| 002 | 2026-04-29 | [Fairness](2026/04/002-fairness/details.md) |
| 003 | 2026-04-30 | [Cheap Agents](2026/04/003-cheap-agents/details.md) |
| 004 | 2026-05-02 | [Tool Addiction](2026/05/004-tool-addiction/details.md) |
| 005 | 2026-05-04 | [The em dash](2026/05/005-the-em-dash/details.md) |
| 006 | 2026-05-07 | [The Calculator](2026/05/006-the-calculator/details.md) |
| 007 | 2026-05-13 | [LGTM](2026/05/007-lgtm/details.md) |

## Drafts

- [Apologise](drafts/apologise/details.md)
- [Seamless](drafts/seamless/details.md)

Each directory includes original artwork, meta.json and details.md. Details contain concise editorial summaries and source links. Drafts have no issue number or publication date. LGTM is numbered007 by archive order because its published title is unnumbered.

Validate with python framework/scripts/catalog.py from the repository root.

## Metadata contract

`meta.json` uses schema version1. Required fields are `issue`, `slug`, `title`, `author.name`, `status`, `createdAt`, `publishedAt`, `summary`, `tags`, `artwork`, `details` and `publications`. Dates use `YYYY-MM-DD`; unknown dates are `null`. `verification` records the source and inspection date. `alternateArtwork` may list additional preserved versions.

Published issues have a unique positive global number, a verified publication date and an HTTPS publication link. Drafts have `issue: null` and `publishedAt: null`. On publication, assign the next unused number and move the entire draft folder to its publication year/month; update metadata and this index together. Never renumber older issues or use a file timestamp as evidence of publication.

Asset paths are relative to the comic directory. `details.md` holds the longer description and source links; it can grow without turning the metadata into a prose document.
