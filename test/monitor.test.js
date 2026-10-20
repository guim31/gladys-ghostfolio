// -----------------------------------------------------------------------------
// The monitor against a fake Ghostfolio serving the recorded answers: the
// requests, the devices and their states, the all-time high trigger, the
// connection status, the container's own timer, and what is kept under /data.
// -----------------------------------------------------------------------------

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import {
  CONFIG,
  JWT,
  TOKEN,
  createAll,
  createApi,
  createWorld,
  cycle,
  deviceOf,
  featureId,
} from './helpers/world.js';
import { registerHandlers } from '../src/app.js';
import { Store } from '../src/store.js';

async function world(t, options = {}) {
  const w = await createWorld(options);
  t.after(() => w.app.stop());
  return w;
}

const ACCOUNT = 'd6fdd6fb-8f61-4c27-82f4-11de4b80feee';
const last = (w, type, key, id) => w.fake.lastState(featureId(deviceOf(w, type, id), key));
const highs = (w) => w.fake.sceneEvents.filter((event) => event.key === 'all_time_high');

test('one sign-in, then the read-only endpoints with the session token', async (t) => {
  const w = await world(t);
  const [auth, ...reads] = w.api.requests;
  assert.equal(auth.route, 'v1/auth/anonymous');
  assert.equal(auth.method, 'POST');
  assert.deepEqual(auth.options.body, { accessToken: TOKEN });
  assert.deepEqual(
    reads.map((request) => request.route),
    [
      'v1/user',
      'v2/portfolio/performance?range=1d',
      'v2/portfolio/performance?range=ytd',
      'v2/portfolio/performance?range=max',
      'v1/portfolio/details',
      'v1/account',
    ],
  );
  for (const request of reads) {
    assert.equal(request.method, 'GET');
    assert.equal(request.options.headers.authorization, `Bearer ${JWT}`);
  }
  // The next cycle keeps the session.
  await cycle(w);
  assert.equal(w.api.routes().filter((route) => route === 'v1/auth/anonymous').length, 1);
});

test('an expired session is renewed once, in the same cycle', async (t) => {
  const w = await world(t);
  w.api.expireSession();
  await cycle(w);
  assert.equal(w.api.routes().filter((route) => route === 'v1/auth/anonymous').length, 2);
  assert.equal(w.fake.connectionStatus.connected, true);
});

test('a path refused with a fresh session is not blamed on the token', async (t) => {
  const api = createApi();
  api.forbidden = 'v1/account';
  const w = await world(t, { api });
  assert.equal(w.fake.connectionStatus.connected, false);
  assert.match(w.fake.connectionStatus.message.en, /does not answer like the API/);
  assert.equal(api.routes().filter((route) => route === 'v1/auth/anonymous').length, 2);
});

test('the portfolio and every account are discovered, polled by the container', async (t) => {
  const w = await world(t);
  const names = w.fake.discoveredDevices.map((device) => device.name);
  assert.deepEqual(names, ['Ghostfolio', 'Compte titres', 'My Account', 'PEA', 'US Broker']);
  for (const device of w.fake.discoveredDevices) {
    assert.equal(device.should_poll, false);
    assert.equal(device.poll_frequency, undefined);
  }
  const portfolio = deviceOf(w, 'portfolio');
  assert.ok(portfolio.external_id.endsWith(':portfolio:00000000-0000-4000-8000-000000000001'));
  assert.equal(portfolio.features.find((f) => f.external_id.endsWith(':net_worth')).unit, 'euro');
});

test('only the devices added get states, with the values of Ghostfolio', async (t) => {
  const w = await world(t);
  assert.equal(w.fake.states.length, 0);
  await createAll(w);
  assert.equal(last(w, 'portfolio', 'net_worth'), 5629.83);
  assert.equal(last(w, 'portfolio', 'value'), 4079.33);
  assert.equal(last(w, 'portfolio', 'invested'), 3579.33);
  assert.equal(last(w, 'portfolio', 'day_change'), 20.68);
  assert.equal(last(w, 'portfolio', 'day_percent'), 0.54);
  assert.equal(last(w, 'portfolio', 'ytd_change'), 211.37);
  assert.equal(last(w, 'portfolio', 'ytd_percent'), 6.15);
  assert.equal(last(w, 'portfolio', 'total_change'), 532.2);
  assert.equal(last(w, 'portfolio', 'total_percent'), 23.9);
  assert.equal(last(w, 'account', 'value', ACCOUNT), 979.33);
  assert.equal(last(w, 'account', 'cash', ACCOUNT), 445.15);
  assert.equal(last(w, 'account', 'share', ACCOUNT), 17.4);
});

test('an unchanged cycle publishes nothing, a new change of the day publishes only it', async (t) => {
  const w = await world(t);
  await createAll(w);
  const before = w.fake.states.length;
  await cycle(w);
  assert.equal(w.fake.states.length, before);
  w.api.performance('1d').netPerformancePercentageWithCurrencyEffect = -0.021;
  await cycle(w);
  assert.equal(w.fake.states.length, before + 1);
  assert.equal(last(w, 'portfolio', 'day_percent'), -2.1);
});

test('the container reads Ghostfolio on its own timer, without onPoll', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const api = createApi();
  const gladys = createFakeGladys({ config: { ...CONFIG, refresh_interval: '30' } });
  const app = registerHandlers(gladys, {
    store: new Store(mkdtempSync(join(tmpdir(), 'gladys-ghostfolio-'))),
    request: api.request,
  });
  t.after(() => app.stop());
  await gladys.connect();
  await app.ready;
  await app.monitor.running;
  const first = api.routes().filter((route) => route === 'v1/account').length;
  t.mock.timers.tick(30 * 60 * 1000);
  await app.monitor.running;
  assert.equal(first, 1);
  assert.equal(api.routes().filter((route) => route === 'v1/account').length, 2);
});

test('onDeviceCreated publishes the states of the new device and refreshes the widget', async (t) => {
  const w = await world(t);
  const refreshes = w.fake.widgetRefreshes.length;
  w.clock.advance(20000);
  await w.fake.deviceCreated(deviceOf(w, 'account', ACCOUNT));
  assert.equal(last(w, 'account', 'value', ACCOUNT), 979.33);
  assert.equal(w.fake.widgetRefreshes.length, refreshes + 1);
});

test('all-time high: the chart is the start, then one event per measure and per day', async (t) => {
  const w = await world(t);
  await createAll(w);
  // First reading: today's net worth (cash included) beats the chart, but is the start.
  assert.deepEqual(highs(w), []);
  assert.deepEqual(w.monitor.data.highs.net_worth, { value: 5629.83, day: null });
  assert.deepEqual(w.monitor.data.highs.performance, { value: 23.9, day: null });

  w.api.performance('max').currentNetWorth = 5700;
  await cycle(w);
  assert.equal(highs(w).length, 1);
  const [event] = highs(w);
  assert.equal(event.data.measure, 'net_worth');
  assert.equal(event.data.value, 5700);
  assert.equal(event.data.previous, 5629.83);
  assert.equal(event.data.currency, 'EUR');
  assert.equal(event.data.device, deviceOf(w, 'portfolio').external_id);
  assert.match(
    event.data.text.replace(/\s/g, ' '),
    /patrimoine au plus haut historique, 5 700,00 €/,
  );

  // Higher again the same day: no second event, but the high follows.
  w.api.performance('max').currentNetWorth = 5800;
  await cycle(w);
  assert.equal(highs(w).length, 1);
  assert.equal(w.monitor.data.highs.net_worth.value, 5800);

  // The total performance beats 23.93 % (the chart's high before today).
  w.api.performance('max').netPerformancePercentageWithCurrencyEffect = 0.25;
  await cycle(w);
  assert.equal(highs(w).length, 2);
  assert.equal(highs(w)[1].data.measure, 'performance');
  assert.equal(highs(w)[1].data.currency, '%');

  // The next day, a new high fires again.
  w.api.performance('max').currentNetWorth = 5900;
  await cycle(w, 24 * 60);
  assert.equal(highs(w).length, 3);
});

test('all-time high: the chart counts when it is above the first reading', async (t) => {
  const api = createApi();
  api.performance('max').netPerformancePercentageWithCurrencyEffect = 0.2;
  const w = await world(t, { api });
  await createAll(w);
  assert.equal(w.monitor.data.highs.performance.value, 23.79);
  api.performance('max').netPerformancePercentageWithCurrencyEffect = 0.2379;
  await cycle(w);
  assert.deepEqual(highs(w), []);
});

test('all-time high: nothing for a portfolio not added, the high still follows', async (t) => {
  const w = await world(t);
  w.api.performance('max').currentNetWorth = 9000;
  await cycle(w);
  assert.deepEqual(highs(w), []);
  assert.equal(w.monitor.data.highs.net_worth.value, 9000);
});

test('all-time high: a failed event is sent again, a restart fires nothing twice', async (t) => {
  const dataDir = mkdtempSync(join(tmpdir(), 'gladys-ghostfolio-'));
  const api = createApi();
  const w = await createWorld({ api, dataDir });
  await createAll(w);
  api.performance('max').currentNetWorth = 6000;
  const publish = w.gladys.publishSceneEvent;
  w.gladys.publishSceneEvent = async () => {
    throw new Error('Gladys is restarting');
  };
  await cycle(w);
  assert.deepEqual(highs(w), []);
  w.gladys.publishSceneEvent = publish;
  await cycle(w);
  assert.equal(highs(w).length, 1);
  await w.app.stop();

  const again = await createWorld({ api, dataDir, devices: w.fake.discoveredDevices });
  t.after(() => again.app.stop());
  await cycle(again);
  assert.deepEqual(highs(again), []);
  assert.equal(again.monitor.data.highs.net_worth.value, 6000);
});

test('another Ghostfolio user starts its highs over', async (t) => {
  const w = await world(t);
  w.api.performance('max').currentNetWorth = 9000;
  await cycle(w);
  w.api.body('v1/user').id = 'another-user';
  w.api.performance('max').currentNetWorth = 100;
  await cycle(w);
  assert.equal(w.monitor.data.user, 'another-user');
  assert.equal(w.monitor.data.highs.net_worth.value, 3630.44);
});

test('connection status: token refused, unreachable, certificate, then back', async (t) => {
  const w = await world(t, { config: { ...CONFIG, token: 'wrong' } });
  assert.equal(w.fake.connectionStatus.connected, false);
  assert.match(w.fake.connectionStatus.message.fr, /refuse le jeton de sécurité/);
  assert.deepEqual(w.fake.discoveredDevices, []);

  await w.fake.configUpdated(CONFIG);
  assert.equal(w.fake.connectionStatus.connected, true);
  const devices = w.fake.discoveredDevices.length;

  w.api.down = 'network';
  await cycle(w);
  assert.equal(w.fake.connectionStatus.connected, false);
  assert.match(w.fake.connectionStatus.message.en, /does not answer/);
  assert.equal(w.fake.discoveredDevices.length, devices, 'the devices stay');

  w.api.down = 'certificate';
  await cycle(w);
  assert.match(w.fake.connectionStatus.message.en, /self-signed certificate/);

  w.api.down = false;
  await cycle(w);
  assert.equal(w.fake.connectionStatus.connected, true);
});

test('no address: the status says so, nothing is requested', async (t) => {
  const w = await world(t, { config: {} });
  assert.equal(w.api.requests.length, 0);
  assert.equal(w.fake.connectionStatus.connected, false);
  assert.match(w.fake.connectionStatus.message.en, /Enter the address/);
});

test('an address without the API of Ghostfolio is told apart', async (t) => {
  const api = createApi();
  api.down = 404;
  const w = await world(t, { api });
  assert.match(w.fake.connectionStatus.message.en, /does not answer like the API/);
});

test('a reconnection publishes the devices and the states again', async (t) => {
  const w = await world(t);
  await createAll(w);
  const before = w.fake.states.length;
  await w.gladys.disconnect();
  await w.gladys.connect();
  assert.ok(w.fake.states.length > before);
});

test('"Update" in the Discover tab publishes the states again', async (t) => {
  const w = await world(t);
  const [device] = await createAll(w, (d) => d.external_id.endsWith(`:account:${ACCOUNT}`));
  const before = w.fake.states.length;
  await w.fake.deviceUpdated(device);
  assert.equal(w.fake.states.length, before + 3);
});

test('another server: the data of the previous one is dropped', async (t) => {
  const w = await world(t);
  assert.ok(w.monitor.snapshot);
  w.api.down = 'network';
  await w.fake.configUpdated({ ...CONFIG, url: 'http://192.0.2.99:3333' });
  assert.equal(w.monitor.snapshot, null);
});
