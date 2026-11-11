# Security Policy

## Supported Versions

Security fixes and updates are actively provided for the latest minor and major releases:

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| < 1.2.0 | :x:                |

## Reporting a Vulnerability

The maintainers take security and privacy seriously. If you discover a security vulnerability or sensitive token leakage issue in `ebird-mcp`, please follow responsible disclosure practices:

1. **Do not create a public issue** on GitHub.
2. Report the vulnerability privately via GitHub's [Private Vulnerability Reporting](https://github.com/thesven/ebird-mcp/security/advisories/new) or by emailing the project maintainer at `thesven@users.noreply.github.com`.
3. Provide a clear description of the potential vulnerability, steps or code to reproduce it, and the impact.
4. We will acknowledge receipt of your report within 48 hours and work with you to release a patch promptly.

## Privacy & Credentials Design

`ebird-mcp` is designed as a local-first, stateless server:

- Your `EBIRD_API_KEY` is loaded in-memory and only communicated over encrypted HTTPS directly to `api.ebird.org`.
- All query parameters containing potential tokens are stripped or redacted in error messages and logs.
- No user sighting data, tokens, or queries are stored or transmitted to intermediate services.
