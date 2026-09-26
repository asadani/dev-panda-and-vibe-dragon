# Production pipeline: explicit contracts and review evidence

Each production stage has an explicit task, goal, owner, independent reviewer and evidence-bound artifacts. Missing or stale reviews block downstream work. Run the commands below from `framework/`; episode workspaces live under ignored `../.local/episodes/`.

| Stage | Owner | Goal | Validation |
|---|---|---|---|
| Brief | Producer | One unambiguous interpretation of user intent | Requirements reviewer checks layout, exact footer, references, editing mode and acceptance criteria |
| Research | Researcher | Reliable factual premise | Fact checker binds used claims to sources and separates fiction |
| Story | Writer | Setup, consequence, reversal and earned payoff | Story editor challenges actual script, redundant beats and generic punchlines |
| Storyboard | Art director | Coherent visual acting and page plan | Visual editor compares references and verifies compositor capability |
| Artwork | Producer/image tool | Faithful execution of storyboard | Visual reviewer inspects actual images for identity, acting, continuity and exact text |
| Composition | Compositor | Requested layout and readable output | Layout reviewer inspects whole master at target display size, footer and reading order |
| Packaging | Publisher | All exports describe the current story | Release reviewer checks copy, sizes, hashes, revision and publication state |

Roles are bounded assignments within Codex, not always-on services. At most three independent specialists run concurrently. Producer integrates canonical files. Creators cannot validate their own outputs. The detailed [role contracts](../skills/comic-production/references/roles.md) specify tasks, outputs, evidence and repair criteria.

Before each stage advances, a review receipt must name the real reviewer, exact input hashes, each required check's result and evidence, limitations and unresolved issues. Missing/stale/pending/self-reviewed receipts fail. Changed upstream files invalidate downstream reviews. No numerical humour score and no promise that a reviewed story will engage readers.

## Implemented checks

`python scripts/pipeline.py init EPISODE` creates an empty contract, never a pass. Fill tasks/goals/owner identities and artifacts; write brief.json. `prepare --through STAGE` creates pending review fields and snapshots inputs. `check --through STAGE` validates all predecessors and current hashes. It also rejects script counts/layouts inconsistent with the brief and raster mode claiming editable lettering.

Studio render checks through artwork, package through composition, and publishing dry-run through package, when a pipeline contract exists. A production-hold.json blocks those operations even for legacy episodes. Legacy layout proofs without contracts continue to work; they do not gain production approval. The generation tool itself is outside the CLI: the skill requires a passing art-plan gate and no hold before invoking it.

Receipts are evidence records, not an authentication system: code cannot prove a reviewer actually looked at an image or that an artistic judgment is true. Honest role identities and precise coverage remain orchestration responsibilities.

## Composition and automation boundaries

The new integrated-grid-v1 compositor supports four square panels in a 2048px 2×2 master, organic editable SVG balloons, exact reference footer and a font-loaded 390px whole-page preview. It checks measured text fit without shrinking. Legacy formats remain supported. Artwork must reserve the balloon region; actual output still needs visual review.

There is no automated humour evaluator, agent scheduler or live publisher. Current review and orchestration happen inside Codex. Architecture diagrams summarize responsibilities; stage contracts define the executable checks.

Packaging includes each panel's scene description and exact speaker/dialogue. Automated checks cover this accessibility regression alongside stale reviews, modified exports, geometry and measured text fit.
