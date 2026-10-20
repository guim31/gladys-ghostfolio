// -----------------------------------------------------------------------------
// Texts produced by the container, in the four languages of Gladys (the
// language of the configuration for the feature names and the scene texts, the
// language of the dashboard for the widget), and the number and date formats.
// -----------------------------------------------------------------------------

export const LOCALES = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };
export const LANGS = Object.keys(LOCALES);

// Feature names, frozen at creation in Gladys, keyed by feature key
// (src/devices.js). "value" and "share" serve the portfolio and the accounts.
export const NAMES = {
  en: {
    net_worth: 'Net worth',
    value: 'Value',
    invested: 'Invested',
    day_change: 'Change today',
    day_percent: 'Change today (%)',
    ytd_change: 'Change this year',
    ytd_percent: 'Change this year (%)',
    total_change: 'Total performance',
    total_percent: 'Total performance (%)',
    cash: 'Cash',
    share: 'Share of the portfolio',
  },
  fr: {
    net_worth: 'Patrimoine total',
    value: 'Valeur',
    invested: 'Investi',
    day_change: 'Variation du jour',
    day_percent: 'Variation du jour (%)',
    ytd_change: 'Variation depuis le 1er janvier',
    ytd_percent: 'Variation depuis le 1er janvier (%)',
    total_change: 'Performance totale',
    total_percent: 'Performance totale (%)',
    cash: 'Liquidités',
    share: 'Part du portefeuille',
  },
  de: {
    net_worth: 'Gesamtvermögen',
    value: 'Wert',
    invested: 'Investiert',
    day_change: 'Änderung heute',
    day_percent: 'Änderung heute (%)',
    ytd_change: 'Änderung seit 1. Januar',
    ytd_percent: 'Änderung seit 1. Januar (%)',
    total_change: 'Gesamtperformance',
    total_percent: 'Gesamtperformance (%)',
    cash: 'Guthaben',
    share: 'Anteil am Portfolio',
  },
  es: {
    net_worth: 'Patrimonio total',
    value: 'Valor',
    invested: 'Invertido',
    day_change: 'Variación del día',
    day_percent: 'Variación del día (%)',
    ytd_change: 'Variación desde el 1 de enero',
    ytd_percent: 'Variación desde el 1 de enero (%)',
    total_change: 'Rentabilidad total',
    total_percent: 'Rentabilidad total (%)',
    cash: 'Efectivo',
    share: 'Parte de la cartera',
  },
};

// Asset classes of Ghostfolio; an unknown one is shown as Ghostfolio names it.
export const ASSET_CLASSES = {
  en: {
    EQUITY: 'Equities',
    FIXED_INCOME: 'Fixed income',
    LIQUIDITY: 'Cash',
    COMMODITY: 'Commodities',
    REAL_ESTATE: 'Real estate',
    ALTERNATIVE_INVESTMENT: 'Alternative',
  },
  fr: {
    EQUITY: 'Actions',
    FIXED_INCOME: 'Obligations',
    LIQUIDITY: 'Liquidités',
    COMMODITY: 'Matières premières',
    REAL_ESTATE: 'Immobilier',
    ALTERNATIVE_INVESTMENT: 'Alternatifs',
  },
  de: {
    EQUITY: 'Aktien',
    FIXED_INCOME: 'Anleihen',
    LIQUIDITY: 'Liquidität',
    COMMODITY: 'Rohstoffe',
    REAL_ESTATE: 'Immobilien',
    ALTERNATIVE_INVESTMENT: 'Alternative',
  },
  es: {
    EQUITY: 'Acciones',
    FIXED_INCOME: 'Renta fija',
    LIQUIDITY: 'Liquidez',
    COMMODITY: 'Materias primas',
    REAL_ESTATE: 'Inmobiliario',
    ALTERNATIVE_INVESTMENT: 'Alternativos',
  },
};

// Sentences of the scene action and of the scene trigger. Functions take `p`.
export const PHRASES = {
  en: {
    portfolio: (p) =>
      `Portfolio: ${p.netWorth}. Today ${p.day} (${p.dayPercent}), this year ${p.ytdPercent}, since the start ${p.totalPercent}.`,
    highNetWorth: (p) => `Ghostfolio: net worth at an all-time high, ${p.value}.`,
    highPerformance: (p) => `Ghostfolio: total performance at an all-time high, ${p.value}.`,
  },
  fr: {
    portfolio: (p) =>
      `Portefeuille : ${p.netWorth}. Aujourd'hui ${p.day} (${p.dayPercent}), depuis le 1er janvier ${p.ytdPercent}, depuis le début ${p.totalPercent}.`,
    highNetWorth: (p) => `Ghostfolio : patrimoine au plus haut historique, ${p.value}.`,
    highPerformance: (p) => `Ghostfolio : performance totale au plus haut historique, ${p.value}.`,
  },
  de: {
    portfolio: (p) =>
      `Portfolio: ${p.netWorth}. Heute ${p.day} (${p.dayPercent}), seit 1. Januar ${p.ytdPercent}, seit Beginn ${p.totalPercent}.`,
    highNetWorth: (p) => `Ghostfolio: Vermögen auf Allzeithoch, ${p.value}.`,
    highPerformance: (p) => `Ghostfolio: Gesamtperformance auf Allzeithoch, ${p.value}.`,
  },
  es: {
    portfolio: (p) =>
      `Cartera: ${p.netWorth}. Hoy ${p.day} (${p.dayPercent}), desde el 1 de enero ${p.ytdPercent}, desde el inicio ${p.totalPercent}.`,
    highNetWorth: (p) => `Ghostfolio: patrimonio en máximo histórico, ${p.value}.`,
    highPerformance: (p) => `Ghostfolio: rentabilidad total en máximo histórico, ${p.value}.`,
  },
};

// Connection status and configuration action messages, keyed by message.
export const STATUS = {
  en: {
    initFailed: 'The integration could not start: see its logs.',
    noUrl: 'Enter the address of Ghostfolio and your security token.',
    invalidUrl:
      'The address of Ghostfolio is not understood: give it without user, password, ? or #.',
    noToken: 'Enter the security token of your Ghostfolio user.',
    unauthorized: 'Ghostfolio refuses the security token: check it, or create a new one.',
    unreachable: 'Ghostfolio does not answer: the last values are kept.',
    certificate:
      'The certificate of Ghostfolio is not trusted: enable "self-signed certificate" if it is yours.',
    notGhostfolio: 'This address does not answer like the API of Ghostfolio.',
    summary: (p) =>
      `Connected to Ghostfolio: net worth ${p.netWorth}, ${p.accounts} account(s), base currency ${p.currency}.`,
  },
  fr: {
    initFailed: "L'intégration n'a pas pu démarrer : voir ses journaux.",
    noUrl: "Indiquez l'adresse de Ghostfolio et votre jeton de sécurité.",
    invalidUrl:
      "L'adresse de Ghostfolio n'est pas comprise : donnez-la sans utilisateur, mot de passe, ? ni #.",
    noToken: 'Indiquez le jeton de sécurité de votre utilisateur Ghostfolio.',
    unauthorized: 'Ghostfolio refuse le jeton de sécurité : vérifiez-le, ou créez-en un nouveau.',
    unreachable: 'Ghostfolio ne répond pas : les dernières valeurs sont gardées.',
    certificate:
      "Le certificat de Ghostfolio n'est pas reconnu : activez « certificat auto-signé » s'il est le vôtre.",
    notGhostfolio: "Cette adresse ne répond pas comme l'API de Ghostfolio.",
    summary: (p) =>
      `Connecté à Ghostfolio : patrimoine ${p.netWorth}, ${p.accounts} compte(s), devise de base ${p.currency}.`,
  },
  de: {
    initFailed: 'Die Integration konnte nicht starten: siehe ihre Protokolle.',
    noUrl: 'Gib die Adresse von Ghostfolio und dein Sicherheits-Token an.',
    invalidUrl:
      'Die Adresse von Ghostfolio wird nicht verstanden: gib sie ohne Benutzer, Passwort, ? und # an.',
    noToken: 'Gib das Sicherheits-Token deines Ghostfolio-Benutzers an.',
    unauthorized: 'Ghostfolio lehnt das Sicherheits-Token ab: prüfe es oder erstelle ein neues.',
    unreachable: 'Ghostfolio antwortet nicht: die letzten Werte bleiben erhalten.',
    certificate:
      'Das Zertifikat von Ghostfolio ist nicht vertrauenswürdig: aktiviere „selbstsigniertes Zertifikat“, wenn es deins ist.',
    notGhostfolio: 'Diese Adresse antwortet nicht wie die API von Ghostfolio.',
    summary: (p) =>
      `Mit Ghostfolio verbunden: Vermögen ${p.netWorth}, ${p.accounts} Konto/Konten, Basiswährung ${p.currency}.`,
  },
  es: {
    initFailed: 'La integración no pudo iniciarse: consulte sus registros.',
    noUrl: 'Indique la dirección de Ghostfolio y su token de seguridad.',
    invalidUrl:
      'La dirección de Ghostfolio no se entiende: indíquela sin usuario, contraseña, ? ni #.',
    noToken: 'Indique el token de seguridad de su usuario de Ghostfolio.',
    unauthorized: 'Ghostfolio rechaza el token de seguridad: compruébelo o cree uno nuevo.',
    unreachable: 'Ghostfolio no responde: se conservan los últimos valores.',
    certificate:
      'El certificado de Ghostfolio no es de confianza: active «certificado autofirmado» si es el suyo.',
    notGhostfolio: 'Esta dirección no responde como la API de Ghostfolio.',
    summary: (p) =>
      `Conectado a Ghostfolio: patrimonio ${p.netWorth}, ${p.accounts} cuenta(s), moneda base ${p.currency}.`,
  },
};

/** A STATUS (or PHRASES) entry as a multi-language object. */
export function render(table, key, params = {}) {
  return Object.fromEntries(
    LANGS.map((language) => {
      const entry = table[language][key];
      return [language, typeof entry === 'function' ? entry(params) : entry];
    }),
  );
}

const locale = (language) => LOCALES[language] ?? LOCALES.en;
const ISO_CURRENCY = /^[A-Z]{3}$/;

/** An amount with its currency: "1 234,56 €", "-12.30 CHF". */
export function formatAmount(value, currency, language, decimals = 2) {
  if (value === null || value === undefined) {
    return '–';
  }
  const digits = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  if (currency && ISO_CURRENCY.test(currency)) {
    try {
      return new Intl.NumberFormat(locale(language), {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        ...digits,
      }).format(value);
    } catch {
      // An unknown code falls back on the plain number.
    }
  }
  const number = new Intl.NumberFormat(locale(language), digits).format(value);
  return currency ? `${number} ${currency}` : number;
}

/** A percentage, signed with `signed`: "+5,39 %", "-0.54%", "46 %". */
export function formatPercent(value, language, { signed = false, decimals = 2 } = {}) {
  if (value === null || value === undefined) {
    return '–';
  }
  return new Intl.NumberFormat(locale(language), {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    ...(signed ? { signDisplay: 'exceptZero' } : {}),
  }).format(value / 100);
}

/** A change of an amount, always signed: "+20,68 €", "-3.10 $". */
export function formatChange(value, currency, language) {
  const text = formatAmount(value, currency, language);
  return value > 0 ? `+${text}` : text;
}

/** The name of an asset class of Ghostfolio. */
export const assetClassName = (assetClass, language) =>
  (ASSET_CLASSES[language] ?? ASSET_CLASSES.en)[assetClass] ?? assetClass;

/** Date and time in the time zone of Gladys (TZ): "15/10 17:38". */
export function formatDate(ms, language) {
  return new Intl.DateTimeFormat(locale(language), {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}
