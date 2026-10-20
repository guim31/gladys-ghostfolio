// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys, a fake Ghostfolio serving the
// answers recorded on Ghostfolio 3.88.0 (test/fixtures/ghostfolio), a manual
// clock, a temporary /data, and the integration wired on top through
// registerHandlers. Nothing touches the network.
// -----------------------------------------------------------------------------

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';
import { Store } from '../../src/store.js';

process.env.LOG_LEVEL ??= 'silent';
process.env.TZ = 'Europe/Paris';

export const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));
export const TOKEN = 'test-security-token-0000';
export const URL_BASE = 'http://192.0.2.10:3333';
export const CONFIG = { url: URL_BASE, token: TOKEN };
export const JWT = fixture('ghostfolio/auth.json').authToken;

// The answers were recorded on 20/10/2026 in the morning, Paris time.
export const START = Date.parse('2026-10-20T09:00:00+02:00');

const ROUTES = {
  'v1/user': 'user.json',
  'v2/portfolio/performance?range=1d': 'performance-1d.json',
  'v2/portfolio/performance?range=ytd': 'performance-ytd.json',
  'v2/portfolio/performance?range=max': 'performance-max.json',
  'v1/portfolio/details': 'details.json',
  'v1/account': 'accounts.json',
};

/**
 * Fake Ghostfolio. `api.down`: 'network' (connection refused), 'certificate',
 * a status (500, 502) or false. `api.body(route)` gives the answer to change;
 * `api.expireSession()` makes the current session token refused once.
 */
export function createApi() {
  const bodies = new Map();
  let validJwt = JWT;
  const api = {
    down: false,
    // A route a reverse proxy refuses with 403, whatever the session.
    forbidden: null,
    requests: [],

    body(route) {
      if (!bodies.has(route)) {
        bodies.set(route, fixture(`ghostfolio/${ROUTES[route]}`));
      }
      return bodies.get(route);
    },

    /** The `performance` object of a range (1d, ytd, max). */
    performance(range) {
      return api.body(`v2/portfolio/performance?range=${range}`).performance;
    },

    expireSession() {
      validJwt = `${JWT}.renewed`;
    },

    async request(input, options = {}) {
      const url = new URL(input);
      const route = `${url.pathname.replace(/^\/api\//, '')}${url.search}`;
      api.requests.push({ route, method: options.method ?? 'GET', options });
      if (api.down === 'network') {
        throw Object.assign(new Error('connect ECONNREFUSED 192.0.2.10:3333'), {
          code: 'ECONNREFUSED',
        });
      }
      if (api.down === 'certificate') {
        throw Object.assign(new Error('self-signed certificate'), {
          code: 'DEPTH_ZERO_SELF_SIGNED_CERT',
        });
      }
      if (api.down) {
        return { status: api.down, headers: {}, body: '<html>Bad gateway</html>' };
      }
      if (route === 'v1/auth/anonymous') {
        if (options.method !== 'POST' || options.body?.accessToken !== TOKEN) {
          return { status: 403, headers: {}, body: '{"statusCode":403,"message":"Forbidden"}' };
        }
        return { status: 201, headers: {}, body: JSON.stringify({ authToken: validJwt }) };
      }
      if (route === api.forbidden) {
        return { status: 403, headers: {}, body: '{"statusCode":403,"message":"Forbidden"}' };
      }
      if (options.headers?.authorization !== `Bearer ${validJwt}`) {
        return { status: 401, headers: {}, body: '{"statusCode":401,"message":"Unauthorized"}' };
      }
      if (!ROUTES[route]) {
        return { status: 404, headers: {}, body: '{"statusCode":404,"message":"Not Found"}' };
      }
      return { status: 200, headers: {}, body: JSON.stringify(api.body(route)) };
    },

    /** Routes requested so far, in order. */
    routes() {
      return api.requests.map(({ route }) => route);
    },
  };
  return api;
}

/** A manual clock. */
export function createClock(start = START) {
  const clock = {
    time: start,
    now: () => clock.time,
    advance(ms) {
      clock.time += ms;
    },
  };
  return clock;
}

/**
 * @param {object} [options]
 * @param {object} [options.config] raw integration config
 * @param {Array} [options.devices] devices already created in Gladys
 * @param {object} [options.api] from createApi
 * @param {boolean} [options.connect]
 */
export async function createWorld({
  config = CONFIG,
  devices = [],
  api = createApi(),
  connect = true,
  clock = createClock(),
  dataDir = mkdtempSync(join(tmpdir(), 'gladys-ghostfolio-')),
} = {}) {
  const gladys = createFakeGladys({ config, devices });
  const store = new Store(dataDir);
  const app = registerHandlers(gladys, {
    store,
    request: api.request,
    timers: false,
    now: clock.now,
  });
  if (connect) {
    await gladys.connect();
    await app.ready;
    await app.monitor.running;
  }
  return { gladys, fake: gladys.fake, app, monitor: app.monitor, api, clock, store, dataDir };
}

/** Create discovered devices in Gladys, as the user would (all, or those matching). */
export async function createAll(world, filter = () => true) {
  const devices = world.fake.discoveredDevices.filter(filter);
  for (const device of devices) {
    await world.fake.deviceCreated(device);
  }
  return devices;
}

/** The discovered device of a Ghostfolio object: type and id (any id when omitted). */
export const deviceOf = (world, type, id) =>
  world.fake.discoveredDevices.find((device) =>
    id === undefined
      ? device.external_id.includes(`:${type}:`)
      : device.external_id.endsWith(`:${type}:${id}`),
  );

/** External id of one feature of a device. */
export const featureId = (device, key) =>
  device.features.find((feature) => feature.external_id.endsWith(`:${key}`))?.external_id;

/** Run one refresh cycle, `minutes` later. */
export async function cycle(world, minutes = 15) {
  world.clock.advance(minutes * 60 * 1000);
  await world.monitor.runCycle();
}

/**
 * Capture the integration's log lines at `level` and above (LOG_LEVEL is read
 * at every call). Returns the lines as `{ level, text }`.
 */
export function captureLogs(t, level = 'info') {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  const lines = [];
  const record = (...args) => {
    const text = args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' ');
    const match = /^\[[^\]]+\] \[(\w+)\]/.exec(text);
    lines.push({ level: match ? match[1].toLowerCase() : 'raw', text });
  };
  t.mock.method(console, 'log', record);
  t.mock.method(console, 'error', record);
  t.after(() => {
    process.env.LOG_LEVEL = previous;
  });
  return lines;
}
