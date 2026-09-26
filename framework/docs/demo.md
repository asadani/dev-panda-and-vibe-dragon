# Public demo runbook

## Promise

Show how a topic becomes a character-driven comic, how its decisions can be inspected, and how the same episode is prepared for different publishing destinations. Do not claim that agent review guarantees humour or engagement.

## Preparation

- The current baseline has no visual studio UI or connected accounts. Use the detailed graphite references in the series pack and distinguish Codex generation from local CLI rendering.
- Retain the exact reference version in the episode brief.
- Prepare one source document, a completed episode, and a second version with a single dialogue correction.
- Confirm the CLI commands and renderer work on the presentation machine.
- Check local assets, fonts, network/tool availability, and the readable phone-size preview.
- Label prepared assets as a replay. Label publishing dry runs as dry runs.
- If demonstrating live publication later, verify the selected account and intended content in advance. Never display credentials.

For the implemented technical proof, change into `framework/` and install dependencies using its README setup commands and run `npm run demo`. It creates `../.local/episodes/<date>-layout-proof`, renders the historical logo as clearly labelled reused artwork, packages the outputs, and runs publishing dry runs. It demonstrates layout and export behaviour, not agent-written scenes or newly generated illustrations. Instagram files are padded 1080×1350 JPEGs; no account is contacted.

## Demonstration sequence

1. Introduce Panda and Dragon and show the shared series pack.
2. Supply a short document or topic in Codex. Show the source brief and three different angles.
3. Select an angle. Show script, review findings, and panel production stages in Codex and the filesystem. CLI initialization alone does not create those artifacts.
4. Show the finished comic at phone size, then LinkedIn, Instagram, and Substack export files. Show the padded 1080×1350 Instagram JPEGs and label all packages as awaiting final review; there is no ready-promotion command.
5. Change one line and re-render; explain that the artwork is reused.
6. Run a publishing dry run and show destination-specific preparation. Only show a live published URL when a real connected adapter has returned and verified it.
7. Record a specific preference or piece of feedback in a Markdown memory note. Show memory index/retrieval linking it to a decision without converting one observation into a permanent rule. There is no metrics-import command or automatic lesson promotion.

Image generation is variable in duration. A labelled replay can show already-generated panel art while a live run proceeds. Avoid a staged progress animation implying a generation occurred when it did not.

## Useful failure demonstration

Remove an art reference from a disposable sample or use an intentionally invalid sample. Show validation identifying the missing panel. Restore the sample and re-run validation. Do not damage a delivered episode for the demonstration.

## Honest closing

Explain which steps ran live, which used saved assets, and which platform integrations remain planned. The current prototype prepares publication packages and dry runs; it does not provide OAuth, live posting, or scheduling. Keep the next milestone concrete: repeatable reviewed production and one verified live publishing adapter.
