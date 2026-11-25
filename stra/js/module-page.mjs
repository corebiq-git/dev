const pageSize = 10;

// Existing module actions, or the first editable field of an inline create form.
const addTargets = {
    'view-appointments': '.new-btn',
    'view-patients': '.patient-add-button',
    'view-transaction': '.txn-add-btn',
    'view-attendance': 'button[onclick*="openAttModal"]',
    'view-my-tasks': '#task-new-button',
    'view-staff': '#staff-form input:not([type="hidden"]):not([readonly])',
    'view-therapist': '#therapist-form input:not([type="hidden"]):not([readonly])',
    'view-ledgers': '#lName',
    'view-users': '#editUserEmail'
};
const lists = {
    'view-patients': ['#patientTableBody'],
    'view-appointments': ['#therapistWiseReportContent', '.therapist-report-table tbody tr'],
    'view-contacts': ['#contacts-list', '.contact-row'],
    'view-my-tasks': ['#task-list', '.task-card'],
    'view-transaction': ['#txnTableBody'],
    'view-cash-ledger': ['#cashLedgerRows'],
    'view-bank-ledger': ['#bankLedgerRows'],
    'view-ledgers': ['#ledgerTableBody', 'tbody > tr', 'table'],
    'view-attendance': ['#attTableBody'],
    'view-branches': ['#branchTableBody'],
    'view-staff': ['#staffTableBody'],
    'view-therapist': ['#therapistTableBody'],
    'view-users': ['#usersTableBody']
};
const directoryControls = {
    'view-users': { search: true, filterColumn: 1, filterLabel: 'Role' },
    'view-staff': { filterColumn: 2, filterLabel: 'Branch' },
    'view-therapist': { filterColumn: 2, filterLabel: 'Branch' },
    'view-branches': {}
};
const inlineResets = {
    'view-staff': 'button[onclick*="clearStaffForm"]',
    'view-therapist': 'button[onclick*="clearTherapistForm"]',
    'view-ledgers': 'button[onclick*="resetLedgerForm"]',
    'view-users': '#clearUserBtn'
};
const titleOverrides = {
    'view-invoice': 'Invoice',
    'view-calender': 'Calendar',
    'view-corebiq-ai': 'COREBIQ AI',
    'view-qr': 'UPI QR',
    'view-licenceinfo': 'Licence Information',
    'view-aboutapp': 'About Care'
};

export function modulePageTitle(id) {
    return titleOverrides[id] || id.slice(5).replace(/\b\w/g, letter => letter.toUpperCase()).replaceAll('-', ' ');
}

export function paginateRecords(total, page) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(pages - 1, Math.max(0, page));
    const start = current * pageSize;
    return { current, pages, start, end: Math.min(start + pageSize, total) };
}

function addButton(label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    return button;
}

export function mountModuleCard(view, title, home) {
    if (view.id === 'view-dashboard' || view.querySelector(':scope > .care-module-card')) return;
    const header = document.createElement('header');
    header.className = 'care-module-card';
    const text = document.createElement('div');
    const breadcrumb = document.createElement('p');
    breadcrumb.className = 'care-module-path';
    const link = document.createElement('a');
    link.href = './index.html';
    link.textContent = 'Care';
    link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        home();
    });
    breadcrumb.append(link, document.createTextNode(' / ' + title));
    const heading = document.createElement('h1');
    heading.textContent = title;
    text.append(heading, breadcrumb);
    header.append(text);

    const target = view.querySelector(addTargets[view.id] || '[data-care-add]');
    if (target && !target.disabled && target.getClientRects().length) {
        const add = addButton('+ Add');
        add.className = 'care-module-add';
        add.addEventListener('click', () => {
            if (target.disabled || !target.getClientRects().length) return;
            if (target.tagName === 'BUTTON') {
                target.click();
            } else {
                const reset = inlineResets[view.id];
                if (reset) view.querySelector(reset)?.click();
                target.scrollIntoView({ block: 'center' });
                target.focus({ preventScroll: true });
            }
        });
        header.append(add);
    }
    view.prepend(header);
}

export function mountModuleList(view) {
    const settings = lists[view.id];
    if (!settings) return;
    const [selector, rowSelector = 'tr', groupSelector] = settings;
    const anchor = view.querySelector(selector);
    if (!anchor) return;
    const root = groupSelector ? anchor.closest(groupSelector) : anchor;
    const table = anchor.closest('table');
    const listEnd = table?.parentElement.matches('div, section') && table.parentElement.children.length === 1
        ? table.parentElement : table || anchor;

    const footer = document.createElement('div');
    footer.className = 'care-list-footer no-print';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const previous = addButton('Previous');
    const next = addButton('Next');
    const buttons = document.createElement('div');
    buttons.append(previous, next);
    footer.append(status, buttons);
    listEnd.after(footer);

    const controls = directoryControls[view.id];
    let search, filter, sort, originalOrder;
    if (controls) {
        const toolbar = document.createElement('div');
        toolbar.className = 'care-list-tools no-print';
        if (controls.search) {
            search = document.createElement('input');
            search.type = 'search';
            search.placeholder = 'Search users';
            search.setAttribute('aria-label', 'Search users');
            toolbar.append(search);
        }
        if (controls.filterColumn !== undefined) {
            filter = document.createElement('select');
            filter.setAttribute('aria-label', 'Filter by ' + controls.filterLabel.toLowerCase());
            toolbar.append(filter);
        }
        sort = document.createElement('select');
        sort.setAttribute('aria-label', 'Sort records');
        sort.add(new Option('Default order', ''));
        sort.add(new Option('A to Z', 'asc'));
        sort.add(new Option('Z to A', 'desc'));
        toolbar.append(sort);
        listEnd.before(toolbar);
    }

    let page = 0;
    let frame;
    const refresh = () => {
        const groups = [...root.querySelectorAll('.therapist-report-group')];
        let allRows = [...root.querySelectorAll(rowSelector)];
        if (sort) {
            const records = allRows.filter(row => row.cells.length > 1);
            if (!originalOrder || records.length !== originalOrder.length ||
                records.some(row => !originalOrder.includes(row))) originalOrder = records;
            const ordered = sort.value
                ? [...records].sort((a, b) => a.cells[0].textContent.trim().localeCompare(
                    b.cells[0].textContent.trim(), undefined, { numeric: true, sensitivity: 'base' }
                ) * (sort.value === 'asc' ? 1 : -1))
                : originalOrder;
            if (ordered.some((row, index) => row !== records[index])) {
                root.append(...ordered);
                allRows = [...root.querySelectorAll(rowSelector)];
            }
        }
        const candidates = allRows.filter(row =>
            (row.tagName !== 'TR' || row.cells.length > 1) && !row.hidden && row.style.display !== 'none');
        const filterValue = row => row.cells[controls.filterColumn]?.textContent.trim() || '';
        if (filter) {
            const selected = filter.value;
            const values = [...new Set(allRows.filter(row => row.cells.length > 1).map(filterValue))]
                .filter(Boolean).sort((a, b) => a.localeCompare(b));
            filter.replaceChildren(new Option('All ' + controls.filterLabel.toLowerCase() + 's', ''),
                ...values.map(value => new Option(value, value)));
            filter.value = values.includes(selected) ? selected : '';
        }
        const term = search?.value.trim().toLowerCase() || '';
        const rows = candidates.filter(row =>
            (!term || row.textContent.toLowerCase().includes(term)) &&
            (!filter?.value || filterValue(row) === filter.value));
        const inScope = new Set(candidates);
        const range = paginateRecords(rows.length, page);
        page = range.current;
        const shown = new Set(rows.slice(range.start, range.end));
        allRows.forEach(row => {
            row.toggleAttribute('data-care-page-hidden', inScope.has(row) && !shown.has(row));
        });
        groups.forEach(group => {
            group.toggleAttribute('data-care-page-hidden',
                ![...group.querySelectorAll(rowSelector)].some(row => shown.has(row)));
        });
        footer.hidden = candidates.length === 0;
        status.textContent = rows.length ? `${range.start + 1}–${range.end} of ${rows.length}` : 'No matching records';
        previous.disabled = page === 0;
        next.disabled = page + 1 >= range.pages;
    };
    const schedule = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(refresh);
    };
    function reset(event) {
        if (event.target.closest('tbody, #contacts-list, #task-list, #therapistWiseReportContent')) return;
        page = 0;
        schedule();
    }
    view.addEventListener('input', reset);
    view.addEventListener('change', reset);
    previous.addEventListener('click', () => { page--; refresh(); });
    next.addEventListener('click', () => { page++; refresh(); });
    new MutationObserver(schedule).observe(root, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'hidden']
    });
    refresh();
}
