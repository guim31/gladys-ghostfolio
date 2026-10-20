// -----------------------------------------------------------------------------
// Ghostfolio client. The security token of the user (Ghostfolio → My Ghostfolio
// → Access) is exchanged for a session token (a JWT) by
// `POST /api/v1/auth/anonymous`, sent as Bearer to the read-only endpoints:
//
//   api/v1/user                              base currency of the user
//   api/v2/portfolio/performance?range=1d    value, invested, change of the day
//   api/v2/portfolio/performance?range=ytd   change since 1 January
//   api/v2/portfolio/performance?range=max   change since the start, chart (all-time high)
//   api/v1/portfolio/details                 holdings, for the allocation by asset class
//   api/v1/account                           accounts: value, cash, share
//
// The session token is kept in memory and asked again when Ghostfolio refuses
// it (401). Amounts are rounded to the cent, percentages are in percent (the
// API gives ratios). Nothing of them is logged (see src/monitor.js).
// Shapes recorded on Ghostfolio 3.88.0: test/fixtures/ghostfolio.
// -----------------------------------------------------------------------------

import { httpRequest } from './http.js';

// Ghostfolio computes the performance on request: a large portfolio takes seconds.
const TIMEOUT_MS = 60_000;

export class UnauthorizedError extends Error {}
export class NotGhostfolioError extends Error {}

/** A request that did not reach Ghostfolio, with a reason fit for the logs. */
export class UnreachableError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const CERTIFICATE_CODES = new Set([
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'CERT_HAS_EXPIRED',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

/** Whether an error is a certificate the user could choose to trust. */
export const isCertificateError = (err) => CERTIFICATE_CODES.has(err?.code);

/** An amount rounded to the cent, null when absent or not a number. */
export function amountOf(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  // `|| 0`: no -0 published for a rounded -0.001.
  return Number.isFinite(number) ? Math.round(number * 100) / 100 || 0 : null;
}

/** A ratio of the API (0.0539) as a percentage (5.39), null when absent. */
export function percentOf(ratio) {
  return amountOf(ratio === null || ratio === undefined ? null : Number(ratio) * 100);
}

/** The first number of a list of candidate fields (names changed between versions). */
const first = (object, ...keys) => {
  for (const key of keys) {
    if (object?.[key] !== null && object?.[key] !== undefined) {
      return object[key];
    }
  }
  return null;
};

/** Today in the time zone of Gladys (TZ), as YYYY-MM-DD. */
export function localDay(ms) {
  const date = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The figures of one performance answer. */
function performanceOf(body) {
  const p = body?.performance;
  if (!p || typeof p !== 'object') {
    throw new NotGhostfolioError('Ghostfolio answered without performance');
  }
  return {
    value: amountOf(first(p, 'currentValueInBaseCurrency', 'currentValue')),
    netWorth: amountOf(first(p, 'currentNetWorth')),
    invested: amountOf(first(p, 'totalInvestment')),
    change: amountOf(first(p, 'netPerformanceWithCurrencyEffect', 'netPerformance')),
    percent: percentOf(
      first(p, 'netPerformancePercentageWithCurrencyEffect', 'netPerformancePercentage'),
    ),
  };
}

/**
 * The highest net worth and total performance of the chart, before `today`:
 * the starting point of the all-time high trigger. The chart of a long range
 * is sampled by Ghostfolio, so a high between two points can be missed.
 */
export function historyOf(body, today) {
  const points = (Array.isArray(body?.chart) ? body.chart : []).filter(
    (point) => typeof point?.date === 'string' && point.date.slice(0, 10) < today,
  );
  const highest = (read) => {
    const values = points.map(read).filter((value) => value !== null);
    return values.length === 0 ? null : Math.max(...values);
  };
  return {
    netWorth: highest((point) => amountOf(first(point, 'netWorth', 'value'))),
    percent: highest((point) =>
      percentOf(
        first(point, 'netPerformanceInPercentageWithCurrencyEffect', 'netPerformanceInPercentage'),
      ),
    ),
  };
}

/** The share of each asset class, largest first, from the holdings (cash included). */
export function allocationOf(details) {
  const holdings = Array.isArray(details?.holdings)
    ? details.holdings
    : Object.values(details?.holdings ?? {});
  const shares = new Map();
  for (const holding of holdings) {
    const assetClass = holding?.assetProfile?.assetClass ?? holding?.assetClass ?? 'UNKNOWN';
    const share = Number(holding?.allocationInPercentage);
    if (Number.isFinite(share)) {
      shares.set(assetClass, (shares.get(assetClass) ?? 0) + share);
    }
  }
  return [...shares]
    .map(([assetClass, share]) => ({ assetClass, percent: percentOf(share) }))
    .filter((entry) => entry.percent > 0)
    .sort((a, b) => b.percent - a.percent);
}

/** The accounts, in the base currency of the user. */
export function accountsOf(body) {
  const list = Array.isArray(body?.accounts) ? body.accounts : [];
  return list
    .filter((account) => account?.id && account.isExcluded !== true)
    .map((account) => ({
      id: String(account.id),
      name: String(account.name ?? account.id),
      value: amountOf(first(account, 'valueInBaseCurrency', 'value')),
      cash: amountOf(first(account, 'balanceInBaseCurrency')),
      share: percentOf(first(account, 'allocationInPercentage')),
    }));
}

export class GhostfolioClient {
  /**
   * @param {object} options
   * @param {string} options.url base URL of Ghostfolio
   * @param {string} options.token security token of the user
   * @param {boolean} [options.insecure] accept a self-signed certificate
   * @param {Function} [options.request] see src/http.js
   */
  constructor({ url, token, insecure = false, request = httpRequest }) {
    this.url = url;
    this.token = token;
    this.insecure = insecure;
    this.request = request;
    this.jwt = null;
  }

  async send(path, options = {}) {
    let response;
    try {
      response = await this.request(`${this.url}/api/${path}`, {
        insecure: this.insecure,
        timeoutMs: TIMEOUT_MS,
        ...options,
      });
    } catch (err) {
      // The message of node:net may hold the address: only its code is kept.
      throw new UnreachableError(
        `Ghostfolio cannot be reached (${err.code ?? 'network error'})`,
        err.code,
      );
    }
    return response;
  }

  /** The JSON body of a 2xx answer; the status otherwise. */
  parse(response) {
    let body;
    try {
      body = JSON.parse(response.body);
    } catch {
      throw new NotGhostfolioError(`Ghostfolio answered HTTP ${response.status} without JSON`);
    }
    if (!body || typeof body !== 'object') {
      throw new NotGhostfolioError('Ghostfolio answered something else than an object');
    }
    return body;
  }

  async authenticate() {
    const response = await this.send('v1/auth/anonymous', {
      method: 'POST',
      body: { accessToken: this.token },
    });
    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedError('Ghostfolio refuses the security token');
    }
    if (response.status === 404) {
      throw new NotGhostfolioError('This address has no Ghostfolio API');
    }
    if (response.status < 200 || response.status >= 300) {
      throw new UnreachableError(`Ghostfolio answered HTTP ${response.status}`);
    }
    const body = this.parse(response);
    if (typeof body.authToken !== 'string' || body.authToken === '') {
      throw new NotGhostfolioError('Ghostfolio answered without session token');
    }
    this.jwt = body.authToken;
  }

  /** GET a JSON endpoint, signing in first, and again once if the session expired. */
  async get(path) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (!this.jwt) {
        await this.authenticate();
      }
      const response = await this.send(path, {
        headers: { authorization: `Bearer ${this.jwt}` },
      });
      if (response.status === 401 || response.status === 403) {
        this.jwt = null;
        continue;
      }
      if (response.status === 404) {
        throw new NotGhostfolioError(`This address has no Ghostfolio API (${path.split('?')[0]})`);
      }
      if (response.status < 200 || response.status >= 300) {
        throw new UnreachableError(`Ghostfolio answered HTTP ${response.status}`);
      }
      return this.parse(response);
    }
    throw new UnauthorizedError('Ghostfolio refuses the session token');
  }

  /**
   * Everything the integration shows, read in one go.
   * @param {string} today YYYY-MM-DD in the time zone of Gladys
   */
  async snapshot(today) {
    const user = await this.get('v1/user');
    const day = await this.get('v2/portfolio/performance?range=1d');
    const ytd = await this.get('v2/portfolio/performance?range=ytd');
    const max = await this.get('v2/portfolio/performance?range=max');
    const details = await this.get('v1/portfolio/details');
    const accounts = await this.get('v1/account');
    const total = performanceOf(max);
    const currency = user.settings?.baseCurrency;
    return {
      userId: String(user.id ?? 'portfolio'),
      currency: typeof currency === 'string' && /^[A-Z]{3}$/.test(currency) ? currency : null,
      portfolio: {
        value: total.value,
        netWorth: total.netWorth,
        invested: total.invested,
        dayChange: performanceOf(day).change,
        dayPercent: performanceOf(day).percent,
        ytdChange: performanceOf(ytd).change,
        ytdPercent: performanceOf(ytd).percent,
        totalChange: total.change,
        totalPercent: total.percent,
      },
      history: historyOf(max, today),
      allocation: allocationOf(details),
      accounts: accountsOf(accounts),
    };
  }
}
