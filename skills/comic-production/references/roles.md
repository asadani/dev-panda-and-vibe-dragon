# Agent contracts

These are responsibilities, not a requirement to spawn seven agents at once. Producer owns canonical writes, integration and image calls. Specialists return proposals/findings. Use at most three specialists concurrently on independent work. A creator cannot validate their own stage; one independent specialist may inspect multiple stages separately.

Every assignment states **role, task, goal, episode/revision, input paths, required output, acceptance checks, forbidden changes and retry limit**. Every response identifies actual inspected artifacts, evidence locators, findings, limitations and unresolved issues. A generic PASS is insufficient.

| Owner role | Task → goal | Output | Independent validator |
|---|---|---|---|
| Producer | Resolve latest request and conflicting references → one binding production brief | brief.json, reference inventory, revision log | Requirements reviewer: intent, format, references, exact footer, acceptance criteria |
| Researcher | Establish only facts needed by story → grounded premise | Claim/source/locator mapping, dates, uncertainty, fictional elements | Fact checker: source support, qualifications, fact/inference/fiction distinction |
| Writer | Dramatize a conflict → a consequence and satisfying reversal | Selected angle, exact script, motivations and visible action per panel | Story editor: stakes, causality, reversal, payoff, distinct voices, visual action |
| Art director | Translate script into a page before generation → coherent composition | Storyboard, expressions, poses, speaker placement, references and prompt plan | Visual editor: composition, identity, acting, lettering feasibility, reference match |
| Producer | Generate approved storyboard → faithful actual artwork | Images, prompts, references, attempt log | Visual reviewer: actual images, identity, acting, continuity, text accuracy |
| Compositor | Build requested master → correct layout and readable lettering | Master, actual phone-width whole-page preview, transcript, editable sources if promised | Layout reviewer: panel count/grid, exact footer, reading order, phone preview |
| Publisher (packaging only) | Adapt current revision → coherent exports | Captions, alt text, platform files, hash manifest | Release reviewer: copy alignment, formats, hashes, revision freshness, publication state |

## Story editor: evidence, not a humour score

Name panels and explain each judgment. What does a character want? What goes wrong? Does each panel change the situation or repeat an explanation? What expectation is overturned? Does the ending pay off the actual setup and selected angle's promise? Could the last line fit any unrelated comic? Are voices distinct? What does the image add beyond the transcript?

Panda can be right and Dragon can have a blind spot. Vary acting and framing; avoid repeated seated talking heads. Generic advice, redundant panels and a missing visual payoff require specific repair. A review pass is an editorial judgment, not proof of humour, engagement or user approval.

## Visual review

Inspect actual images beside named references. Check Panda's complete spectacles; Dragon's maturity, silhouette and proportions; expressions/gestures; visual clutter; prop logic; tails and reading order. State whether each reference controls identity, style, layout or footer. Latest user corrections override older defaults. Character uplift requires recorded art-direction choices, not an arbitrary redesign.

Compare exact final text with script and exact footer with brief. Inspect the final WHOLE IMAGE at intended display width, not merely separate panel previews or calculated font size. If a requested grid is unreadable, shorten dialogue or revise composition; never silently substitute a vertical strip.

## Repair handoffs

Brief → research → story → storyboard → artwork → composition → package. Return failed checks to their owner with actionable repairs. Changed inputs invalidate affected and downstream reviews. Two script-repair rounds and two corrective image attempts per failed panel/composite; unresolved issues stay needs-review. Do not manufacture a pass. See [pipeline gates](pipeline-gates.md).
