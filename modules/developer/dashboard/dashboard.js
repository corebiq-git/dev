const SETTINGS_KEY = "corebiq-developer-settings";
const PRIMARY_ADMIN = "shanicm@gmail.com";
const PLAN_LIMITS = { Starter: 5, Growth: 25, Enterprise: null };
const PLAN_BRANCH_LIMITS = { Starter: "-", Growth: "-", Enterprise: "-" };
const CURRENCY_BY_COUNTRY = { India: "INR", UAE: "AED", "Other GCC": "SAR" };
const DEFAULT_SETTINGS = {
  country: "India", currency: "INR", language: "English", typography: "auto",
  licenceNo: "", licenceName: "", purchaseDate: "", validity: "12", plan: "Growth",
  industry: "Traders", access: {},
  defaults: { company: 1, branch: 1, admin: 1, staff: 1, public: 1 },
  admins: [{ email: PRIMARY_ADMIN, role: "Admin", permissions: {} }]
};

const $ = (id) => document.getElementById(id);
const safeParse = (value) => { try { return JSON.parse(value); } catch { return {}; } };

function loadSettings() {
  try {
    const saved = safeParse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { ...DEFAULT_SETTINGS, ...saved, defaults: { ...DEFAULT_SETTINGS.defaults, ...(saved.defaults || {}) } };
  }
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
const moduleKey = (module) => typeof module === "string" ? module.toLowerCase() : module.key;
const moduleTitle = (module) => typeof module === "string" ? module : module.title;

function renderAccess(settings) {
  const rows = $("developer-access-rows");
  const limit = PLAN_LIMITS[settings.plan];
  $("developer-plan-limit").textContent = `${settings.plan} plan · ${limit ?? "Unlimited"} users per module`;
  rows.innerHTML = availableModules.map((module) => {
    const key = moduleKey(module);
    const title = moduleTitle(module);
    const current = { scope: "Admin", count: limit ?? 100, prefill: false, view: true, edit: true, delete: true, add: true, ...(settings.access?.[key] || {}) };
    const permissions = ["view", "edit", "delete", "add"];
    return `<tr data-access-module="${key}">
      <th scope="row"><i data-lucide="layers-3" aria-hidden="true"></i>${title}</th>
      <td><select data-access="scope" aria-label="${title} access scope"><option ${current.scope === "Admin" ? "selected" : ""}>Admin</option><option ${current.scope === "Branch" ? "selected" : ""}>Branch</option><option ${current.scope === "Public" ? "selected" : ""}>Public</option></select></td>
      <td><input data-access="count" type="number" min="0" ${limit ? `max="${limit}"` : ""} value="${Math.min(Number(current.count) || 0, limit ?? Number.MAX_SAFE_INTEGER)}" aria-label="${title} user count"></td>
      <td><select data-access="prefill" aria-label="${title} prefill"><option value="no" ${current.prefill ? "" : "selected"}>No</option><option value="yes" ${current.prefill ? "selected" : ""}>Yes</option></select></td>
      ${permissions.map((permission) => `<td class="developer-permission-cell"><input data-access="${permission}" type="checkbox" ${current[permission] ? "checked" : ""} aria-label="${title} ${permission}"></td>`).join("")}
    </tr>`;
  }).join("");
  if (window.lucide) window.lucide.createIcons();
}

function normalizeAdmins(settings) {
  const admins = Array.isArray(settings.admins) ? settings.admins : [];
  const primary = admins.find((admin) => String(admin.email).toLowerCase() === PRIMARY_ADMIN) || { email: PRIMARY_ADMIN, role: "Admin", permissions: {} };
  return [primary, ...admins.filter((admin) => String(admin.email).toLowerCase() !== PRIMARY_ADMIN && admin.email)];
}

function defaultPermissions() {
  return Object.fromEntries(availableModules.map((module) => [moduleKey(module), { view: true, edit: true, delete: true, add: true }]));
}

function renderRoles(settings) {
  const admins = normalizeAdmins(settings);
  const list = $("developer-admin-list");
  list.innerHTML = admins.map((admin, index) => `<div class="developer-admin-chip"><span><i data-lucide="shield-check" aria-hidden="true"></i><b>${admin.email}</b><small>${admin.role || "Admin"}${index === 0 ? " · Primary" : ""}</small></span><button type="button" data-remove-admin="${admin.email}" ${index === 0 ? "disabled title=\"Primary admin cannot be removed\"" : ""}>${index === 0 ? "Primary" : "Remove"}</button></div>`).join("");
  $("developer-role-rows").innerHTML = admins.flatMap((admin) => {
    const permissions = { ...defaultPermissions(), ...(admin.permissions || {}) };
    const isFounder = String(admin.email).toLowerCase() === PRIMARY_ADMIN;
    return availableModules.map((module, moduleIndex) => {
      const key = moduleKey(module);
      const title = moduleTitle(module);
      const current = permissions[key] || {};
      return `<tr data-admin-email="${admin.email}" data-role-module="${key}">
        ${moduleIndex === 0 ? `<th scope="rowgroup" rowspan="${availableModules.length}">${admin.email}</th>` : ""}
        <th scope="row"><i data-lucide="layers-3" aria-hidden="true"></i>${title}</th>
        ${isFounder ? `<td colspan="4" class="developer-founder-access">Founder / CoreBIQ developer · Full access</td>` : ["view", "edit", "delete", "add"].map((permission) => `<td class="developer-permission-cell"><input data-role-permission="${permission}" type="checkbox" ${current[permission] ? "checked" : ""} aria-label="${admin.email} ${title} ${permission}"></td>`).join("")}
      </tr>`;
    });
  }).join("");
  list.querySelectorAll("[data-remove-admin]").forEach((button) => button.addEventListener("click", () => {
    captureRolePermissions(settings);
    settings.admins = normalizeAdmins(settings).filter((admin) => admin.email !== button.dataset.removeAdmin);
    renderRoles(settings);
  }));
  if (window.lucide) window.lucide.createIcons();
}

function captureRolePermissions(settings) {
  const admins = normalizeAdmins(settings).map((admin) => ({ ...admin, permissions: {} }));
  document.querySelectorAll("[data-admin-email][data-role-module]").forEach((row) => {
    const admin = admins.find((item) => item.email === row.dataset.adminEmail);
    if (!admin) return;
    if (String(admin.email).toLowerCase() === PRIMARY_ADMIN) return;
    admin.permissions[row.dataset.roleModule] = Object.fromEntries(["view", "edit", "delete", "add"].map((permission) => [permission, Boolean(row.querySelector(`[data-role-permission=\"${permission}\"]`)?.checked)]));
  });
  const founder = admins.find((admin) => String(admin.email).toLowerCase() === PRIMARY_ADMIN);
  if (founder) founder.permissions = defaultPermissions();
  settings.admins = admins;
}

function updatePlanLimits(plan) {
  $("developer-user-limit").textContent = "-";
  $("developer-branch-limit").textContent = PLAN_BRANCH_LIMITS[plan] || "-";
}

function fillForm(settings) {
  ["country", "currency", "language", "typography", "licenceNo", "licenceName", "purchaseDate", "validity", "plan"].forEach((name) => {
    const field = $(`developer-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
    if (field) field.value = settings[name] ?? "";
  });
  ["company", "branch", "admin", "staff", "public"].forEach((name) => {
    const field = $(`developer-default-${name}`);
    if (field) field.value = Number(settings.defaults?.[name] ?? 1);
  });
  const radio = document.querySelector(`input[name="industry"][value="${CSS.escape(settings.industry)}"]`);
  if (radio) radio.checked = true;
  updateRenewal();
  renderAccess(settings);
  updatePlanLimits(settings.plan);
  renderRoles(settings);
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
  settings.defaults = Object.fromEntries(["company", "branch", "admin", "staff", "public"].map((name) => [name, Math.max(0, Number($(`developer-default-${name}`)?.value) || 0)]));
  settings.industry = document.querySelector('input[name="industry"]:checked')?.value || "Traders";
  settings.access = {};
  document.querySelectorAll("[data-access-module]").forEach((row) => {
    const get = (name) => row.querySelector(`[data-access="${name}"]`);
    settings.access[row.dataset.accessModule] = { scope: get("scope").value, count: Number(get("count").value) || 0, prefill: get("prefill").value === "yes", view: get("view").checked, edit: get("edit").checked, delete: get("delete").checked, add: get("add").checked };
  });
  captureRolePermissions(settings);
  return settings;
}

async function loadManifestModules() {
  try {
    const response = await fetch(new URL("modules.json", document.baseURI), { cache: "no-store" });
    const manifest = await response.json();
    const modules = (manifest.modules || []).filter((item) => item.name !== "developer");
    if (modules.length) {
      const flatten = (items, parentTitle = "") => items.flatMap((item) => {
        if (item.name === "developer") return [];
        const title = item.title || item.name.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
        const label = parentTitle ? `${parentTitle} / ${title}` : title;
        const key = parentTitle ? String(item.path || `${parentTitle}/${item.name}`).toLowerCase().replace(/[^a-z0-9]+/g, ".") : String(item.name).toLowerCase();
        return [{ key, title: label }, ...flatten(item.children || [], label)];
      });
      return flatten(modules);
    }
  } catch { /* use the safe built-in list */ }
  return availableModules;
}

async function initDeveloperPage() {
  let settings = loadSettings();
  const modules = await loadManifestModules();
  if (modules.length) availableModules = modules;
  fillForm(settings);
  $("developer-country").addEventListener("change", (event) => {
    const currency = CURRENCY_BY_COUNTRY[event.target.value];
    if (currency) $("developer-currency").value = currency;
  });
  $("developer-plan").addEventListener("change", () => {
    settings = collectSettings(settings);
    updatePlanLimits($("developer-plan").value);
    renderAccess(settings);
  });
  $("developer-purchase-date").addEventListener("change", updateRenewal);
  $("developer-validity").addEventListener("change", updateRenewal);
  $("developer-add-admin").addEventListener("click", () => {
    const input = $("developer-admin-email");
    const email = input.value.trim().toLowerCase();
    if (!email || !input.checkValidity()) { input.reportValidity(); return; }
    settings = collectSettings(settings);
    if (normalizeAdmins(settings).some((admin) => admin.email.toLowerCase() === email)) { input.setCustomValidity("This administrator already exists."); input.reportValidity(); input.setCustomValidity(""); return; }
    settings.admins = [...normalizeAdmins(settings), { email, role: "Admin", permissions: defaultPermissions() }];
    input.value = "";
    renderRoles(settings);
  });
  $("developer-settings-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const next = collectSettings(settings);
    saveSettings(next);
    settings = next;
    fillForm(next);
    $("developer-status").textContent = `Saved ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}.`;
  });
  saveSettings(settings);
  if (window.lucide) window.lucide.createIcons();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initDeveloperPage);
else initDeveloperPage();
