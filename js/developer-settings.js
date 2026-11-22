const SETTINGS_KEY = "corebiq-developer-settings";

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
  if (settings.language) document.documentElement.dataset.corebiqLanguage = settings.language.toLowerCase();
  if (settings.typography) document.documentElement.dataset.corebiqTypography = settings.typography;
  if (settings.country) document.documentElement.dataset.corebiqCountry = settings.country.toLowerCase().replace(/\s+/g, "-");
  return settings;
}
