# Current local utility format

Run commands from `framework/`. Source of truth: its `scripts/studio.mjs`. Read its `validate`, `selectAngle`, and `packageEpisode` functions if fields change. These utilities do not call agents or image generation and cannot mark a reviewed package ready or publish it live.

## Initialize and select

`init <slug> --topic <text>` creates a date-prefixed episode directory under ignored `../.local/episodes/` with `episode.json`, `angles.json`, and `events.json`. Producer writes three objects into `angles.json` before using `select <episode-dir> <angle-id>`:

```json
{
  "angles": [
    {
      "id": "retry-bill",
      "title": "The agent works overtime",
      "situation": "An agent retries a failing task all night.",
      "motivation": "Panda wants to reduce the team's workload.",
      "payoff": "Both discover the infrastructure bill.",
      "panelCount": 3,
      "sourceIds": ["source-1"]
    }
  ]
}
```

This excerpt shows one object; production supplies three distinct angles. The CLI looks up `id` and copies the whole chosen object into `episode.angle`; editorial fields are consumed by agents, not schema-validated by the CLI.

## Episode and panel

### Integrated four-panel template

Use `template: "integrated-grid-v1"`, `layout: "grid"`, exactly four panels and square PNG/JPEG artwork. The master is 2048×2048 with no top header, exact series/footer text and organic editable SVG balloons over the artwork. Each panel has one speaking balloon, at most 12 words AND measured text fit. Add dialogue `bubble: {"x":0.05,"y":0.03,"w":0.90,"h":0.39}` plus `anchorY:0.62` (anchorX still required). Normalized balloon boxes must stay inside the upper 43%; anchorY is .43–.95. These are geometry bounds, not a guarantee the art leaves that region clear. Inspect actual horn/face clearance and speaker tails. Overflow fails; font never silently shrinks. Individual panel exports and a font-loaded whole-master 390px preview are produced.

For this template exact footerLeft is `Dev Panda & Vibe Dragon | in the AI era` and footerRight is `© {copyrightYear} Anuj Sadani`. The optional episode field `copyrightYear` must be an integer from 1900 to 9999. New episodes persist the current UTC year at initialization; older episodes without this field retain 2026 for reproducible historical credits. If supplied, `footerRight` must match that year exactly. Dialogue 85px gives about 16.2px at 390px whole-page width; footer is smaller secondary credit text. Original legacy formats below remain available for other requests.

Preserve initialized identity/timestamps. Supported renderer fields include:

```json
{
  "schemaVersion": 1,
  "id": "2026-09-25-retry-bill",
  "title": "Overtime",
  "topic": "Agent retry costs",
  "status": "angle_selected",
  "selectedAngle": "retry-bill",
  "layout": "vertical",
  "canonVersion": "editorial-ink-v2",
  "referenceImages": [],
  "retrievedMemory": ["canon", "preferences"],
  "panels": [
    {
      "id": "p1",
      "scene": "Panda sits left of Dragon at a desk; reserve clear space above both faces.",
      "alt": "Panda celebrates at a laptop while Dragon reads a large bill.",
      "art": "art/p1.png",
      "dialogue": [
        {"speaker": "Panda", "text": "It worked all night!", "anchorX": 0.25},
        {"speaker": "Dragon", "text": "So did the billing system.", "anchorX": 0.75}
      ]
    }
  ]
}
```

This is a format illustration, not approved story or art. Rendering requires real local artwork; production must include the exact chosen reference images and record the applicable canon version. The validator requires 1–6 panels; unique IDs; `scene` and `alt`; 0–2 dialogue balloons; speakers `Panda`, `Dragon`, or `Caption`; and `anchorX` from 0.05–0.95 for non-caption balloons. Artwork must be an episode-relative PNG/JPEG inside the episode directory. Layout is `auto`, `vertical`, or `grid`; explicit grids require four or six panels. `auto` attempts grid for those counts and falls back if text does not fit.

Balloon `anchorX` is a fraction of panel width. The legacy renderer puts lettering above the art and points tails down toward character positions; its legacy layouts do not accept arbitrary balloon boxes, anchorY, or props layers. The integrated template above supports its documented bubble geometry and anchorY. Convey additional creative directions through `scene` and the image prompts.

## Render, copy, package

Run `validate`, then `render`. After inspecting the rendered episode, write `copy.json` before `package`:

```json
{
  "titles": ["Overtime", "The overnight shift", "A very busy agent"],
  "description": "Panda's automation kept working. So did its costs.",
  "substack": "Replace this illustrative value with the actual 250–400-word body.",
  "linkedin": "Replace this illustrative value with the actual 1,100–1,400-character caption.",
  "linkedinHooks": ["The agent never stopped working.", "Automation does not make retries free."],
  "instagram": "The agent took the overnight shift. The bill arrived in the morning."
}
```

The short sample values intentionally demonstrate field names only and will not pass the copy length checks. No placeholders belong in a deliverable. Counts use whitespace-separated Substack words and JavaScript string length for LinkedIn. Copy requires exactly three titles and two alternate hooks.

Rendering creates hashed immutable output directories and sets `status: rendered`. Packaging requires an unchanged render/art/brand, creates a package manifest with `status: needs_review`, and sets episode status to `packaged_needs_review`. It does not make an independent-review judgment. Store review findings beside the episode; never claim the CLI validated humour, canon, or actual agent execution. Publishing is dry-run only. Angle replacement resets panels/render/package references; old generated artifacts remain on disk for history and must not be reused as current output without regeneration/review.
