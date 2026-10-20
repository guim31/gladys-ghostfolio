// -----------------------------------------------------------------------------
// What the integration writes to `docker logs`: at info, only the lifecycle
// (the start, Ghostfolio lost and back, a scene trigger, a user action),
// never one line per refresh cycle; a failure that repeats at every cycle is
// logged once, plus one line when it is over. Money is private: no amount, no
// account name, no token and no server address, even at debug.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG,
  JWT,
  URL_BASE,
  captureLogs,
  createAll,
  createApi,
  createWorld,
  cycle,
} from './helpers/world.js';

const strip = (line) => line.text.replace(/^\[[^\]]+\] /, '');

async function world(t, options = {}) {
  const w = await createWorld(options);
  t.after(() => w.app.stop());
  return w;
}

test('the start is one info line', async (t) => {
  const lines = captureLogs(t, 'info');
  await world(t);
  assert.deepEqual(lines.map(strip), ['[INFO] [ghostfolio] Started: Ghostfolio read every 15 min']);
});

test('normal refresh cycles write nothing at info', async (t) => {
  const w = await world(t);
  await createAll(w);
  const lines = captureLogs(t, 'info');
  w.api.performance('1d').netPerformanceWithCurrencyEffect = -12.5;
  for (let i = 0; i < 4; i += 1) {
    await cycle(w);
  }
  assert.deepEqual(lines, []);
});

test('a scene trigger is one info line, without amount', async (t) => {
  const w = await world(t);
  await createAll(w);
  const lines = captureLogs(t, 'info');
  w.api.performance('max').currentNetWorth = 9000;
  await cycle(w);
  assert.deepEqual(lines.map(strip), [
    '[INFO] [ghostfolio] Scene trigger: All-time high (net_worth)',
  ]);
});

test('Ghostfolio down at every cycle: one warning, then one line at recovery', async (t) => {
  const api = createApi();
  const w = await world(t, { api });
  const lines = captureLogs(t, 'info');
  api.down = 502;
  for (let i = 0; i < 4; i += 1) {
    await cycle(w);
  }
  assert.deepEqual(lines.map(strip), ['[WARN] [ghostfolio] Ghostfolio answered HTTP 502']);
  api.down = false;
  await cycle(w);
  assert.deepEqual(lines.slice(1).map(strip), ['[INFO] [ghostfolio] Ghostfolio answers again']);
});

test('even at debug: no amount, no account name, no token, no address', async (t) => {
  const lines = captureLogs(t, 'debug');
  const api = createApi();
  const w = await world(t, { api });
  await createAll(w);
  await cycle(w);
  await w.fake.action('check_now', {});
  await w.fake.sceneAction('read_portfolio', {});
  api.expireSession();
  await cycle(w);
  api.down = 'network';
  await cycle(w);
  await w.fake.configUpdated({ ...CONFIG, token: 'wrong-token' });
  // Without the timestamp, which can hold any digits.
  const text = lines.map(strip).join('\n');
  assert.ok(lines.length > 5);
  for (const secret of [
    CONFIG.token,
    JWT,
    'wrong-token',
    URL_BASE,
    '192.0.2.10',
    'Compte titres',
    'PEA',
    'US Broker',
    '5629',
    '5 629',
    '4079',
    '532',
  ]) {
    assert.ok(!text.includes(secret), `"${secret}" in the logs`);
  }
});
