// -----------------------------------------------------------------------------
// The dashboard widget, the scene action and the configuration action, on the
// recorded answers of Ghostfolio, checked with the SDK's widget validator.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { CONFIG, createAll, createApi, createWorld, cycle } from './helpers/world.js';

async function world(t, options = {}) {
  const w = await createWorld(options);
  t.after(() => w.app.stop());
  return w;
}

// Intl separates thousands and currencies with narrow no-break spaces.
const plain = (value) => JSON.parse(JSON.stringify(value).replace(/[\u00a0\u202f]/g, ' '));

async function widget(w, language) {
  const { success, data } = await w.fake.widgetGet('overview', { language });
  assert.equal(success, true);
  assert.deepEqual(validateWidgetContent(data.content), []);
  return plain(data.content);
}

test('the widget shows the portfolio, the allocation and the accounts added', async (t) => {
  const w = await world(t);
  await createAll(w, (device) => !device.name.startsWith('My Account'));
  const data = await widget(w, 'fr');
  assert.equal(data.ttl_seconds, 300);
  const [status, accounts, footer] = data.components;
  assert.deepEqual(
    status.items.map((item) => [item.label, item.value, item.color]),
    [
      ['Patrimoine', '5 629,83 €', undefined],
      ['Investi', '3 579,33 €', undefined],
      ["Aujourd'hui", '+20,68 € (+0,54 %)', 'success'],
      ['Cette année', '+211,37 € (+6,15 %)', 'success'],
      ['Depuis le début', '+532,20 € (+23,90 %)', 'success'],
      ['Actions', '46,8 %', undefined],
      ['Liquidités', '35,5 %', undefined],
      ['Obligations', '17,8 %', undefined],
    ],
  );
  assert.equal(accounts.type, 'card-list');
  assert.deepEqual(
    accounts.items.map((item) => [item.title, item.subtitle, item.badge.text]),
    [
      ['Compte titres', '3 300,00 €', '59 %'],
      ['PEA', '1 350,50 €', '24 %'],
      ['US Broker', '979,33 €', '17 %'],
    ],
  );
  assert.equal(footer.variant, 'caption');
  assert.match(footer.text, /^Ghostfolio · Lu le 20\/10 09:00$/);
  assert.ok(data.components.filter((c) => c.type === 'text').length <= 2);
  assert.ok(data.components.length <= 8);
});

test('a loss is red, with its sign, in English', async (t) => {
  const w = await world(t);
  await createAll(w);
  w.api.performance('1d').netPerformanceWithCurrencyEffect = -48.1;
  w.api.performance('1d').netPerformancePercentageWithCurrencyEffect = -0.0118;
  await cycle(w);
  const [figures] = (await widget(w, 'en')).components;
  assert.deepEqual(figures.items[2], {
    label: 'Today',
    value: '-€48.10 (-1.18%)',
    icon: 'activity',
    color: 'danger',
  });
});

test('the widget before the portfolio is added, and before any answer', async (t) => {
  const w = await world(t);
  assert.equal((await widget(w, 'de')).components[0].text, 'Füge das Portfolio hinzu');
  const refused = await world(t, { config: { ...CONFIG, token: 'wrong' } });
  assert.deepEqual((await widget(refused, 'es')).components, [
    { type: 'text', variant: 'heading', text: 'Token de seguridad rechazado' },
  ]);
  const empty = await world(t, { config: {} });
  assert.equal((await widget(empty, 'fr')).components[0].text, "Configurez l'intégration");
  const api = createApi();
  api.down = 'network';
  const down = await world(t, { api });
  assert.equal((await widget(down, 'en')).components[0].text, 'Ghostfolio does not answer');
});

test('deleting a device refreshes the widget', async (t) => {
  const w = await world(t);
  const [device] = await createAll(w);
  w.clock.advance(20000);
  const refreshes = w.fake.widgetRefreshes.length;
  await w.fake.deviceDeleted(device);
  assert.equal(w.fake.widgetRefreshes.length, refreshes + 1);
});

test('read_portfolio tells the net worth and the changes', async (t) => {
  const w = await world(t);
  const { success, data } = await w.fake.sceneAction('read_portfolio', {});
  assert.equal(success, true);
  assert.deepEqual(plain(data.outputs), {
    text: "Portefeuille : 5 629,83 €. Aujourd'hui +20,68 € (+0,54 %), depuis le 1er janvier +6,15 %, depuis le début +23,90 %.",
    net_worth: 5629.83,
    day_change: 20.68,
    day_percent: 0.54,
    ytd_percent: 6.15,
    total_percent: 23.9,
  });
});

test('the scene action reads Ghostfolio again when the last reading is old', async (t) => {
  const w = await world(t);
  const reads = () => w.api.routes().filter((route) => route === 'v1/account').length;
  await w.fake.sceneAction('read_portfolio', {});
  assert.equal(reads(), 1);
  w.clock.advance(16 * 60 * 1000);
  await w.fake.sceneAction('read_portfolio', {});
  assert.equal(reads(), 2);
});

test('the scene action fails with the reason when the token is refused', async (t) => {
  const w = await world(t, { config: { ...CONFIG, token: 'wrong', language: 'en' } });
  const { success, error } = await w.fake.sceneAction('read_portfolio', {});
  assert.equal(success, false);
  assert.match(String(error?.message ?? error), /refuses the security token/);
});

test('check_now tests the connection and says what Ghostfolio holds', async (t) => {
  const w = await world(t);
  const { success, data } = await w.fake.action('check_now', {});
  assert.equal(success, true);
  assert.equal(
    plain(data).message.fr,
    'Connecté à Ghostfolio : patrimoine 5 629,83 €, 4 compte(s), devise de base EUR.',
  );
  w.api.down = 502;
  const failed = await w.fake.action('check_now', {});
  assert.match(plain(failed.data).message.en, /does not answer/);
});
