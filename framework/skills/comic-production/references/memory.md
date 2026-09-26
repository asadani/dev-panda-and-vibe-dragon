# Memory mechanics

From `framework/`:

```powershell
python skills/comic-production/scripts/memory.py index --root .
python skills/comic-production/scripts/memory.py retrieve --root . --query "agents cost"
python skills/comic-production/scripts/memory.py sync --root . --dry-run
```

`index` emits a graph to stdout; redirect it only when a stored index is useful. `retrieve` emits current approved canon/preferences/lessons, ten recent episode summaries, and up to five additional topic matches. Save returned IDs in an episode manifest. Unknown dates remain unknown; imported historical episodes are not assigned invented publication dates.

Notes use flat YAML frontmatter whose values are JSON literals (valid YAML): `id`, `kind`, `status`, `title`, `date`, `tags`, `links`, `provenance`, and optionally `superseded_by`. This intentionally limited encoding lets the standard-library helper parse notes without a YAML dependency: quote strings and use JSON arrays/null; multiline YAML values and unquoted strings are unsupported. Use stable note IDs as link targets in metadata. Add body wikilinks using actual vault-relative note paths, such as `[[canon]]` or `[[history/tool-addiction]]`, for Obsidian Graph view; IDs alone are not Obsidian links. `index` reports missing links and rejects duplicate IDs. Indexes are derived; notes are authoritative.

Canon, preferences, and accepted lessons are operative only with `status: "approved"`, provenance, and no replacement in `superseded_by`. Proposals never become constraints because they match a query. Record an explicit user's ongoing preference directly with its source; a one-off selection or rejection remains feedback. No command auto-promotes proposals. Preserve superseded records.

Record supplied metrics with platform, observation window, captured date, and raw counts. Missing values are null/unknown, never zero. Keep observations separate from causal interpretations. Do not read a private vault or require Obsidian; `memory/` can be opened as an optional vault.

`sync --dry-run` previews installation into `$CODEX_HOME/skills/comic-production`, or `~/.codex/skills/comic-production`. Running without `--dry-run` copies only the skill. It refuses an existing installation; `--update` explicitly permits an update and first creates a timestamped backup. It never installs automatically during generation. `--destination` can select another skills root. The project references remain portable and resolve from the user's selected repository.

Tracked memory contains sanitized canon and public publication summaries. Keep private feedback, conversation transcripts, account data and machine/session details in ignored local storage. Publication metadata in `../comics/` is the authoritative archive; production logs remain in `../.local/episodes/`.
