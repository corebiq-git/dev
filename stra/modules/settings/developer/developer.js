import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-functions.js';

const root = document.getElementById('developer-module');
const byId = id => root.querySelector('#developer-' + id);
const functions = getFunctions(undefined, 'us-central1');
const load = httpsCallable(functions, 'getDeveloperWorkspace');
const loadMetrics = httpsCallable(functions, 'getDeveloperWorkspaceMetrics');
const save = httpsCallable(functions, 'saveDeveloperWorkspaceSettings');
const number = new Intl.NumberFormat('en-IN');
const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const form = byId('settings-form');
const refresh = byId('refresh');
let workspace;

function put(id, value) { byId(id).textContent = value; }

function renderPairs(id, values) {
    const list = document.createElement('dl');
    for (const [label, value] of values) {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        const detail = document.createElement('dd');
        term.textContent = label;
        detail.textContent = value;
        row.append(term, detail);
        list.append(row);
    }
    byId(id).replaceChildren(list);
}

function renderWorkspace(data) {
    workspace = data;
    root.querySelectorAll('[data-section]').forEach(section => {
        section.hidden = data.sections[section.dataset.section] !== true;
    });
    if (data.subscription) {
        const formatDay = value => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' })
            .format(new Date(value + 'T00:00:00Z'));
        put('plan', data.subscription.plan);
        put('purchase-date', formatDay(data.subscription.purchaseDate));
        put('valid-until', formatDay(data.subscription.validUntil));
    }
    put('version', window.COREBIQ_APP_VERSION || 'Unavailable');
    put('notice', data.notice || 'No workspace notice has been posted.');
    if (data.projectId) {
        const url = new URL('https://console.cloud.google.com/billing');
        url.searchParams.set('project', data.projectId);
        byId('billing-console').href = url;
    }
    byId('refresh-panel').hidden = !data.sections.usage && !data.sections.billing;
    byId('admin-panel').hidden = data.role !== 'admin';
    if (data.role === 'admin') {
        Object.keys(data.sections).forEach(key => {
            form.elements.namedItem(key).checked = data.sections[key];
        });
        form.elements.namedItem('notice').value = data.adminNotice || '';
    }
    byId('sections').hidden = false;
}

function showUsage(usage) {
    if (!usage || usage.error) {
        byId('usage-data').replaceChildren();
        put('usage-status', usage?.error || 'Usage unavailable for this account.');
        return;
    }
    const totals = usage.daily.reduce((sum, day) => ({
        reads: sum.reads + day.reads, writes: sum.writes + day.writes, deletes: sum.deletes + day.deletes
    }), { reads: 0, writes: 0, deletes: 0 });
    renderPairs('usage-data', [
        ['Reads today', number.format(usage.current.reads)], ['Writes today', number.format(usage.current.writes)],
        ['Deletes today', number.format(usage.current.deletes)],
        ['Storage (MiB)', number.format(usage.current.storageBytes / (1024 ** 2))],
        ['Reads over 14 days', number.format(totals.reads)],
        ['Writes over 14 days', number.format(totals.writes)],
        ['Deletes over 14 days', number.format(totals.deletes)]
    ]);
    put('usage-status', 'Queried at ' + date.format(new Date(usage.lastUpdated)));
    const nearLimit = ['reads', 'writes', 'deletes'].filter(key => usage.current[key] >= usage.quotas[key] * .9);
    byId('metric-alert').hidden = !nearLimit.length;
    if (nearLimit.length) put('metric-alert', 'At least 90% of the daily free-tier reference for ' + nearLimit.join(', ') + '.');
}

function showBilling(billing) {
    if (billing?.status !== 'available') {
        byId('billing-data').replaceChildren();
        put('billing-status', billing?.status === 'not-configured'
            ? 'Billing export setup is pending. View costs in Cloud Billing if your Google account has access.'
            : 'Exported costs are unavailable. Check again later or open Cloud Billing.');
        return;
    }
    renderPairs('billing-data', billing.totals.flatMap(entry => {
        const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: entry.currency });
        return [
            [entry.currency + ' gross cost', money.format(entry.gross)],
            [entry.currency + ' credits', money.format(entry.credits)],
            [entry.currency + ' net cost', money.format(entry.gross + entry.credits)],
            [entry.currency + ' latest export', entry.latestExport || 'Unavailable']
        ];
    }));
    put('billing-status', billing.totals.length ? 'Estimated month-to-date costs' : 'The export has no entries for this project and period yet.');
}

async function refreshMetrics() {
    if (!workspace || refresh.disabled || byId('refresh-panel').hidden) return;
    refresh.disabled = true;
    const { usage, billing } = workspace.sections;
    if (usage) put('usage-status', 'Checking usage…');
    if (billing) put('billing-status', 'Checking billing…');
    try {
        const { data } = await loadMetrics({ usage, billing });
        if (usage) showUsage(data.usage);
        if (billing) showBilling(data.billing);
    } catch {
        if (usage) showUsage();
        if (billing) showBilling();
    } finally {
        refresh.disabled = false;
    }
}

refresh.addEventListener('click', refreshMetrics);
form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    try {
        const adminSections = Object.fromEntries(Object.keys(workspace.sections).map(key => [
            key, form.elements.namedItem(key).checked
        ]));
        const notice = form.elements.namedItem('notice').value.trim();
        await save({ adminSections, notice });
        renderWorkspace((await load()).data);
        await refreshMetrics();
        window.alert('Developer Workspace settings saved.');
    } catch (error) {
        window.alert(error.message || 'Unable to save the Developer Workspace settings.');
    } finally {
        button.disabled = false;
    }
});

try {
    renderWorkspace((await load()).data);
    await refreshMetrics();
    byId('status').hidden = true;
} catch (error) {
    put('status', error.code === 'functions/not-found'
        ? 'Deploy the Developer Workspace functions to enable this page.'
        : error.message || 'Unable to open the Developer Workspace.');
}
