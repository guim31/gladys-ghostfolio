# Ghostfolio for Gladys Assistant

A [Gladys Assistant](https://gladysassistant.com) integration that brings your
[Ghostfolio](https://ghostfol.io) (the open source wealth management software) into Gladys: net
worth, performance of the day, of the year and since the start, allocation by asset class and the
value of each account, with a scene trigger, a scene action and a dashboard widget.

It only reads: the integration never writes to Ghostfolio. Not affiliated with Ghostfolio.

## Features

- **Devices**: the portfolio (net worth, value of the holdings, invested, change today, since 1
  January and since the start, as an amount and in percent) and one per account (value, cash, share
  of the portfolio). Every amount is in the base currency of the Ghostfolio user.
- **Dashboard widget** "Ghostfolio overview": the figures of the portfolio, green or red, the
  allocation by asset class and the accounts added.
- **Scene trigger**: the net worth or the total performance reaches an all-time high (at most once a
  day per measure). A daily change beyond ±N % is the standard "device state change" trigger of
  Gladys on the feature "Change today (%)".
- **Scene action**: read the portfolio, as a sentence to send or read aloud.
- Texts in English, French, German and Spanish.

## Requirements

- Gladys Assistant 5.1 or later.
- A self-hosted Ghostfolio reachable from the Gladys host (tested with 3.88.0), and the security
  token of your Ghostfolio user (the one you sign in with; My Ghostfolio → Settings can generate a
  new one).

## Installation

1. In Gladys, open **Integrations → Install from GitHub** and enter
   `https://github.com/guim31/gladys-ghostfolio` (or install it from the catalog once it is listed).
2. In **Configuration**, enter the address of Ghostfolio and the security token, then save. **Test
   the connection** checks them.
3. Open the **Discover** tab and add the portfolio and the accounts you want: only the devices added
   are followed.

The user guide is in [`docs/en.md`](docs/en.md) ([français](docs/fr.md), [Deutsch](docs/de.md),
[español](docs/es.md)); Gladys links it from the Configuration screen.

## How it works

The security token is exchanged for a session token (`POST /api/v1/auth/anonymous`), kept in memory
and renewed when Ghostfolio refuses it. Every 15 minutes by default (5 to 60), the container reads
`api/v1/user` (base currency), `api/v2/portfolio/performance` for the ranges `1d`, `ytd` and `max`,
`api/v1/portfolio/details` (allocation) and `api/v1/account`. It publishes only the values that
changed, re-sends them every 12 hours, and fires the scene trigger. The highest net worth and
performance are kept under `/data` with the id of the Ghostfolio user, so a restart fires nothing
twice.

Money is private: the logs never hold an amount, an account name, the token or the address of the
server, even at debug level.

## Limitations

- Read only; one Ghostfolio user (the one of the token). The cloud of Ghostfolio (ghostfol.io)
  should work with its address, but was not tested.
- The figures follow Ghostfolio's own refresh of the quotes and its cache.
- Developed and tested against a real Ghostfolio 3.88.0 in Docker (accounts, assets with manual
  quotes and activities imported through its API), not yet on a Gladys installation with a real
  portfolio: feedback welcome.

## Development

```bash
npm ci
npm run format:check && npm run lint && npm test
npx -y github:GladysAssistant/integration-store --skip-image-check .
```

The tests run against the fake Gladys of the SDK and a fake Ghostfolio serving answers recorded on
Ghostfolio 3.88.0 (`test/fixtures/ghostfolio`, fictitious data). See [`CLAUDE.md`](CLAUDE.md) for
the rules of the project.

## Credits

- [Ghostfolio](https://github.com/ghostfolio/ghostfolio) by Thomas Kaul and contributors
  (AGPL-3.0): this integration only uses its REST API; no code is copied from it. The logo on the
  cover is Ghostfolio's, from its repository.
- The Ghostfolio integration of Home Assistant (HACS) was the reference of the request; no code is
  copied from it.
- Built on the [Gladys integration SDK](https://github.com/GladysAssistant/integration-sdk-js) and
  the official JavaScript template.

## License

[Apache 2.0](LICENSE).
