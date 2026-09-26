# Production checkpoints

Run commands from `framework/`. `scripts/pipeline.py` validates review coverage and hashes, not humour, truth or actual agent execution. Producer must record genuine reviewer identities and evidence. No old prose review is auto-promoted.

```powershell
python scripts/pipeline.py init <episode-dir>
python scripts/pipeline.py prepare <episode-dir> --through brief
python scripts/pipeline.py check <episode-dir> --through art_plan
```

Fill pipeline.json with each stage's task, goal, actual ownerAgent and relative artifact paths. Include reference snapshots and the brief among declared inputs. Complete contract before reviewing; changes invalidate receipts. `prepare` snapshots all upstream inputs into reviews/STAGE.json with pending/not_inspected checks. It never approves anything and refuses overwrite. Archive obsolete receipts before preparing replacements. Independent reviewers provide evidence for every required check. Missing, stale, self-reviewed, uninspected and unresolved checks block progress.

Stages: brief, research, story, art_plan, artwork, composition, package. Checking through a stage checks every predecessor. For fiction-only work, research can explicitly document no news claims and invented premises; it still has an artifact and review.

The brief is always bound. From story onward, canonical episode.json is automatically bound; operational status/timestamp/render/package pointers are excluded so normal progress does not stale reviews. Artwork and later checkpoints also bind every panel art file automatically. Contract hashes include only stages through the checkpoint, so filling later-stage assignments does not invalidate earlier work. Composition automatically binds the actual lastRender tree; package binds lastPackage and current copy.json. Declared artifacts supplement these. Added, removed or edited output files and pointer swaps invalidate receipts. The validator still cannot infer actual inspection.

## Brief fields

topic/thesis, audience, selectedAngle, storyPromise, panelCount, rows, columns, readingOrder, footerLeft, footerRight, header policy, reference paths with roles/precedence, character invariants, intended display width, formats, productionMode, editing promise, user corrections and acceptance criteria.

Routermaxing currently requires four panels, two rows/two columns, one master, original footer, richer acting/texture using supplied Tool Addiction/Fairness, complete spectacles and wise mature Dragon. These are this episode's requirements; do not force this format on unrelated future requests.

## Execution boundaries

- Before generating: check through art_plan; honor production-hold.json. A user-requested hold is lifted only when user resumes production. Pipeline-fix turns generate no images.
- Before render: check through artwork. Before package: through composition. Before publishing dry run: through package. Studio enforces these when pipeline.json exists; a hold is enforced even for legacy episodes.
- Local checks cannot intercept arbitrary Codex image tool calls. Generation gating is a skill instruction, not a technical sandbox.
- Use integrated-grid-v1 for the implemented four-panel2x2 template with editable organic balloons and exact reference footer. See episode-format.md for geometry. Legacy above-art templates remain available for other layouts. Inspect actual artwork clearance; reserved regions in prompts are not guaranteed.
- productionMode is editable_composite or raster_composite. Raster mode must explicitly record non-editable lettering and require exact-text inspection. Do not silently promise editable SVGs for a generated full image.

## Revisions

Hash-bound receipts expire when declared upstream artifacts change. User rejection reopens the relevant stage; clear active render/package pointers and preserve old artifacts as history. Agent pass, user acceptance and publication are separate. Packaging success establishes none of them.
