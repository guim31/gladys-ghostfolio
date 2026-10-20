// -----------------------------------------------------------------------------
// The scene action `read_portfolio` and the configuration action `check_now`.
// They read Ghostfolio again when the last cycle is older than one interval,
// and answer with a sentence a scene can send by message or read aloud.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { PHRASES, STATUS, formatAmount, formatChange, formatPercent, render } from './texts.js';

const logger = createLogger({ name: 'ghostfolio-actions' });

export const SCENE_ACTIONS = { PORTFOLIO: 'read_portfolio' };
export const CONFIG_ACTION = 'check_now';

/** The snapshot, or the reason there is none, thrown in the language of the configuration. */
async function snapshotOf(monitor) {
  const snapshot = await monitor.fresh();
  if (!snapshot || monitor.problem) {
    const problem = monitor.problem ?? 'unreachable';
    // The last values are better than nothing for a reading, but not a refused token.
    if (!snapshot || problem !== 'unreachable') {
      throw new Error(STATUS[monitor.config.language][problem]);
    }
  }
  return snapshot;
}

/**
 * Scene action: the net worth and the changes of the portfolio, as a sentence.
 * Outputs `text`, `net_worth`, `day_change`, `day_percent`, `ytd_percent`,
 * `total_percent` (0 for a figure Ghostfolio does not give).
 */
export async function readPortfolio(monitor) {
  const { portfolio: p, currency } = await snapshotOf(monitor);
  const language = monitor.config.language;
  const percent = (value) => formatPercent(value, language, { signed: true });
  const text = PHRASES[language].portfolio({
    netWorth: formatAmount(p.netWorth, currency, language),
    day: formatChange(p.dayChange, currency, language),
    dayPercent: percent(p.dayPercent),
    ytdPercent: percent(p.ytdPercent),
    totalPercent: percent(p.totalPercent),
  });
  return {
    text,
    net_worth: p.netWorth ?? 0,
    day_change: p.dayChange ?? 0,
    day_percent: p.dayPercent ?? 0,
    ytd_percent: p.ytdPercent ?? 0,
    total_percent: p.totalPercent ?? 0,
  };
}

/** Configuration action: a reading now, and what Ghostfolio holds, in every language. */
export async function checkNow(monitor) {
  const snapshot = await monitor.fresh(true);
  if (monitor.problem || !snapshot) {
    logger.info(`Connection test: failed (${monitor.problem ?? 'unreachable'})`);
    return render(STATUS, monitor.problem ?? 'unreachable');
  }
  logger.info('Connection test: Ghostfolio answers');
  return Object.fromEntries(
    Object.keys(STATUS).map((language) => [
      language,
      STATUS[language].summary({
        netWorth: formatAmount(snapshot.portfolio.netWorth, snapshot.currency, language),
        accounts: snapshot.accounts.length,
        currency: snapshot.currency ?? '?',
      }),
    ]),
  );
}
