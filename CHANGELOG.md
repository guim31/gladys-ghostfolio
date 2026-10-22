# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.1] - 2026-10-22

### Security

- Rebuilt on Node.js 24.22.1, the October 2026 security release (remote code
  execution in the Brotli decoder, CVE-2026-111497; TLS hostname and DNS
  fixes).

## [1.0.0] - 2026-10-20

### Added

- First version of the Ghostfolio integration, read only, with the security token of the user.
- A portfolio device: net worth, value of the holdings, invested, change today, since 1 January
  and since the start, as an amount and in percent.
- One device per account: value, cash and share of the portfolio.
- A dashboard widget "Ghostfolio overview": figures of the portfolio, allocation by asset class and
  accounts.
- A scene trigger "all-time high" on the net worth or on the total performance.
- A scene action "read the portfolio", and a connection test in the configuration.
- Texts and documentation in English, French, German and Spanish.

[Unreleased]: https://github.com/guim31/gladys-ghostfolio/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/guim31/gladys-ghostfolio/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/guim31/gladys-ghostfolio/releases/tag/v1.0.0
