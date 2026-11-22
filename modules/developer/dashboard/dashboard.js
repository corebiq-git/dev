const SETTINGS_KEY = "corebiq-developer-settings";
const PLAN_LIMITS = { Starter: 5, Growth: 25, Enterprise: null };
const CURRENCY_BY_COUNTRY = { India: "INR", UAE: "AED", "Other GCC": "SAR" };
const DEFAULT_SETTINGS = {
  country: "India", currency: "INR", language: "English", typography: "auto",
  licenceNo: "", licenceName: "", purchaseDate: "", validity: "12", plan: "Growth",
  industry: "Traders", access: {}
};

const $ = (id) => document.getElementById(id);
const safeParse = (value) => { try { return JSON.parse(value); } catch { return {}; } };

function loadSettings() {
  try { return { ...DEFAULT_SETTINGS, ...safeParse(localStorage.getItem(SETTINGS_KEY) || "{}") }; }
  catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  localStorage.setItem("corebiq-currency", settings.currency);
  localStorage.setItem("corebiq-country", settings.country);
  localStorage.setItem("corebiq-language", settings.language);
  document.documentElement.dataset.corebiqLanguage = settings.language.toLowerCase();
  document.documentElement.dataset.corebiqTypography = settings.typography;
  window.dispatchEvent(new CustomEvent("corebiq:settings-updated", { detail: settings }));
}

function addMonths(value, months) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setMonth(date.getMonth() + Number(months || 0));
  return date;
}

function displayDate(date) {
  return date ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date) : "—";
}

let availableModules = ["CRM", "ERP", "Inventory", "HR", "Templates", "Tools", "Reports", "Settings", "Transactions"];

function renderAccess(settings) {
  const rows = $("developer-access-rows");
  const limit = PLAN_LIMITS[settings.plan];
  $("developer-plan-limit").textContent = `${settings.plan} plan · ${limit ?? "Unlimited"} users per module`;
  rows.innerHTML = availableModules.map((module) => {
    const key = module.toLowerCase();
    const current = { scope: "Admin", count: limit ?? 100, view: true, edit: true, ...(settings.access?.[key] || {}) };
    return `<tr data-access-module="${key}">
      <th scope="row"><i data-lucide="layers-3" aria-hidden="true"></i>${module}</th>
      <td><select data-access="scope" aria-label="${module} access scope"><option ${current.scope === "Admin" ? "selected" : ""}>Admin</option><option ${current.scope === "Branch" ? "selected" : ""}>Branch</option><option ${current.scope === "Public" ? "selected" : ""}>Public</option></select></td>
      <td><input data-access="count" type="number" min="0" ${limit ? `max="${limit}"` : ""} value="${Math.min(Number(current.count) || 0, limit ?? Number.MAX_SAFE_INTEGER)}" aria-label="${module} user count"></td>
      <td><label class="developer-check"><input data-access="view" type="checkbox" ${current.view ? "checked" : ""}>View</label><label class="developer-check"><input data-access="edit" type="checkbox" ${current.edit ? "checked" : ""}>Edit</label></td>
    </tr>`;
  }).join("");
  if (window.lucide) window.lucide.createIcons();
}

function fillForm(settings) {
  ["country", "currency", "language", "typography", "licenceNo", "licenceName", "purchaseDate", "validity", "plan"].forEach((name) => {
    const field = $(`developer-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
    if (field) field.value = settings[name] ?? "";
  });
  const radio = document.querySelector(`input[name="industry"][value="${CSS.escape(settings.industry)}"]`);
  if (radio) radio.checked = true;
  updateRenewal();
  renderAccess(settings);
}

function updateRenewal() {
  $("developer-renewal-date").textContent = displayDate(addMonths($("developer-purchase-date").value, $("developer-validity").value));
}

function collectSettings(existing) {
  const settings = { ...existing };
  ["country", "currency", "language", "typography", "licenceNo", "licenceName", "purchaseDate", "validity", "plan"].forEach((name) => {
    const field = $(`developer-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
    settings[name] = field?.value || "";
  });
  settings.industry = document.querySelector('input[name="industry"]:checked')?.value || "Traders";
  settings.access = {};
  document.querySelectorAll("[data-access-module]").forEach((row) => {
    const get = (name) => row.querySelector(`[data-access="${name}"]`);
    settings.access[row.dataset.accessModule] = { scope: get("scope").value, count: Number(get("count").value) || 0, view: get("view").checked, edit: get("edit").checked };
  });
  return settings;
}

async function loadManifestModules() {
  try {
    const response = await fetch(new URL("modules.json", document.baseURI), { cache: "no-store" });
    const manifest = await response.json();
    const modules = (manifest.modules || []).map((item) => item.name).filter((name) => name !== "developer");
    if (modules.length) return modules.map((name) => name.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()));
  } catch { /* use the safe built-in list */ }
  return availableModules;
}

async function initDeveloperPage() {
  const settings = loadSettings();
  const modules = await loadManifestModules();
  if (modules.length) availableModules = modules;
  fillForm(settings);
  $("developer-country").addEventListener("change", (event) => {
    const currency = CURRENCY_BY_COUNTRY[event.target.value];
    if (currency) $("developer-currency").value = currency;
  });
  $("developer-plan").addEventListener("change", () => renderAccess(collectSettings(settings)));
  $("developer-purchase-date").addEventListener("change", updateRenewal);
  $("developer-validity").addEventListener("change", updateRenewal);
  $("developer-settings-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const next = collectSettings(settings);
    saveSettings(next);
    fillForm(next);
    $("developer-status").textContent = `Saved ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}.`;
  });
  saveSettings(settings);
  if (window.lucide) window.lucide.createIcons();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initDeveloperPage);
else initDeveloperPage();
