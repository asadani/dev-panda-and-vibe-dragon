# Web research when local input is absent

This fallback is explicitly requested by the user. The Producer assigns it to the Researcher using available web search and page-reading tools. The local intake CLI only reports the route; it does not invoke Codex tools or make network requests.

## Routing

- No source folder/files supplied, empty folder, whitespace-only files, or only unusable files: research online.
- Topic supplied: preserve that topic. Do not replace it with a trending unrelated subject.
- No topic supplied: discover relevant AI/software-engineering situations for the series, including agents, debugging, tests, infrastructure costs, production incidents and developer habits. Consult episode memory to avoid repeating recent jokes. Treat an automatically generated slug/title as bookkeeping, not a user topic.
- URLs or image/scanned-PDF inputs: inspect them first. No extracted text does not mean there is no usable input. If inspection fails or yields no relevant evidence, report it and fall back to web research.
- Bad path, permission error or truncated inventory: disclose the issue. Do not claim the folder is empty. If continuing with web research, retain the input warning and say local coverage was incomplete.

## Research and output

Start with recent sources from the last 30 days when discovering a topic. Broaden to 90 days or an evergreen engineering situation when recent material is weak; identify that choice rather than inventing a trend. Prefer original documentation, release notes, papers, issue discussions and firsthand engineering accounts. Read the actual pages, not just search snippets. Check publication/event dates before describing anything as new.

Aim for 2–4 relevant sources overall; a first-party document may establish its own narrow claim, but corroborate broad or disputed claims. Save URL, title, access date, publication date when known, supported facts with page/section/quote locators, and qualifications in the episode's source brief. Clearly separate fictional satire from reported events.

Return three story candidates/angles with sources and a recommendation. With no initial topic, each option can cover a different researched situation. The existing angle choice also selects the topic—do not add another checkpoint. After selection continue the normal script/art/package workflow.

If web tools are unavailable or searches fail, save a blocked-research brief with the real reason. Never fabricate sources or silently label an unresearched idea as researched. Do not publish as part of discovery.
