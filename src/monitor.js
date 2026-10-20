// -----------------------------------------------------------------------------
// The monitor: reads Ghostfolio every `refresh_interval` minutes, publishes
// the devices and their states, fires the scene trigger and serves the widget
// and the actions.
//
// Devices are published with should_poll: false: the container runs its own
// timer (the core only polls up to one minute, and see the 5.2.0 trap in
// CLAUDE.md). Only the devices added in Gladys get states, the trigger, and a
// place in the widget and the actions: the Discover tab is where the user
// picks what Gladys shows.
//
// Trigger `all_time_high`: the net worth, or the total performance in
// percent, beats its highest value. The highest value is the one of the chart
// of Ghostfolio when the portfolio is first read (that first reading is the
// starting point, not news), then each new high; at most one event per
// measure and per day, however long the rise. Kept under /data with the id of
// the Ghostfolio user: a restart fires nothing twice, another user starts over.
// A daily change beyond ±N % is the standard "device state" trigger of Gladys
// on the feature "Change today (%)" (see the documentation).
//
// Money is private: the logs only ever hold counts and states, never an
// amount, a name or the address of the server.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { DEVICE_TYPES, buildDevice, deviceIds } from './devices.js';
import {
  GhostfolioClient,
  NotGhostfolioError,
  UnauthorizedError,
  isCertificateError,
  localDay,
} from './ghostfolio.js';
import { PHRASES, STATUS, formatAmount, formatPercent, render } from './texts.js';

const logger = createLogger({ name: 'ghostfolio' });

export const WIDGET_KEY = 'overview';
export const TRIGGERS = { HIGH: 'all_time_high' };

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const DEFAULT_TIMINGS = {
  heartbeatMs: 12 * HOUR,
  // requestWidgetRefresh is rate-limited to one call every 10 s by the core.
  widgetRefreshMs: 10000,
};

// The measures of the all-time high trigger: the figure of the portfolio and
// the highest one of the chart.
const MEASURES = {
  net_worth: { current: (p) => p.netWorth, history: (h) => h.netWorth },
  performance: { current: (p) => p.totalPercent, history: (h) => h.percent },
};

export class Monitor {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the SDK fake)
   * @param {object} options.store see src/store.js
   * @param {Function} [options.request] httpRequest (the tests pass a fake Ghostfolio)
   * @param {boolean} [options.timers] false: no background timer (tests drive the cycles)
   * @param {Function} [options.now] clock in ms
   * @param {object} [options.timings] overrides of DEFAULT_TIMINGS
   */
  constructor({ gladys, store, request, timers = true, now, timings }) {
    this.gladys = gladys;
    this.store = store;
    this.request = request;
    this.timers = timers;
    this.now = now ?? (() => Date.now());
    this.timings = { ...DEFAULT_TIMINGS, ...timings };
    this.config = null;
    this.client = null;
    this.data = emptyData();
    this.saved = null;
    this.snapshot = null;
    this.problem = null;
    this.lastSuccessAt = null;
    this.lastCycleAt = -Infinity;
    this.discovered = null;
    this.statusMessage = undefined;
    this.cycleTimer = null;
    this.running = null;
    this.lastRefreshAt = -Infinity;
    this.refreshTimer = null;
    this.signature = null;
    this.stopped = false;
    // Keys of the failures already logged, so a repeated one is not logged again.
    this.failing = new Set();
  }

  /** Log a failure once (warn or error), then at debug until `recovered(key)`. */
  failed(key, level, message) {
    if (this.failing.has(key)) {
      logger.debug(message);
      return;
    }
    this.failing.add(key);
    logger[level](message);
  }

  /** One line when a failure logged by `failed(key)` is over. */
  recovered(key, message) {
    if (this.failing.delete(key)) {
      logger.info(message);
    }
  }

  // --- Lifecycle -------------------------------------------------------------

  async start(config) {
    const saved = await this.store.load();
    if (saved?.version === 1 && saved.highs && typeof saved.highs === 'object') {
      this.data = { ...emptyData(), user: saved.user ?? null, highs: saved.highs };
    }
    this.configure(config);
    logger.info(`Started: Ghostfolio read every ${config.refreshMinutes} min`);
    this.schedule();
    this.runCycle();
  }

  configure(config) {
    this.config = config;
    this.client =
      config.url && config.token
        ? new GhostfolioClient({
            url: config.url,
            token: config.token,
            insecure: config.insecure,
            ...(this.request ? { request: this.request } : {}),
          })
        : null;
    if (!this.client) {
      this.problem = config.invalidUrl ? 'invalidUrl' : config.url ? 'noToken' : 'noUrl';
      logger.warn(
        config.invalidUrl
          ? 'The address of Ghostfolio is not understood'
          : 'Address or security token of Ghostfolio missing',
      );
    }
  }

  /** Reconnection: Gladys may have restarted, publish everything again. */
  async resync(config) {
    if (connectionOf(config) !== connectionOf(this.config)) {
      // The configuration changed while Gladys was away.
      await this.reconfigure(config);
      return;
    }
    this.config = config;
    this.discovered = null;
    await this.publishDiscovered();
    this.statusMessage = undefined;
    await this.updateConnectionStatus();
    this.gladys.forgetPublishedStates?.();
    await this.publishStates();
    this.requestRefresh();
  }

  async reconfigure(config) {
    await this.running;
    this.problem = null;
    this.failing.delete('ghostfolio');
    logger.info('Configuration saved');
    if (connectionOf(config) !== connectionOf(this.config)) {
      // Another server or user: its data must not be shown under the old one.
      this.snapshot = null;
      this.signature = null;
      this.lastSuccessAt = null;
    }
    this.configure(config);
    // The language may have changed: the names of the next devices with it.
    this.discovered = null;
    this.schedule();
    await this.runCycle();
    this.requestRefresh();
  }

  async stop() {
    this.stopped = true;
    clearInterval(this.cycleTimer);
    clearTimeout(this.refreshTimer);
    this.cycleTimer = null;
    await this.running?.catch(() => {});
    await this.store.flush();
  }

  schedule() {
    if (!this.timers || this.stopped) {
      return;
    }
    clearInterval(this.cycleTimer);
    this.cycleTimer = setInterval(() => this.runCycle(), this.config.refreshMinutes * MINUTE);
    this.cycleTimer.unref?.();
  }

  // --- Devices ----------------------------------------------------------------

  /** The portfolio and the accounts of the last snapshot: [{ type, item, ids }]. */
  entries() {
    if (!this.snapshot) {
      return [];
    }
    const portfolio = { id: this.snapshot.userId, ...this.snapshot.portfolio };
    return [
      { type: DEVICE_TYPES.PORTFOLIO, item: portfolio },
      ...this.snapshot.accounts.map((item) => ({ type: DEVICE_TYPES.ACCOUNT, item })),
    ].map((entry) => ({ ...entry, ids: deviceIds(this.gladys, entry.type, entry.item.id) }));
  }

  isCreated(externalId) {
    return (this.gladys.devices ?? []).some((device) => device.external_id === externalId);
  }

  /** The objects of one type whose device is added in Gladys. */
  created(type) {
    return this.entries()
      .filter((entry) => entry.type === type && this.isCreated(entry.ids.device))
      .map((entry) => entry.item);
  }

  /** Whether an external id is a device of this integration. */
  owns(externalId) {
    return this.entries().some((entry) => entry.ids.device === externalId);
  }

  // --- Cycles -----------------------------------------------------------------

  runCycle() {
    if (this.running || this.stopped) {
      return this.running;
    }
    this.running = this.cycle()
      .catch((err) => this.failed('cycle', 'error', `Refresh cycle failed: ${err.message}`))
      .finally(() => {
        this.running = null;
      });
    return this.running;
  }

  async cycle() {
    const now = this.now();
    this.lastCycleAt = now;
    if (!this.client) {
      await this.updateConnectionStatus();
      return;
    }
    try {
      this.snapshot = await this.client.snapshot(localDay(now));
      this.problem = null;
      this.lastSuccessAt = this.now();
      this.recovered('ghostfolio', 'Ghostfolio answers again');
    } catch (err) {
      this.problem = problemOf(err);
      this.failed('ghostfolio', 'warn', err.message);
      await this.updateConnectionStatus();
      return;
    }
    logger.debug(`Refresh cycle: ${this.snapshot.accounts.length} accounts`);
    this.recovered('cycle', 'Refresh cycles work again');
    await this.publishDiscovered();
    await this.publishStates();
    await this.checkHighs(localDay(now));
    const saved = JSON.stringify(this.data);
    if (saved !== this.saved) {
      // Only when a high, its day or the user changed: no write at every cycle.
      this.saved = saved;
      this.store.save(this.data);
    }
    await this.updateConnectionStatus();
    const signature = JSON.stringify(this.snapshot);
    if (signature !== this.signature) {
      this.signature = signature;
      this.requestRefresh();
    }
  }

  async publishDiscovered() {
    if (!this.config || !this.snapshot) {
      return;
    }
    const devices = this.entries().map(({ type, item }) =>
      buildDevice(this.gladys, type, item, this.snapshot.currency, this.config.language),
    );
    const signature = JSON.stringify(devices);
    if (signature === this.discovered) {
      return;
    }
    try {
      await this.gladys.publishDiscoveredDevices(devices);
      this.discovered = signature;
      this.recovered('discovery', 'Publishing the devices works again');
    } catch (err) {
      this.failed('discovery', 'warn', `Publishing the devices failed: ${err.message}`);
    }
  }

  /** The states of one object; absent values are not sent. */
  statesOf(type, item, ids) {
    const values =
      type === DEVICE_TYPES.PORTFOLIO
        ? {
            net_worth: item.netWorth,
            value: item.value,
            invested: item.invested,
            day_change: item.dayChange,
            day_percent: item.dayPercent,
            ytd_change: item.ytdChange,
            ytd_percent: item.ytdPercent,
            total_change: item.totalChange,
            total_percent: item.totalPercent,
          }
        : { value: item.value, cash: item.cash, share: item.share };
    return Object.entries(values)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => ({ device_feature_external_id: ids[key], state: value }));
  }

  async publishStates() {
    if (!this.snapshot) {
      return;
    }
    const states = this.entries()
      .filter(({ ids }) => this.isCreated(ids.device))
      .flatMap(({ type, item, ids }) => this.statesOf(type, item, ids));
    if (states.length === 0) {
      return;
    }
    try {
      await this.gladys.publishChangedStates(states, { heartbeat: this.timings.heartbeatMs });
      this.recovered('publish', 'Publishing the states works again');
    } catch (err) {
      // Sent again at the next cycle (the SDK forgets what Gladys refused).
      this.failed('publish', 'warn', `Publishing the states failed: ${err.message}`);
    }
  }

  async updateConnectionStatus() {
    const connected = this.problem === null && this.lastSuccessAt !== null;
    const message = this.problem ? render(STATUS, this.problem) : undefined;
    const key = JSON.stringify([connected, message]);
    if (key === this.statusMessage) {
      return;
    }
    this.statusMessage = key;
    await this.gladys.setConnectionStatus(connected, message).catch(() => {});
  }

  // --- Scene trigger -----------------------------------------------------------

  async checkHighs(today) {
    const { userId, portfolio, history, currency } = this.snapshot;
    if (this.data.user !== userId) {
      // Another Ghostfolio user: its highs start from its own chart.
      this.data.user = userId;
      this.data.highs = {};
    }
    const device = deviceIds(this.gladys, DEVICE_TYPES.PORTFOLIO, userId).device;
    const language = this.config.language;
    for (const [measure, read] of Object.entries(MEASURES)) {
      const value = read.current(portfolio);
      if (value === null) {
        continue;
      }
      const record = this.data.highs[measure];
      if (!record || typeof record.value !== 'number') {
        // The first reading is the starting point: the chart says how high it went.
        const past = read.history(history);
        this.data.highs[measure] = { value: Math.max(value, past ?? value), day: null };
        continue;
      }
      if (value <= record.value) {
        continue;
      }
      const previous = record.value;
      record.value = value;
      if (record.day === today || !this.isCreated(device)) {
        continue; // one event a day; none for a portfolio not added to Gladys
      }
      const isPercent = measure === 'performance';
      const shown = isPercent
        ? formatPercent(value, language, { signed: true })
        : formatAmount(value, currency, language);
      const phrases = PHRASES[language];
      const sent = await this.fire(TRIGGERS.HIGH, `All-time high (${measure})`, {
        device,
        measure,
        value,
        previous,
        currency: isPercent ? '%' : (currency ?? ''),
        text: (isPercent ? phrases.highPerformance : phrases.highNetWorth)({ value: shown }),
      });
      if (sent) {
        record.day = today;
      } else {
        record.value = previous; // tried again at the next cycle
      }
    }
  }

  async fire(key, line, data) {
    // The measure only: amounts stay out of the logs.
    logger.info(`Scene trigger: ${line}`);
    try {
      await this.gladys.publishSceneEvent(key, data);
      this.recovered('scene', 'Scene triggers work again');
      return true;
    } catch (err) {
      this.failed('scene', 'warn', `Firing the scene trigger failed: ${err.message}`);
      return false;
    }
  }

  // --- Gladys events --------------------------------------------------------------

  async onDeviceCreated(device) {
    if (!this.owns(device?.external_id)) {
      return;
    }
    // The SDK forgot the states of the device: everything is published again.
    await this.publishStates();
    this.requestRefresh();
  }

  /** onPoll fallback: should_poll is false, but a Gladys polling anyway gets an answer. */
  async poll(device) {
    if (!this.owns(device?.external_id)) {
      return;
    }
    if (this.now() - this.lastCycleAt >= (this.config.refreshMinutes * MINUTE) / 2) {
      await this.runCycle();
    } else {
      await this.publishStates();
    }
  }

  /** The snapshot, read again if the last cycle is older than one interval (or `force`). */
  async fresh(force = false) {
    await this.running;
    if (force || this.now() - this.lastCycleAt >= this.config.refreshMinutes * MINUTE) {
      await this.runCycle();
    }
    return this.snapshot;
  }

  // --- Widget -------------------------------------------------------------------

  requestRefresh() {
    if (this.stopped) {
      return;
    }
    const now = this.now();
    const wait = this.lastRefreshAt + this.timings.widgetRefreshMs - now;
    if (wait <= 0) {
      this.lastRefreshAt = now;
      this.gladys.requestWidgetRefresh(WIDGET_KEY);
    } else if (this.timers && !this.refreshTimer) {
      this.refreshTimer = setTimeout(() => {
        this.refreshTimer = null;
        this.requestRefresh();
      }, wait);
      this.refreshTimer.unref?.();
    }
  }
}

/** What identifies the server and the reading pace of a configuration. */
const connectionOf = (config) =>
  config && JSON.stringify([config.url, config.token, config.insecure, config.refreshMinutes]);

/** The STATUS key of a failed reading. */
export function problemOf(err) {
  if (err instanceof UnauthorizedError) {
    return 'unauthorized';
  }
  if (err instanceof NotGhostfolioError) {
    return 'notGhostfolio';
  }
  if (isCertificateError(err)) {
    return 'certificate';
  }
  return 'unreachable';
}

function emptyData() {
  return { version: 1, user: null, highs: {} };
}
