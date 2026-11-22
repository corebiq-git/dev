const PROVIDERS_KEY = "corebiq-payment-gateways";
const LINKS_KEY = "corebiq-payment-links";
const $ = (id) => document.getElementById(id);

function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeList(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function getCurrency() {
  try { return localStorage.getItem("corebiq-currency") || "INR"; } catch { return "INR"; }
}

function setStatus(id, message, type = "") {
  const element = $(id);
  element.textContent = message;
  element.dataset.type = type;
}

function renderProviders() {
  const providers = readList(PROVIDERS_KEY);
  $("gateway-count").textContent = String(providers.filter((provider) => provider.status === "connected").length);
  $("gateway-provider-empty").hidden = providers.length > 0;
  $("gateway-provider-list").innerHTML = providers.map((provider) => `<article class="gateway-provider-item">
    <div class="gateway-provider-mark"><i data-lucide="landmark" aria-hidden="true"></i></div>
    <div class="gateway-provider-copy"><strong>${escapeHtml(provider.name)}</strong><span>${escapeHtml(provider.pageLink)}</span><small>${provider.status === "connected" ? "Connected" : "Pending secure server connection"}</small></div>
    <div class="gateway-provider-actions"><span class="gateway-status-pill ${provider.status === "connected" ? "is-connected" : "is-pending"}">${provider.status === "connected" ? "Connected" : "Pending"}</span><button type="button" class="gateway-remove-button" data-remove-provider="${escapeHtml(provider.id)}" aria-label="Remove ${escapeHtml(provider.name)}"><i data-lucide="trash-2" aria-hidden="true"></i></button></div>
  </article>`).join("");
  const select = $("gateway-link-provider");
  const current = select.value;
  select.innerHTML = `<option value="">Select a connected gateway</option>${providers.filter((provider) => provider.status === "connected").map((provider) => `<option value="${escapeHtml(provider.id)}">${escapeHtml(provider.name)}</option>`).join("")}`;
  if (providers.some((provider) => provider.id === current && provider.status === "connected")) select.value = current;
  $("gateway-provider-list").querySelectorAll("[data-remove-provider]").forEach((button) => button.addEventListener("click", () => {
    writeList(PROVIDERS_KEY, readList(PROVIDERS_KEY).filter((provider) => provider.id !== button.dataset.removeProvider));
    renderProviders();
  }));
  if (window.lucide) window.lucide.createIcons();
}

function renderLinks() {
  const links = readList(LINKS_KEY);
  $("gateway-link-count").textContent = String(links.length);
  $("gateway-link-empty").hidden = links.length > 0;
  $("gateway-link-rows").innerHTML = links.slice().reverse().map((link) => `<tr>
    <td>${escapeHtml(link.reference || "—")}</td><td>${escapeHtml(link.customerName)}<small>${escapeHtml(link.customerEmail)}</small></td><td>${escapeHtml(link.currency)} ${escapeHtml(link.amount)}</td><td>${escapeHtml(link.provider)}</td><td><span class="gateway-status-pill is-pending">${escapeHtml(link.status || "Created")}</span></td><td>${link.url ? `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="gateway-link-open">Open <i data-lucide="arrow-up-right" aria-hidden="true"></i></a>` : "—"}</td>
  </tr>`).join("");
  if (window.lucide) window.lucide.createIcons();
}

async function postSecure(path, payload) {
  const response = await fetch(new URL(path, document.baseURI), {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-COREBIQ-CLIENT": "payment-gateway" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Secure gateway service returned ${response.status}.`);
  return response.json().catch(() => ({}));
}

function clearSensitiveFields() {
  ["gateway-api-key", "gateway-api-secret", "gateway-webhook-secret"].forEach((id) => { $(id).value = ""; });
}

function bindProviderDialog() {
  const dialog = $("gateway-provider-dialog");
  $("gateway-show-provider").addEventListener("click", () => { $("gateway-provider-status").textContent = ""; dialog.showModal(); });
  ["gateway-close-provider", "gateway-cancel-provider"].forEach((id) => $(id).addEventListener("click", () => dialog.close()));
  $("gateway-provider-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const provider = $("gateway-provider-name").value;
    const pageLink = $("gateway-page-link").value.trim();
    const apiKey = $("gateway-api-key").value;
    const apiSecret = $("gateway-api-secret").value;
    const webhookSecret = $("gateway-webhook-secret").value;
    const metadata = { id: crypto.randomUUID(), name: provider, pageLink, status: "pending", createdAt: new Date().toISOString() };
    try {
      await postSecure("api/payment-gateways/connect", { provider, pageLink, apiKey, apiSecret, webhookSecret });
      metadata.status = "connected";
      setStatus("gateway-provider-status", "Provider connected securely.", "success");
    } catch (error) {
      setStatus("gateway-provider-status", "Provider details saved as pending. Configure the secure backend endpoint before live connection.", "warning");
    } finally {
      clearSensitiveFields();
      const providers = readList(PROVIDERS_KEY).filter((item) => item.name !== provider);
      writeList(PROVIDERS_KEY, [...providers, metadata]);
      renderProviders();
      setTimeout(() => dialog.close(), 700);
    }
  });
}

function bindPaymentLinkForm() {
  $("gateway-link-currency").value = getCurrency();
  $("gateway-link-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const providerId = $("gateway-link-provider").value;
    if (!providerId) { setStatus("gateway-link-status", "Connect a gateway before creating a payment link.", "warning"); return; }
    const provider = readList(PROVIDERS_KEY).find((item) => item.id === providerId);
    const payload = {
      providerId, amount: Number($("gateway-link-amount").value), currency: $("gateway-link-currency").value.trim().toUpperCase(),
      customerName: $("gateway-link-name").value.trim(), customerEmail: $("gateway-link-email").value.trim(),
      description: $("gateway-link-description").value.trim(), reference: $("gateway-link-reference").value.trim(), expiry: $("gateway-link-expiry").value || null
    };
    try {
      setStatus("gateway-link-status", "Creating secure payment link…");
      const result = await postSecure("api/payment-gateways/payment-links", payload);
      const link = { ...payload, provider: provider?.name || "Gateway", url: result.url || result.short_url || "", status: result.status || "Created", createdAt: new Date().toISOString() };
      writeList(LINKS_KEY, [...readList(LINKS_KEY), link]);
      renderLinks();
      setStatus("gateway-link-status", link.url ? "Payment link created." : "Payment request accepted by the secure service.", "success");
    } catch (error) {
      setStatus("gateway-link-status", "Payment link service is not configured. No payment or secret was sent.", "warning");
    }
  });
}

function initPaymentGateway() {
  renderProviders();
  renderLinks();
  bindProviderDialog();
  bindPaymentLinkForm();
  $("gateway-currency").textContent = getCurrency();
  if (window.lucide) window.lucide.createIcons();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPaymentGateway);
else initPaymentGateway();
