# Repository hygiene

The public repository contains the framework, original comic artwork, metadata and sanitized production rules. Runtime episodes, raw research, logs, local environments, credentials and conversational feedback are excluded by `.gitignore` and explicit staging.

## Audit on 2026-09-26

An independent reviewer inspected all available Git refs (82 unique blobs, approximately33.6MB), common credential signatures, remote configuration and PNG metadata. No credentials, private keys, JWTs, embedded session identifiers or local user paths were detected. A credential-like URL in a test is an intentional example.com fixture. Image metadata had no GPS/EXIF; some originals retained ordinary screenshot software/timestamps.

Personal editorial feedback was unnecessarily present in the initial commit. It has been removed from the current tree and retained only in ignored local storage. It remains in the initial public commit: this cleanup does not rewrite history or erase remote copies. No credential incident was identified.

This was a signature scan and manual inspection, not a guarantee against every secret format. Gitleaks/TruffleHog were unavailable; image text was not OCR-scanned. Review staged files before pushing. If a real secret is found, revoke/rotate it first and coordinate any history rewrite separately.

Git commits use the public GitHub noreply identity for `asadani`. Do not include co-author trailers.
