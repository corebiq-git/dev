import { app } from '../../../js/firebase-config.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-functions.js';

const call = httpsCallable(getFunctions(app, 'us-central1'), 'manageRazorpayPayments');
const form = document.getElementById('razorpay-form');
const kind = form.elements.kind;
const status = document.getElementById('razorpay-status');
const list = document.getElementById('razorpay-list');
const refresh = document.querySelector('[data-razorpay-refresh]');
const previous = document.querySelector('[data-page="-1"]');
const next = document.querySelector('[data-page="1"]');
const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
let skip = 0;
let count = 0;
let busy = false;

function appendText(parent, tag, value) {
    const element = document.createElement(tag);
    element.textContent = value;
    parent.append(element);
    return element;
}

function render(items, paymentKind) {
    const isLink = paymentKind === 'link';
    list.replaceChildren();
    if (!items.length) appendText(list, 'p', 'No payment requests on this page.');
    for (const item of items) {
        const row = document.createElement('article');
        row.className = 'razorpay-row';
        appendText(row, 'strong', item.description || item.id);
        const amount = item.amount == null ? 'Variable amount' : formatter.format(item.amount / 100);
        const received = formatter.format((item.received ?? 0) / 100);
        appendText(row, 'p', `${amount} · Received ${received} · ${item.status}`);
        appendText(row, 'p', item.id);
        const actions = document.createElement('div');
        actions.className = 'razorpay-actions';
        if (typeof item.url === 'string' && item.url.startsWith('https://')) {
            if (!isLink) {
                const image = document.createElement('img');
                image.src = item.url;
                image.alt = 'UPI payment QR';
                image.loading = 'lazy';
                image.referrerPolicy = 'no-referrer';
                row.append(image);
            }
            const open = appendText(actions, 'a', isLink ? 'Open payment link' : 'Open QR image');
            open.href = item.url;
            open.target = '_blank';
            open.rel = 'noopener noreferrer';
            const copy = appendText(actions, 'button', isLink ? 'Copy link' : 'Copy QR URL');
            copy.type = 'button';
            copy.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(item.url);
                    status.textContent = 'Copied to clipboard.';
                } catch {
                    status.textContent = 'Could not copy. Open the URL to share it.';
                }
            };
        }
        if (isLink ? ['created', 'partially_paid'].includes(item.status) : item.status === 'active') {
            const label = isLink ? 'Cancel link' : 'Close QR';
            const close = appendText(actions, 'button', label);
            close.type = 'button';
            close.onclick = async () => {
                const message = `${label} ${item.id}?`;
                const confirmed = window.careConfirm
                    ? await window.careConfirm(message, { title: label, action: label })
                    : window.confirm(message);
                if (confirmed && kind.value === paymentKind) {
                    await run({ action: 'close', id: item.id }, skip);
                }
            };
        }
        row.append(actions);
        list.append(row);
    }
}

async function run(operation, offset = 0) {
    if (busy) return;
    busy = true;
    const paymentKind = kind.value;
    const controls = [...form.elements, refresh, previous, next, ...list.querySelectorAll('button')];
    for (const control of controls) control.disabled = true;
    status.textContent = 'Contacting Razorpay…';
    try {
        if (operation.action !== 'list') {
            const { data } = await call({ ...operation, kind: paymentKind });
            if (operation.action === 'create') {
                render(data.items, paymentKind);
                skip = 0;
                count = 0;
                status.textContent = `${data.mode} mode · Payment request created. Refresh to view all requests.`;
                return;
            }
        }
        const { data } = await call({ action: 'list', kind: paymentKind, skip: offset });
        render(data.items, paymentKind);
        skip = offset;
        count = data.items.length;
        status.textContent = `${data.mode} mode · ${count ? `Showing ${skip + 1}–${skip + count}` : 'No requests to display'}.`;
    } catch (error) {
        status.textContent = error.code === 'functions/not-found'
            ? 'The Razorpay Firebase function is unavailable. Check its deployment.'
            : error.message || 'Razorpay operation failed.';
    } finally {
        busy = false;
        for (const control of controls) control.disabled = false;
        previous.disabled = skip === 0;
        next.disabled = count < 20;
    }
}

form.addEventListener('submit', event => {
    event.preventDefault();
    const amount = Math.round(Number(form.elements.amount.value) * 100);
    void run({ action: 'create', amount, description: form.elements.description.value });
});
kind.addEventListener('change', () => {
    skip = 0;
    count = 0;
    list.replaceChildren();
    void run({ action: 'list' });
});
refresh.onclick = () => run({ action: 'list' }, skip);
previous.onclick = () => run({ action: 'list' }, Math.max(0, skip - 20));
next.onclick = () => run({ action: 'list' }, skip + 20);
void run({ action: 'list' });
