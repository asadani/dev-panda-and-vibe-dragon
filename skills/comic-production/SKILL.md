---
name: comic-production
description: Produce or revise a comic episode from a topic or source files using explicit agent contracts, evidence-backed review checkpoints, consistent references and platform packages.
---

# Comic production

Run from the user's Comic Studio project, identified by scripts/studio.mjs and series/, not the installed skill's parent. Read current corrections, series/dev-panda-vibe-dragon.md, relevant memory, [roles](references/roles.md), and [pipeline gates](references/pipeline-gates.md). Use [episode format](references/episode-format.md) for renderer fields and [memory mechanics](references/memory.md) for retrieval/sync.

Producer owns canonical writes and tool calls. Delegate bounded tasks with role, task, goal, inputs, outputs and validation. Creators cannot approve their own stage. Review actual artifacts; generic PASS without coverage is insufficient.

1. **Brief:** resolve format, exact footer, reference precedence, invariants, production mode, editing promise and acceptance criteria. Initialize pipeline contract. Honor user holds. Saved angle survives resume; latest corrections override older canon.
2. **Research:** inventory sources. When absent/unusable, use [web fallback](references/web-fallback.md). Missing paths are errors; inspect supplied URLs/images/PDFs first. Researcher provides evidence; Fact checker checks claims and uncertainty.
3. **Story:** Writer proposes three angles when selection is needed. Ask once unless user delegates choice. Write exact dialogue and visual beats; Story editor checks stakes, causality, reversal, payoff, voices and visible action. No generation with unresolved story findings.
4. **Art plan:** Art director supplies storyboard, acting, speaker placement, references and lettering plan. Visual editor checks against brief and actual compositor capabilities. No silent vertical-for-grid or raster-for-editable substitution. Check through art_plan before image calls.
5. **Artwork:** read available image-generation skill; only Producer calls built-in tool. Record prompts/references; Visual reviewer inspects actual art. At most two corrective attempts per failed panel/composite.
6. **Composition:** after artwork gate, render. Layout reviewer inspects actual whole page AND phone-width preview, exact footer/dialogue, grid, tails, crop and face visibility. Metadata font size alone is insufficient.
7. **Package:** Writer derives copy from final story (Substack250–400 words, LinkedIn1100–1400 characters plus two hooks, three titles, Instagram caption), transcript and alt text. Check through composition before packaging; Release reviewer checks actual exports and copy. CLI needs_review status is separate from review receipts and user acceptance.

Continue routine authorized work after selection without repeated permission. Pipeline-only requests generate no art. Two script repair rounds; unresolved issues remain needs-review. Rejected revisions invalidate downstream review and active exports. Preserve originals and history.

On resume inspect status, receipts and holds. Publishing remains dry-run/editor handoff only. Instagram JPEG conversion exists, but exports still require review. No external post is authorized merely by producing/approving a draft; no silent paid image-API fallback.
