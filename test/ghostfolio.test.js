// -----------------------------------------------------------------------------
// The pure parts of the client and of the configuration: the address, the
// numbers of the API, the allocation, the accounts and the chart, on the real
// answers of test/fixtures/ghostfolio and on the shapes of older versions.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, parseUrl } from '../src/config.js';
import { accountsOf, allocationOf, amountOf, historyOf, percentOf } from '../src/ghostfolio.js';
import { fixture } from './helpers/world.js';

test('the address: scheme added, /api and slashes removed, credentials refused', () => {
  assert.equal(parseUrl('192.0.2.10:3333'), 'http://192.0.2.10:3333');
  assert.equal(parseUrl('https://gf.example.org/api/'), 'https://gf.example.org');
  assert.equal(parseUrl('https://example.org/ghostfolio/'), 'https://example.org/ghostfolio');
  assert.equal(parseUrl('http://user:pass@192.0.2.10'), null);
  assert.equal(parseUrl(''), null);
});

test('the configuration is normalized', () => {
  assert.deepEqual(normalizeConfig({}), {
    url: null,
    invalidUrl: false,
    token: '',
    insecure: false,
    refreshMinutes: 15,
    language: 'fr',
  });
  const config = normalizeConfig({
    url: ' 192.0.2.10:3333 ',
    token: ' abc ',
    allow_self_signed: 'true',
    refresh_interval: '60',
    language: 'es',
  });
  assert.equal(config.url, 'http://192.0.2.10:3333');
  assert.equal(config.token, 'abc');
  assert.equal(config.insecure, true);
  assert.equal(config.refreshMinutes, 60);
  assert.equal(config.language, 'es');
  assert.equal(normalizeConfig({ refresh_interval: '7', language: 'it' }).refreshMinutes, 15);
});

test('amounts to the cent, ratios as percentages', () => {
  assert.equal(amountOf(532.2024580168725), 532.2);
  assert.equal(amountOf(-0.001), 0);
  assert.equal(amountOf(null), null);
  assert.equal(amountOf('x'), null);
  assert.equal(percentOf(0.23898559500507593), 23.9);
  assert.equal(percentOf(-0.0054), -0.54);
  assert.equal(percentOf(undefined), null);
});

test('the allocation by asset class adds up the holdings, cash included', () => {
  const allocation = allocationOf(fixture('ghostfolio/details.json'));
  assert.deepEqual(allocation, [
    { assetClass: 'EQUITY', percent: 46.79 },
    { assetClass: 'LIQUIDITY', percent: 35.45 },
    { assetClass: 'FIXED_INCOME', percent: 17.76 },
  ]);
  // Ghostfolio 2: holdings keyed by symbol, the class on the holding itself.
  assert.deepEqual(
    allocationOf({
      holdings: {
        A: { assetClass: 'EQUITY', allocationInPercentage: 0.75 },
        B: { assetClass: 'COMMODITY', allocationInPercentage: 0.25 },
      },
    }),
    [
      { assetClass: 'EQUITY', percent: 75 },
      { assetClass: 'COMMODITY', percent: 25 },
    ],
  );
  assert.deepEqual(allocationOf({}), []);
});

test('the accounts: value, cash and share in the base currency', () => {
  const accounts = accountsOf(fixture('ghostfolio/accounts.json'));
  assert.equal(accounts.length, 4);
  assert.deepEqual(
    accounts.find((account) => account.name === 'US Broker'),
    {
      id: 'd6fdd6fb-8f61-4c27-82f4-11de4b80feee',
      name: 'US Broker',
      value: 979.33,
      cash: 445.15,
      share: 17.4,
    },
  );
  assert.deepEqual(accountsOf({ accounts: [{ id: 'x', name: 'Old', isExcluded: true }] }), []);
});

test('the highs of the chart are the ones before today', () => {
  const body = fixture('ghostfolio/performance-max.json');
  const history = historyOf(body, '2026-10-20');
  assert.equal(history.netWorth, 3630.44);
  assert.equal(history.percent, 23.79);
  assert.deepEqual(historyOf({ chart: [] }, '2026-10-20'), { netWorth: null, percent: null });
});
