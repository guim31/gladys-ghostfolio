// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+): `overview`.
//
// Once the portfolio is added in Gladys: one `status` list (the core shows
// one per widget) with its figures (net worth, invested, change today, since
// 1 January and since the start, green or red with the sign), then the
// allocation by asset class; a `card-list` of the accounts added in Gladys
// (value, share as a badge). The footer gives the time of the reading.
// Budget: 1 status (10 rows at most), 1 card-list, 2 texts at most.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { DEVICE_TYPES } from './devices.js';
import { WIDGET_KEY } from './monitor.js';
import { assetClassName, formatAmount, formatChange, formatDate, formatPercent } from './texts.js';

export const MAX_ACCOUNTS = 8;
// 5 rows of figures + 5 asset classes: the 10 rows of a status list.
export const MAX_CLASSES = 5;
export const TTL_SECONDS = 300;

export const TEXT = {
  waiting: {
    en: 'Waiting for Ghostfolio…',
    fr: 'En attente de Ghostfolio…',
    de: 'Warte auf Ghostfolio…',
    es: 'Esperando a Ghostfolio…',
  },
  empty: {
    en: 'Add the portfolio to Gladys',
    fr: 'Ajoutez le portefeuille',
    de: 'Füge das Portfolio hinzu',
    es: 'Añada la cartera a Gladys',
  },
  refused: {
    en: 'Security token refused',
    fr: 'Jeton de sécurité refusé',
    de: 'Sicherheits-Token abgelehnt',
    es: 'Token de seguridad rechazado',
  },
  notConfigured: {
    en: 'Configure the integration',
    fr: "Configurez l'intégration",
    de: 'Konfiguriere die Integration',
    es: 'Configure la integración',
  },
  unreachable: {
    en: 'Ghostfolio does not answer',
    fr: 'Ghostfolio ne répond pas',
    de: 'Ghostfolio antwortet nicht',
    es: 'Ghostfolio no responde',
  },
  netWorth: { en: 'Net worth', fr: 'Patrimoine', de: 'Vermögen', es: 'Patrimonio' },
  invested: { en: 'Invested', fr: 'Investi', de: 'Investiert', es: 'Invertido' },
  today: { en: 'Today', fr: "Aujourd'hui", de: 'Heute', es: 'Hoy' },
  ytd: { en: 'This year', fr: 'Cette année', de: 'Dieses Jahr', es: 'Este año' },
  total: { en: 'Since the start', fr: 'Depuis le début', de: 'Seit Beginn', es: 'Desde el inicio' },
  readAt: { en: 'Read', fr: 'Lu le', de: 'Gelesen', es: 'Leído' },
};

const t = (text, language) => text[language] ?? text.en;

const NOT_CONFIGURED = ['noUrl', 'noToken', 'invalidUrl'];

/** The short text of a problem of the monitor (see STATUS for the long one). */
export function problemText(problem, language) {
  if (problem === 'unauthorized') {
    return t(TEXT.refused, language);
  }
  return t(NOT_CONFIGURED.includes(problem) ? TEXT.notConfigured : TEXT.unreachable, language);
}
const clip = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1)}…`);

/** Green for a gain, red for a loss, neutral otherwise. */
export function changeColor(value) {
  if (!value) {
    return WIDGET_COLORS.NEUTRAL;
  }
  return value > 0 ? WIDGET_COLORS.SUCCESS : WIDGET_COLORS.DANGER;
}

/** A change as an amount and a percentage: "+20,68 € (+0,54 %)". */
export function changeText(amount, percent, currency, language) {
  return `${formatChange(amount, currency, language)} (${formatPercent(percent, language, { signed: true })})`;
}

/** The rows of the portfolio figures. */
export function portfolioRows(portfolio, currency, language) {
  const change = (label, amount, percent, icon) => ({
    label: t(label, language),
    value: clip(changeText(amount, percent, currency, language), 40),
    icon,
    color: changeColor(amount),
  });
  return [
    {
      label: t(TEXT.netWorth, language),
      value: clip(formatAmount(portfolio.netWorth, currency, language), 40),
      icon: 'briefcase',
    },
    {
      label: t(TEXT.invested, language),
      value: clip(formatAmount(portfolio.invested, currency, language), 40),
      icon: 'download',
    },
    change(TEXT.today, portfolio.dayChange, portfolio.dayPercent, 'activity'),
    change(TEXT.ytd, portfolio.ytdChange, portfolio.ytdPercent, 'calendar'),
    change(TEXT.total, portfolio.totalChange, portfolio.totalPercent, 'trending-up'),
  ];
}

export const WIDGETS = {
  [WIDGET_KEY]: {
    async get(monitor, { language = 'en' } = {}) {
      const lang = TEXT.today[language] ? language : 'en';
      if (!monitor.snapshot) {
        const text = monitor.problem ? problemText(monitor.problem, lang) : t(TEXT.waiting, lang);
        return { ttl_seconds: 60, components: [{ type: 'text', variant: 'heading', text }] };
      }
      const { currency, allocation } = monitor.snapshot;
      const [portfolio] = monitor.created(DEVICE_TYPES.PORTFOLIO);
      const accounts = monitor.created(DEVICE_TYPES.ACCOUNT);
      const components = [];
      if (!portfolio) {
        components.push({ type: 'text', variant: 'heading', text: t(TEXT.empty, lang) });
      } else {
        const shares = allocation.slice(0, MAX_CLASSES).map((entry) => ({
          label: clip(assetClassName(entry.assetClass, lang), 40),
          value: formatPercent(entry.percent, lang, { decimals: 1 }),
          icon: 'pie-chart',
        }));
        components.push({
          type: 'status',
          items: [...portfolioRows(portfolio, currency, lang), ...shares],
        });
      }
      if (accounts.length > 0) {
        components.push({
          type: 'card-list',
          display: 'list',
          items: accounts.slice(0, MAX_ACCOUNTS).map((account) => ({
            title: clip(account.name, 60),
            subtitle: clip(formatAmount(account.value, currency, lang), 60),
            badge: {
              text: formatPercent(account.share, lang, { decimals: 0 }),
              color: WIDGET_COLORS.NEUTRAL,
            },
          })),
        });
      }
      const unreachable = monitor.problem ? ` · ${problemText(monitor.problem, lang)}` : '';
      components.push({
        type: 'text',
        variant: 'caption',
        text: clip(
          `Ghostfolio · ${t(TEXT.readAt, lang)} ${formatDate(monitor.lastSuccessAt, lang)}${unreachable}`,
          80,
        ),
      });
      return { ttl_seconds: TTL_SECONDS, components };
    },
  },
};
