// -----------------------------------------------------------------------------
// The Gladys devices built from what Ghostfolio answers (src/ghostfolio.js):
//
//   portfolio  one per Ghostfolio user: net worth (cash included), value of
//              the holdings, amount invested, and the change of the day, since
//              1 January and since the start, as an amount and in percent;
//   account    one per account: its value, its cash and its share of the
//              portfolio.
//
// Every amount is in the base currency of the user (Ghostfolio converts). The
// platform id is the id Ghostfolio gives the user or the account: renaming an
// account keeps its device. Every feature is read-only, with should_poll:
// false: the readings run in the container (src/monitor.js).
//
// Couples checked against the Gladys front in test/gladys-rules.test.js.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as CATEGORIES,
  DEVICE_FEATURE_TYPES as TYPES,
  DEVICE_FEATURE_UNITS as UNITS,
} from '@gladysassistant/integration-sdk';
import { NAMES } from './texts.js';

export const DEVICE_TYPES = { PORTFOLIO: 'portfolio', ACCOUNT: 'account' };

export const FEATURE_KEYS = {
  portfolio: [
    'net_worth',
    'value',
    'invested',
    'day_change',
    'day_percent',
    'ytd_change',
    'ytd_percent',
    'total_change',
    'total_percent',
  ],
  account: ['value', 'cash', 'share'],
};

// Display bounds only (the core never applies them), symmetric for the
// amounts and percentages that can be negative.
const MAX_AMOUNT = 1e12;
const MAX_PERCENT = 10000;

const CURRENCY_UNITS = { EUR: UNITS.EURO, USD: UNITS.DOLLAR, GBP: UNITS.POUND_STERLING };

/** The unit of an amount in this currency, or undefined. */
export const unitOf = (currency) => CURRENCY_UNITS[currency];

/** The platform id of an object: its Ghostfolio id, kept to safe characters. */
export const platformIdOf = (id) => String(id).replace(/[^A-Za-z0-9-]/g, '_');

/** External ids of the device of an object and of its features. */
export function deviceIds(gladys, type, id) {
  const ids = gladys.externalIds(type, platformIdOf(id));
  return {
    device: ids.device,
    ...Object.fromEntries(FEATURE_KEYS[type].map((key) => [key, ids.feature(key)])),
  };
}

const feature = (name, externalId, extra) => ({
  name,
  external_id: externalId,
  category: CATEGORIES.CURRENCY,
  type: TYPES.CURRENCY.DECIMAL,
  read_only: true,
  has_feedback: false,
  keep_history: true,
  ...extra,
});

/**
 * The discovery payload of the portfolio or of an account.
 * @param {object} gladys
 * @param {string} type one of DEVICE_TYPES
 * @param {object} item `{ id, name }` (the snapshot's account, or the portfolio)
 * @param {string|null} currency base currency of the user
 * @param {string} language of the feature names
 */
export function buildDevice(gladys, type, item, currency, language = 'fr') {
  const ids = deviceIds(gladys, type, item.id);
  const names = NAMES[language] ?? NAMES.fr;
  const unit = unitOf(currency);
  const money = (key, min = -MAX_AMOUNT) =>
    feature(names[key], ids[key], { min, max: MAX_AMOUNT, ...(unit ? { unit } : {}) });
  const percent = (key, min = -100, max = MAX_PERCENT) =>
    feature(names[key], ids[key], { unit: UNITS.PERCENT, min, max });
  const features =
    type === DEVICE_TYPES.PORTFOLIO
      ? [
          money('net_worth'),
          money('value'),
          money('invested'),
          money('day_change'),
          // A day moves a portfolio by a few percent: a gauge stays readable.
          percent('day_percent', -100, 100),
          money('ytd_change'),
          percent('ytd_percent'),
          money('total_change'),
          percent('total_percent'),
        ]
      : [money('value'), money('cash'), percent('share', 0, 100)];
  // Without a unit for the currency, the name tells it.
  const suffix = currency && !unit ? ` (${currency})` : '';
  return {
    name: `${type === DEVICE_TYPES.PORTFOLIO ? 'Ghostfolio' : item.name}${suffix}`,
    external_id: ids.device,
    model: type === DEVICE_TYPES.PORTFOLIO ? 'Ghostfolio portfolio' : 'Ghostfolio account',
    should_poll: false,
    params: [],
    features,
  };
}
