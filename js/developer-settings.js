const SETTINGS_KEY = "corebiq-developer-settings";

function coreDateOptions(format) {
  if (format === "dd/MM/yyyy" || format === "MM/dd/yyyy" || format === "yyyy-MM-dd") return null;
  return { day: "2-digit", month: "short", year: "numeric" };
}

export function formatCoreDate(value, options = null) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const format = localStorage.getItem("corebiq-date-format") || "dd-MMM-yyyy";
  if (options) return new Intl.DateTimeFormat("en-IN", options).format(date);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  if (format === "dd/MM/yyyy") return `${day}/${month}/${year}`;
  if (format === "MM/dd/yyyy") return `${month}/${day}/${year}`;
  if (format === "yyyy-MM-dd") return `${year}-${month}-${day}`;
  return new Intl.DateTimeFormat("en-IN", coreDateOptions(format)).format(date);
}

export function getDeveloperSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function applyDeveloperSettings() {
  const settings = getDeveloperSettings();
  if (settings.currency) localStorage.setItem("corebiq-currency", settings.currency);
  if (settings.country) localStorage.setItem("corebiq-country", settings.country);
  if (settings.language) localStorage.setItem("corebiq-language", settings.language);
  if (settings.dateFormat) localStorage.setItem("corebiq-date-format", settings.dateFormat);
  if (settings.language) document.documentElement.dataset.corebiqLanguage = settings.language.toLowerCase();
  if (settings.typography) document.documentElement.dataset.corebiqTypography = settings.typography;
  if (settings.country) document.documentElement.dataset.corebiqCountry = settings.country.toLowerCase().replace(/\s+/g, "-");
  if (settings.dateFormat) document.documentElement.dataset.corebiqDateFormat = settings.dateFormat;
  return settings;
}

globalThis.COREBIQ = globalThis.COREBIQ || {};
globalThis.COREBIQ.formatDate = formatCoreDate;
