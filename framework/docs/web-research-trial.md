# Web research trial — 2026-09-25

Decision: retain DDGS + Crawl4AI as an opt-in local research adapter. The trial demonstrates working retrieval on this Windows machine, not reliable research without review. Do not replace Codex's default web research yet.

## Environment

Windows, isolated Python 3.14 environment; DDGS 9.16.0, Crawl4AI 0.9.4, Playwright 1.63.0 and headless Chromium. `pip check` reported no broken requirements. Installation took several minutes and initially encountered a package-host DNS retry. Existing Python 3.9 image tools remain separate. Full dependency versions are in requirements-web-lock.txt.

## Live observations

| Input | Capture result | Per-page time | Review |
| --- | --- | --- | --- |
| Anthropic engineering: Building effective agents | 21,534 characters | 6.41 seconds | Article headings, publication date, and current editorial note present |
| Playwright Python installation docs | 5,184 characters | 2.30 seconds | Installation commands and Python example present; 18 fence delimiters (9 fenced blocks), extra whitespace |
| Playwright GitHub README | 15,985 characters | 4.53 seconds | README and examples present; GitHub navigation/sign-in/file controls also retained |
| Quotes to Scrape JavaScript page | 1,506 characters | 3.32 seconds | Ten JavaScript-rendered quote entries present |

Times are measured around individual page capture, excluding initial imports/browser startup. This is one run per page, not a comparative benchmark. The original runtime captures are local-only and are not distributed with this repository.

DDGS query: `AI agent retries idempotency engineering`. The first five unique result URLs were attempted; four captured and one failed DNS resolution. The run returned `partial` with a nonzero exit code and preserved the individual error. Results included secondary/vendor articles; provider rank is not a primary-source or factual-quality guarantee. These pages are test material, not approved comic evidence.

A repeat of the documentation URL used its cached capture, retaining the original timestamp and hash. An HTTP-error URL produced a failed report rather than evidence; Crawl4AI classified its empty error page as anti-bot content, so error labels themselves need interpretation.

The Node `research` command was also exercised with a local-intake manifest. It returned `use_local_sources` with no network operation. Automated coverage includes intake routing, missing input, URL validation, cache integrity/expiry, page cap, partial evidence, search failure, and overwrite refusal.

## Before default adoption

1. Have the researcher select primary-source URLs from search results before capture, instead of relying on the first five results.
2. Improve main-content extraction for GitHub and similar pages without dropping code examples. Preserve the original snapshot when deriving cleaner text.
3. Recheck retrieval over multiple topics/runs; one successful DDGS query does not establish availability.
4. Keep claim verification and source locators in the researcher workflow. Successful extraction does not mean an article is complete, current, or correct.

The adapter is useful now for explicit URL capture and experimental discovery. No story, image, or social post was created by this trial.
