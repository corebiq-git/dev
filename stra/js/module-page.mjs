const pageSize = 10;

// Existing module actions, or the first editable field of an inline create form.
const addTargets = {
    'view-appointments': '.new-btn',
    'view-patients': '.patient-add-button',
    'view-transaction': '.txn-add-btn',
    'view-cash-ledger': '.ledger-head .ledger-btn.primary',
    'view-bank-ledger': '.ledger-head .ledger-btn.primary',
    'view-attendance': 'button[onclick*="openAttModal"]',
    'view-my-tasks': '#task-new-button',
    'view-staff': '#staff-add-popup',
    'view-payroll': '#payroll-add',
    'view-therapist': '#therapist-add-popup',
    'view-ledgers': '#lName',
    'view-users': '#editUserEmail'
};
const legacyHeadings = {
    'view-appointments': '.appointment-page-header',
    'view-patients': '.patients-hero',
    'view-transaction': '.txn-topbar',
    'view-attendance': '#attendance-module > .section-title > h2',
    'view-my-tasks': '.task-heading',
    'view-contacts': '.contacts-heading',
    'view-staff': '#staff-module > .section-title',
    'view-therapist': '#therapist-module > .section-title',
    'view-branches': '.branches-heading',
    'view-ledgers': '#ledger-module > .section-title',
    'view-users': '.users-page > h2',
    'view-company': '.company-page-header',
    'view-cash-ledger': '#cash-ledger-module h1',
    'view-bank-ledger': '#bank-ledger-module h1',
    'view-calender': '#calendar-module h1',
    'view-letterhead': '.studio-heading',
    'view-report': '.studio-heading',
    'view-bank-card': '.bank-card-title',
    'view-licenceinfo': '.licence-header',
    'view-qr': '#upi-qr-module > .section-title',
    'view-seal': '#seal-module > .section-title',
    'view-aboutapp': '.about-heading',
    'view-privacy': '#privacy-module > .section-title',
    'view-updates': '#updates-module .section-title',
    'view-backup': 'div.module-container > .section-title'
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
    'view-branches': {},
    'view-ledgers': { filterColumn: 2, filterLabel: 'Category', sort: false }
};
const inlineResets = {
    'view-staff': 'button[onclick*="clearStaffForm"]',
    'view-therapist': 'button[onclick*="clearTherapistForm"]',
    'view-ledgers': 'button[onclick*="resetLedgerForm"]',
    'view-users': '#clearUserBtn'
};
const titleOverrides = {
    'view-developer': 'Developer Workspace',
    'view-invoice': 'Invoice',
    'view-calender': 'Calendar',
    'view-corebiq-ai': 'BIQ AI',
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

function buttonLabel(button) {
    const copy = button.cloneNode(true);
    copy.querySelectorAll('svg, .material-symbols-rounded, .material-symbols-outlined, .material-icons')
        .forEach(icon => icon.remove());
    return copy.textContent.trim();
}

function styleModuleButtons(view) {
    view.querySelectorAll('button').forEach(button => {
        const label = buttonLabel(button);
        if (/^cancel$/i.test(label)) {
            button.dataset.careButton = 'cancel';
        } else if (/^(save\b|update\b|submit\b|create\b)/i.test(label)) {
            button.dataset.careButton = 'save';
        } else if (/^(clear form|request leave|mark attendance|bulk post attendance)$/i.test(label)) {
            button.dataset.careButton = 'secondary';
        }
        if (button.dataset.careButton && button.parentElement?.matches('div:not(.input-group)')) {
            button.parentElement.classList.add('care-button-row');
        }
    });
}

const moduleHeroIcons = {
    "appointments": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M16 3v4M8 3v4M3 11h18m5 4 2 2 4-4\"/>",
    "patients": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M19 8v6m-3-3h6\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/>",
    "contacts": "<rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/><path d=\"M7 18a5 5 0 0 1 10 0M2 8h2M2 12h2M2 16h2\"/>",
    "my-tasks": "<path d=\"m3 6 2 2 4-4M13 6h8M3 13l2 2 4-4M13 13h8M3 20l2 2 4-4M13 20h8\"/>",
    "public-booking": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M16 3v4M8 3v4M3 11h18M12 14v4M10 16h4\"/>",
    "email": "<rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/><path d=\"m22 7-10 6L2 7\"/>",
    "invoice": "<path d=\"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1zM8 8h8M8 12h8M8 16h5\"/>",
    "transaction": "<path d=\"M3 7h18m-4-4 4 4-4 4M21 17H3m4-4-4 4 4 4\"/>",
    "razorpay": "<rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"2\"/><path d=\"M2 10h20M6 15h4\"/>",
    "cash-ledger": "<rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M6 12h.01M18 12h.01\"/>",
    "bank-ledger": "<path d=\"m3 10 9-7 9 7M4 10h16M6 10v9M10 10v9M14 10v9M18 10v9M3 21h18\"/>",
    "ledgers": "<path d=\"M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z\"/><path d=\"M8 7h8M8 11h6\"/>",
    "branches": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M9 21V9h6v12M7 7h.01M17 7h.01M7 13h.01M17 13h.01\"/>",
    "therapist": "<path d=\"M6 2v4a4 4 0 0 0 8 0V2M4 2h4M12 2h4M10 10v4a5 5 0 0 0 10 0v-2\"/><circle cx=\"20\" cy=\"10\" r=\"2\"/>",
    "calender": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M16 3v4M8 3v4M3 11h18\"/>",
    "staff": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75\"/><circle cx=\"10\" cy=\"7\" r=\"4\"/>",
    "attendance": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 6v6l4 2\"/>",
    "users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m15-10 2 2 4-4\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/>",
    "developer": "<path d=\"m8 6-6 6 6 6m8-12 6 6-6 6M14 4l-4 16\"/>",
    "clinic-details": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M9 5V3h6v2M12 9v6m-3-3h6\"/>",
    "company": "<rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2\"/><path d=\"M9 21v-5h6v5M8 7h.01M16 7h.01M8 11h.01M16 11h.01\"/>",
    "letterhead": "<path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8\"/>",
    "bank-card": "<rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"2\"/><path d=\"M2 10h20M6 15h4\"/>",
    "report": "<path d=\"M3 3v18h18M8 16v-4m4 4V8m4 8V5\"/>",
    "seal": "<circle cx=\"12\" cy=\"8\" r=\"6\"/><path d=\"m8 13-2 9 6-3 6 3-2-9\"/>",
    "qr": "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\"/><path d=\"M14 14h3v3h4v4h-4m-3-4v4\"/>",
    "updates": "<path d=\"M20 7v5h-5M4 17v-5h5M6 8a7 7 0 0 1 12-2l2 6M18 16a7 7 0 0 1-12 2l-2-6\"/>",
    "licenceinfo": "<path d=\"M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z\"/><path d=\"m9 12 2 2 4-4\"/>",
    "aboutapp": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 11v5M12 8h.01\"/>",
    "privacy": "<rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>",
    "backup": "<path d=\"M20 16a4.5 4.5 0 0 0-2-8.5 6 6 0 0 0-11.5 1.5 4 4 0 0 0 0 8H9m3-8v12m-4-4 4 4 4-4\"/>",
    "corebiq-ai": "<path d=\"m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3zM19 14l1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14z\"/>",
    "calc": "<rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\"/><path d=\"M8 6h8v4H8zM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01\"/>"
};
function heroIcon(viewId) {
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
    icon.setAttribute('class','care-module-title-icon lucide');
    icon.setAttribute('viewBox','0 0 24 24');
    icon.setAttribute('fill','none');
    icon.setAttribute('stroke','currentColor');
    icon.setAttribute('stroke-width','1.8');
    icon.setAttribute('stroke-linecap','round');
    icon.setAttribute('stroke-linejoin','round');
    icon.setAttribute('aria-hidden','true');
    icon.innerHTML=moduleHeroIcons[viewId.replace(/^view-/,'')] || '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>';
    return icon;
}
export function mountModuleCard(view, title, home) {
    if (view.id === 'view-dashboard' || view.querySelector('[data-care-page-heading]')) {
        styleModuleButtons(view);
        return;
    }
    if (view.querySelector(':scope > .care-module-card')) return;
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
    const titleText = document.createElement('span');
    titleText.textContent = title;
    heading.append(heroIcon(view.id), titleText);
    text.append(heading, breadcrumb);
    header.append(text);

    const actions = document.createElement('div');
    actions.className = 'care-module-actions';
    const target = view.querySelector(addTargets[view.id] || '[data-care-add]');
    if (target && target.tagName === 'BUTTON') {
        // Move the original control so its handlers, visibility and disabled state travel with it.
        let originalLabel = target.getAttribute('aria-label') || buttonLabel(target);
        if (view.id === 'view-cash-ledger' || view.id === 'view-bank-ledger') {
            originalLabel = 'Add transaction';
            target.onclick = () => window.openCareQuickAction('transaction', target);
        }
        target.setAttribute('aria-label', originalLabel || 'Add ' + title);
        target.title = originalLabel || 'Add ' + title;
        target.classList.add('care-module-add');
        target.textContent = '+ Add';
        actions.append(target);
    } else if (target) {
        const add = addButton('+ Add');
        add.className = 'care-module-add';
        add.addEventListener('click', () => {
            if (target.disabled || target.hidden) return;
            const reset = inlineResets[view.id];
            if (reset) view.querySelector(reset)?.click();
            target.scrollIntoView({ block: 'center' });
            target.focus({ preventScroll: true });
        });
        actions.append(add);
    }
    const refresh = view.id === 'view-patients' && view.querySelector('.patient-refresh-button');
    if (refresh) {
        refresh.classList.add('care-module-secondary');
        actions.prepend(refresh);
    }
    if (actions.childElementCount) header.append(actions);
    const legacyHeading = legacyHeadings[view.id];
    if (legacyHeading) view.querySelector(legacyHeading)?.setAttribute('data-care-legacy-heading', '');
    styleModuleButtons(view);
    view.prepend(header);
}


const mobileListQuery = typeof matchMedia === 'function' ? matchMedia('(max-width: 768px)') : null;
const mobileToolConfigs = {
    'view-patients': {container:'.patients-toolbar',search:'#patientSearchInput',filters:['#filterBranch','#filterCategory'],extra:['#filterRecentPatients','.patient-date-filter'],actions:['.patient-clear-filters','.patient-more-actions']},
    'view-transaction': {container:'.transactions-toolbar',search:'#txnSearchInput',filters:['#filterTxnType','#filterTxnBranch'],extra:['#filterTxnDateFrom','#filterTxnDateTo','#filterTxnMode','#sortTxnBy'],actions:['.clear-filters','button[onclick*="openPatientTxnReport"]','.txn-toolbar-actions button[onclick*="print"]']},
    'view-attendance': {container:'#attSearchInput',search:'#attSearchInput',filters:['#filterAttPeriod','#filterAttStatus'],extra:['#filterAttBranch','#filterAttMonth'],actions:['button[onclick*="clearAttFilters"]','button[onclick*="exportDailyAttCSV"]','#daily-log-container button[onclick*="window.print()"]']},
    'view-cash-ledger': {container:'.ledger-panel .filters',search:'#cashLedgerSearch',filters:['#cashLedgerType','#cashLedgerBranch'],extra:['#cashLedgerFrom','#cashLedgerTo'],actions:['button[onclick*="clearLedgerFilters"]','.head-actions button[onclick*="window.print()"]']},
    'view-bank-ledger': {container:'.ledger-panel .filters',search:'#bankLedgerSearch',filters:['#bankLedgerType','#bankLedgerBranch'],extra:['#bankLedgerFrom','#bankLedgerTo'],actions:['button[onclick*="clearLedgerFilters"]','.head-actions button[onclick*="window.print()"]']},
    'view-staff': {container:'.care-list-tools',search:'#staffSearchInput',filters:['.care-list-tools select:first-of-type','.care-list-tools select:last-of-type']},
    'view-therapist': {container:'.care-list-tools',search:'#therapistSearchInput',filters:['.care-list-tools select:first-of-type','.care-list-tools select:last-of-type']},
    'view-branches': {container:'.care-list-tools',search:'#branchSearchInput',filters:['.care-list-tools select']},
    'view-users': {container:'.care-list-tools',search:'.care-list-tools input',filters:['.care-list-tools select:first-of-type','.care-list-tools select:last-of-type']},
    'view-ledgers': {container:'.care-list-tools',search:'#searchLedger',filters:['.care-list-tools select']},
    'view-contacts': {container:'.contacts-search',search:'#contacts-search-input',extra:['.contacts-tabs']},
    'view-my-tasks': {container:'.task-filters',search:'#task-search',filters:['#task-filter-status']}
};
const rowIcons = {
    search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    more:'<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    close:'<path d="m18 6-12 12M6 6l12 12"/>',
    filter:'<path d="M4 7h16M7 12h10M10 17h4"/>',
    calendar:'<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.09 5.18 2 2 0 0 1 5.08 3h3a2 2 0 0 1 2 1.72l.54 3.27a2 2 0 0 1-.57 2.11l-1.27 1.27a16 16 0 0 0 5.85 5.85l1.27-1.27a2 2 0 0 1 2.11-.57l3.27.54A2 2 0 0 1 22 16.92z"/>',
    pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    rupee:'<path d="M6 3h12M6 8h12M6 13l8 8M6 13h3a5 5 0 0 0 0-10"/>',
    mail:'<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 6L2 7"/>',
    check:'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8"/>',
    tag:'<path d="M20 13 11 4H4v7l9 9a2 2 0 0 0 3 0l4-4a2 2 0 0 0 0-3zM8.5 8.5h.01"/>',
    id:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M6 16c1-3 5-3 6 0M15 9h3M15 13h3"/>'
};
function iconSvg(name) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + rowIcons[name] + '</svg>';
}
function columnIcon(label) {
    if (/actions/i.test(label)) return '';
    if (/date|time/i.test(label)) return 'calendar';
    if (/email/i.test(label)) return 'mail';
    if (/mobile|phone|contact/i.test(label)) return 'phone';
    if (/branch|address|location|maps/i.test(label)) return 'pin';
    if (/amount|balance|cash|fee|in \(\+\)|out \(/i.test(label)) return 'rupee';
    if (/status/i.test(label)) return 'check';
    if (/name|patient|employee|therapist/i.test(label)) return 'user';
    if (/role|category|type|mode|special/i.test(label)) return 'tag';
    if (/id|no\.|voucher/i.test(label)) return 'id';
    return 'file';
}
function markFlatReport(table) {
    if (!table) return;
    table.classList.add('care-flat-report');
    table.parentElement?.classList.add('care-flat-report-wrap');
    const headings = [...(table.tHead?.rows[0]?.cells || [])].map(cell => buttonLabel(cell));
    for (const row of [...table.tBodies].flatMap(body => [...body.rows])) {
        if (row.cells.length < 2) continue;
        [...row.cells].forEach((cell,i) => {
            const label = cell.dataset.label || headings[i] || '';
            if (cell.dataset.careColumn === label) return;
            cell.dataset.careColumn = label;
            const icon = columnIcon(label);
            if(icon) {
                const svg = iconSvg(icon).replace('currentColor','#000');
                cell.style.setProperty('--care-row-icon','url("data:image/svg+xml,' + encodeURIComponent(svg) + '")');
            }
            if (/actions/i.test(label)) cell.setAttribute('data-care-actions','');
        });
    }
}
let openMobilePopup;
export function closeMobileListPopup() { openMobilePopup?.(); }
function mountMobileListTools(view, listEnd) {
    const config = mobileToolConfigs[view.id];
    if (!config || !mobileListQuery || view.querySelector('.care-mobile-tools')) return;
    const search = view.querySelector(config.search);
    if (!search) return;
    const wrapperFor = node => {
        if (!node.matches('input,select')) return node;
        const parent = node.parentElement;
        if (parent?.matches('label,div') && parent.querySelectorAll('input,select,button,details').length === 1 &&
            !parent.matches('.care-list-tools,.task-filters,.filters,.no-print,.table-header')) return parent;
        return node;
    };
    const container = view.querySelector(config.container);
    const anchor = container === search ? wrapperFor(search) : container || listEnd;
    const toolbar = document.createElement('div');
    toolbar.className = 'care-mobile-tools no-print';
    const searchBox = document.createElement('div');
    searchBox.className = 'care-mobile-search';
    searchBox.innerHTML = iconSvg('search');
    const clear = addButton('');
    clear.className = 'care-mobile-clear'; clear.setAttribute('aria-label','Clear search'); clear.innerHTML = iconSvg('close');
    clear.addEventListener('click', () => {
        search.value = '';
        search.dispatchEvent(new Event('input',{bubbles:true}));
        search.dispatchEvent(new Event('keyup',{bubbles:true}));
    });
    const filterRow = document.createElement('div'); filterRow.className = 'care-mobile-filter-row';
    const action = addButton(''); action.className = 'care-mobile-more';
    action.setAttribute('aria-label','Filters and actions'); action.setAttribute('aria-expanded','false'); action.innerHTML=iconSvg('more');
    const popup = document.createElement('div'); popup.className = 'care-mobile-popup'; popup.hidden = true;
    popup.setAttribute('aria-label','Filters and actions');
    const native = typeof popup.showPopover === 'function';
    if (native) popup.setAttribute('popover','auto');
    const heading = document.createElement('div'); heading.className='care-mobile-popup-heading'; heading.textContent='Filters & actions';
    popup.append(heading);
    toolbar.append(searchBox,filterRow,popup);
    anchor.before(toolbar);
    const placements = [];
    const seen = new Set();
    function relocate(node, target, className) {
        if (!node || seen.has(node)) return;
        const item = wrapperFor(node);
        if (seen.has(item) || item.contains(toolbar)) return;
        seen.add(item); seen.add(node);
        const marker = document.createComment('care-mobile-control');
        item.before(marker);
        if (className === 'care-mobile-action') {
            const control=item.matches('details')?item.querySelector('summary'):item;
            const label=control && (control.getAttribute('aria-label')||control.title||'');
            if (label && !buttonLabel(control)) { const text=document.createElement('span');text.className='care-mobile-action-label';text.textContent=label;control.append(text); }
        }
        placements.push({item,marker,target,className});
    }
    // Move the search input itself; the shared search wrapper supplies its own icon.
    const searchMarker=document.createComment('care-mobile-search');
    search.before(searchMarker);
    placements.push({item:search,marker:searchMarker,target:searchBox,className:'care-mobile-search-input'});
    const primary = (config.filters || []).map(selector => view.querySelector(selector)).filter(Boolean);
    let contactFilter;
    if (view.id === 'view-contacts') {
        contactFilter=document.createElement('select');contactFilter.className='care-mobile-filter';contactFilter.setAttribute('aria-label','Contact category');
        const tabs=[...view.querySelectorAll('[data-contact-type]')];
        tabs.forEach(tab=>contactFilter.add(new Option(buttonLabel(tab),tab.dataset.contactType)));
        contactFilter.value=tabs.find(tab=>tab.getAttribute('aria-selected')==='true')?.dataset.contactType||'patients';
        contactFilter.addEventListener('change',()=>tabs.find(tab=>tab.dataset.contactType===contactFilter.value)?.click());
        tabs.forEach(tab=>tab.addEventListener('click',()=>{contactFilter.value=tab.dataset.contactType;}));
    }
    primary.forEach(node=>relocate(node,filterRow,'care-mobile-filter'));
    for (const selector of config.extra || []) relocate(view.querySelector(selector),popup,'care-mobile-extra');
    for (const selector of config.actions || []) relocate(view.querySelector(selector),popup,'care-mobile-action');
    const reset=addButton('Clear search');
    reset.className='care-mobile-action'; reset.prepend(document.createRange().createContextualFragment(iconSvg('close')));
    reset.addEventListener('click',()=>clear.click()); popup.append(reset);
    const close=()=>{
        if (native && popup.matches(':popover-open')) popup.hidePopover();
        popup.hidden=true; action.setAttribute('aria-expanded','false');
        if(openMobilePopup===close)openMobilePopup=undefined;
    };
    const open=()=>{
        if(!popup.hidden){close();return;}
        closeMobileListPopup();
        window.closeAppointmentActions?.();
        popup.hidden=false;
        if(native)popup.showPopover();
        const r=action.getBoundingClientRect(),vv=window.visualViewport;
        const l=vv?.offsetLeft||0,t=vv?.offsetTop||0,w=vv?.width||innerWidth,h=vv?.height||innerHeight;
        const footer=document.querySelector('#bottomnav-container .bottom-nav')?.getBoundingClientRect();
        const header=document.querySelector('.dashboard-header')?.getBoundingClientRect();
        const minTop=Math.max(t+8,header?.bottom||0)+4,maxBottom=Math.min(t+h-8,footer?.height?footer.top-8:t+h-8);
        const width=Math.min(300,w-24),height=Math.min(popup.scrollHeight,440,Math.max(100,maxBottom-minTop));
        Object.assign(popup.style,{width:width+'px',maxHeight:height+'px',left:Math.max(l+12,Math.min(r.right-width,l+w-width-12))+'px',top:Math.max(minTop,Math.min(r.bottom+6,maxBottom-height))+'px'});
        action.setAttribute('aria-expanded','true');openMobilePopup=close;
    };
    action.addEventListener('click',open);
    popup.addEventListener('toggle',()=>{if(native&&!popup.matches(':popover-open'))close();});
    popup.addEventListener('click',event=>{
        const button=event.target.closest('button');
        if(button && !button.closest('.patient-date-filter,.contacts-tabs'))close();
    });
    document.addEventListener('click',event=>{if(!toolbar.contains(event.target)&&!popup.hidden)close();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!popup.hidden){close();action.focus();}});
    document.addEventListener('scroll',event=>{if(!popup.hidden&&!popup.contains(event.target))close();},true);
    const oldSearchWrapper=wrapperFor(search);
    function update() {
        close();
        if(mobileListQuery.matches) {
            for(const {item,target,className} of placements){item.classList.add(className);target.append(item);}
            searchBox.append(clear);if(contactFilter)filterRow.append(contactFilter);filterRow.append(action);
            toolbar.hidden=false;
            if(container && container!==search && !container.contains(toolbar) && !container.querySelector('input,select,button,details'))container.classList.add('care-mobile-empty-origin');
            if(oldSearchWrapper!==search && !oldSearchWrapper.contains(toolbar) && !oldSearchWrapper.querySelector('input,select,button,details'))oldSearchWrapper.classList.add('care-mobile-empty-origin');
            filterRow.dataset.columns=String(primary.length+(contactFilter?1:0));
        } else {
            toolbar.hidden=true;
            contactFilter?.remove();
            for(const {item,marker,className} of placements){item.classList.remove(className);marker.after(item);}
            container?.classList.remove('care-mobile-empty-origin');
            oldSearchWrapper.classList.remove('care-mobile-empty-origin');
        }
    }
    mobileListQuery.addEventListener('change',update);
    window.visualViewport?.addEventListener('resize',close);
    update();
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
        if (controls.sort !== false) {
            sort = document.createElement('select');
            sort.setAttribute('aria-label', 'Sort records');
            sort.add(new Option('Default order', ''));
            sort.add(new Option('A to Z', 'asc'));
            sort.add(new Option('Z to A', 'desc'));
            toolbar.append(sort);
        }
        listEnd.before(toolbar);
    }

    if (table) markFlatReport(table);
    if (view.id === 'view-attendance') markFlatReport(view.querySelector('#leaveReqTable'));
    mountMobileListTools(view, listEnd);
    let page = 0;
    let frame;
    const refresh = () => {
        if (table) markFlatReport(table);
        const mobileAppointment = view.id === 'view-appointments' && matchMedia('(max-width:700px)').matches;
        const activeRoot = mobileAppointment ? view.querySelector('#appointmentMobileList') : root;
        const activeRowSelector = mobileAppointment ? '.apt-mobile-row' : rowSelector;
        const groups = [...activeRoot.querySelectorAll('.therapist-report-group,.apt-mobile-group')];
        let allRows = [...activeRoot.querySelectorAll(activeRowSelector)];
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
            filter.replaceChildren(new Option('All ' + (controls.filterLabel === 'Category' ? 'categories' : controls.filterLabel === 'Branch' ? 'branches' : controls.filterLabel.toLowerCase() + 's'), ''),
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
                ![...group.querySelectorAll(activeRowSelector)].some(row => shown.has(row)));
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
    const observer = new MutationObserver(schedule);
    const options = {childList:true,subtree:true,attributes:true,attributeFilter:['style','hidden']};
    observer.observe(root,options);
    if (view.id === 'view-appointments') {
        const mobileRoot=view.querySelector('#appointmentMobileList');
        if(mobileRoot)observer.observe(mobileRoot,options);
        matchMedia('(max-width:700px)').addEventListener('change',()=>{page=0;schedule();});
    }
    if (view.id === 'view-attendance') {
        const leave=view.querySelector('#leaveReqTable');
        if(leave)new MutationObserver(()=>markFlatReport(leave)).observe(leave,{childList:true,subtree:true});
    }
    refresh();
}
