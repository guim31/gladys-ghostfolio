# Ghostfolio

Bring your investments into Gladys: the net worth, the performance of the day, of the year and since the start,
the allocation by asset class and the value of each account, read from your own
[Ghostfolio](https://ghostfol.io), the open source wealth management software.

The integration only reads: it never writes to Ghostfolio, never creates an activity. It talks to your
Ghostfolio directly on your network, with the security token of your user. Not affiliated with Ghostfolio.

## What you get

- One **portfolio device**: net worth (cash included), value of the holdings, amount invested, and the change
  of the day, since 1 January and since the start, as an amount and in percent, with their history.
- One **device per account** (broker, bank, crypto wallet…): its value, its cash and its share of the
  portfolio.
- A **dashboard widget**: the figures of the portfolio, the allocation by asset class and the accounts added.
- A **scene trigger**: the net worth, or the total performance, reaches an all-time high.
- A **scene action**: read the portfolio, as a sentence to send by message or have read aloud.
- A daily change beyond ±N % is the standard device trigger of Gladys (see the scene examples).

Every amount is in the base currency of your Ghostfolio user: Ghostfolio converts the other currencies.

## Requirements

- Gladys Assistant 5.1 or later.
- A recent Ghostfolio (tested with 3.88.0), self-hosted and reachable from the Gladys host (same network,
  VPN or a public address).
- The security token of your Ghostfolio user.

## Configuration

### Finding the security token

The security token is the one you sign in to Ghostfolio with: Ghostfolio shows it once, when the account
is created. If you did not keep it, open **My Ghostfolio → Settings** and generate a new one (the old one
then stops working, also for signing in). An account created with Google or OpenID sign-in can generate one
there too.

### Settings

In Gladys, open **Integrations → Ghostfolio → Configuration**:

- **Address of Ghostfolio**: the address you open Ghostfolio with, for example `http://192.168.1.20:3333`.
  Without `http://`, it is added.
- **Security token**: the token above. Gladys keeps it; the integration never writes it to its logs.
- **Accept a self-signed certificate**: only for an `https` address whose certificate you made yourself.
- **Refresh interval**: 5 to 60 minutes, 15 by default. Ghostfolio updates its quotes by itself.
- **Language of the texts**: the names of the features (given when a device is added) and the sentences sent
  to the scenes. French by default.

Save, then **Test the connection**: the message gives the net worth, the number of accounts and the base
currency. Open the **Discover** tab and add the portfolio and the accounts you want: only the devices added
are followed.

## Devices

**Portfolio** (named "Ghostfolio"):

| Feature                         | What it is                                                    |
| ------------------------------- | ------------------------------------------------------------- |
| Net worth                       | Value of the holdings plus the cash of the accounts           |
| Value                           | Value of the holdings                                         |
| Invested                        | Amount invested (purchases minus sales)                       |
| Change today / Change today (%) | Net performance of the day, fees and currency effect included |
| Change this year (and %)        | Net performance since 1 January                               |
| Total performance (and %)       | Net performance since the first activity                      |

**Account** (named as in Ghostfolio): **Value** (holdings and cash of the account), **Cash**, and **Share of
the portfolio** in percent.

The figures are the ones Ghostfolio shows with the currency effect. Renaming an account in Ghostfolio keeps
its device.

## Dashboard widget

Add the **Ghostfolio overview** widget to a dashboard: net worth, invested, change today, this year and since
the start (green for a gain, red for a loss), then the share of each asset class (equities, fixed income,
cash…), and the accounts added with their value and share. The footer gives the time of the last reading.

## Scene triggers

**Ghostfolio: all-time high**, with the measure to follow:

- **Net worth**: the net worth beats its highest value. A deposit counts too.
- **Total performance (%)**: the total performance beats its highest value; deposits do not move it.

The highest value comes from the chart of Ghostfolio when the portfolio is first read, then follows each
new high. The event fires at most once a day per measure, however long the rise. Variables: the new high,
the previous one, the unit (currency code or `%`) and a ready-made sentence.

## Scene actions

**Ghostfolio: read the portfolio** answers with a sentence, for example "Portfolio: €5,629.83. Today +€20.68
(+0.54%), this year +6.15%, since the start +23.90%." Outputs: the sentence, the net worth, the change of the
day (amount and percent), the change of the year and the total performance in percent. Ghostfolio is read again
when the last reading is older than the refresh interval.

## Scene examples

- **Daily summary**: every evening at 6 pm, "Ghostfolio: read the portfolio", then send the sentence by
  Telegram.
- **Big move**: trigger "Device state change" on the feature **Change today (%)** of the portfolio, above 3
  (and a second scene below -3), with "Execute only when threshold is passed": a notification when markets
  move.
- **Celebrate**: "Ghostfolio: all-time high" on the total performance, then a light in green and the sentence
  read aloud.

## Privacy and data

- The integration reads `api/v1/user`, `api/v2/portfolio/performance` (ranges 1d, ytd and max),
  `api/v1/portfolio/details` and `api/v1/account`. It only signs in with the security token
  (`api/v1/auth/anonymous`) and never writes to Ghostfolio.
- The logs never hold an amount, an account name, the token or the address of the server, even at debug
  level.
- Under `/data`, the integration keeps the id of the Ghostfolio user, the two highest values and the day of
  the last event, so a restart fires nothing twice.
- Your values stay between Gladys and your Ghostfolio: no third-party service.

## Troubleshooting

- **"Ghostfolio refuses the security token"**: the token was renewed, or mistyped. Generate a new one in My
  Ghostfolio → Settings and paste it again.
- **"Ghostfolio does not answer"**: check the address from the Gladys host (`curl http://…/api/v1/health`
  should answer `{"status":"OK"}`). The last values are kept.
- **"This address does not answer like the API of Ghostfolio"**: the address points to something else (a
  reverse proxy page, another port).
- **The figures do not move**: Ghostfolio updates its quotes itself; check its own page. A change of the day
  stays at 0 when markets are closed.
- More details: set `LOG_LEVEL=debug` on the integration and read its logs.

## Limits

- Read only; one Ghostfolio user (the one of the token). Ghostfolio's cloud (ghostfol.io) should work with
  its address, but was not tested.
- The figures follow Ghostfolio's refresh of the quotes and its cache: a few minutes late at times.
- The all-time high of the chart is sampled by Ghostfolio for long periods: a high between two points of the
  chart can be missed at the very first reading.
- Developed and tested against a real Ghostfolio 3.88.0 in Docker, with fictitious accounts and assets, not
  yet on a Gladys installation with a real portfolio: feedback welcome.
- Not affiliated with Ghostfolio.
