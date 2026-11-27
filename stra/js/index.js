import { careProfileKey, resolveCareAccess } from './care-access.js';
import './corebiq-locale.js';
import { modulePageTitle, mountModuleCard, mountModuleList, closeMobileListPopup } from './module-page.mjs';
import { auth, db } from './firebase-config.js';
import { initializeDocumentIdCounters } from './document-ids.js';
import { APP_METADATA } from './app-metadata.js';
import {
    collection,
    getDocs,
    query,
    where,
    setDoc,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

/* -------------------------------------------------------
   GLOBAL STATE
------------------------------------------------------- */
window.currentUser = null;
window.allApts = [];
window.aptDatesSet = new Set();
window.apptChartInstance = null;

/* Local-date helper: avoids UTC date shifting in India/other timezones. */
window.getLocalDateString = function(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/* -------------------------------------------------------
   MODULE MAP
------------------------------------------------------- */
document.title = `${APP_METADATA.name} | Clinic Management Dashboard`;
window.cmAppFileMap = APP_METADATA.moduleRoutes;

/* -------------------------------------------------------
   ERROR BANNER
------------------------------------------------------- */
window.onerror = function(message, source, lineno) {
    const errDiv = document.getElementById('dash-error-banner');
    const errText = document.getElementById('dash-error-text');

    if (errDiv && errText) {
        errDiv.style.display = 'flex';
        errText.innerText = `Error at Line ${lineno || '?'}: ${message}`;
    }
    return false;
};

/* -------------------------------------------------------
   LOGOUT / AUTH GATE
------------------------------------------------------- */
window.handleLogout = async function() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out:", error);
        alert("Unable to sign out. Please try again.");
    }
};

window.deferredInstallPrompt = null;

window.isAppInstalled = function() {
    return window.matchMedia('(display-mode: standalone)').matches ||
        navigator.standalone === true;
};

window.updateInstallButton = function() {
    const button = document.getElementById('install-app-button');
    if (button) button.hidden = window.isAppInstalled();
};

window.installApp = async function() {
    if (window.isAppInstalled()) {
        window.updateInstallButton();
        return;
    }

    if (!window.deferredInstallPrompt) {
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        window.alert(isIOS
            ? 'To install Care, tap the Share button in Safari and choose "Add to Home Screen".'
            : 'To install Care, use your browser menu and choose "Install app" or "Add to Home screen".');
        return;
    }

    const installPrompt = window.deferredInstallPrompt;
    window.deferredInstallPrompt = null;
    window.updateInstallButton();

    try {
        await installPrompt.prompt();
        await installPrompt.userChoice;
    } catch (error) {
        console.error('Unable to open the app installation prompt:', error);
        window.alert('The install prompt could not be opened. Please try again from your browser menu.');
    } finally {
        window.updateInstallButton();
    }
};

window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    window.deferredInstallPrompt = event;
    window.updateInstallButton();
});

window.addEventListener('appinstalled', () => {
    window.deferredInstallPrompt = null;
    window.updateInstallButton();
});

window.matchMedia('(display-mode: standalone)').addEventListener?.('change', window.updateInstallButton);
window.updateInstallButton();

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.currentUser = null;
        window.updateHeaderProfile?.();
        window.location.replace('./login.html');
        return;
    }

    try {
        const access = await resolveCareAccess(user);
        if (auth.currentUser?.uid !== user.uid) return;
        if (access.status !== 'approved') {
            window.location.replace('./login.html');
            return;
        }
        const userData = access.profile;
        const identity = user.email?.toLowerCase() || user.phoneNumber || careProfileKey(user);
        window.currentUser = {
            email: identity,
            name: userData.name || userData.fullName || user.displayName || identity,
            role: userData.role || "user",
            branch: userData.branch || "Unknown",
            googlePhotoURL: user.providerData.find(provider => provider.providerId === 'google.com')?.photoURL || ''
        };
        window.updateHeaderProfile();
        window.applyRoleVisibility();

        const app = document.getElementById('app-container');
        if (app) app.style.visibility = 'visible';
        if (window.currentUser.role === 'admin') {
            try {
                await initializeDocumentIdCounters(db);
            } catch (error) {
                console.error('Unable to initialize sequential document IDs:', error);
                alert(`Sequential document IDs could not be initialized: ${error.message}\n\nDeploy the updated firebase/firestore.rules file, then reload and sign in as an administrator to initialize the counters.`);
            }
        }
        await window.switchView(window.currentUser.role === 'developer' ? 'view-developer' : 'view-dashboard');

        /* Sidebar is loaded separately; hide the Users item after it appears too. */
        window.applyRoleVisibility();
        window.finishCareStartup?.();

    } catch (error) {
        window.finishCareStartup?.();
        console.error(error);
        await (window.careNotice ?? window.alert)(error.message || "Unable to authenticate.", "warning");
        window.location.replace('./login.html');
    }
});

/* -------------------------------------------------------
   ROLE VISIBILITY
------------------------------------------------------- */
const developerViews = new Set(['view-developer', 'view-privacy', 'view-licenceinfo']);

window.applyRoleVisibility = function() {
    const restrictedSelectors = [
        '#nav-users-btn',
        '#nav-usage-btn',
        '[data-target="view-users"]',
        '[data-target="view-razorpay"]',
        '[onclick*="view-users"]',
        '[onclick*="usage.html"]'
    ];
    const role = window.currentUser?.role;
    const isAdmin = role === 'admin';
    const isDeveloper = role === 'developer';
    document.getElementById('app-container')?.classList.toggle('care-developer-role', isDeveloper);
    document.querySelectorAll('#sidebar-nav .nav-link, #top-module-nav .top-nav-link').forEach(link => {
        const target = link.dataset.target;
        if (isDeveloper || target === 'view-developer') {
            const allowed = isDeveloper ? developerViews.has(target) : isAdmin;
            link.style.display = allowed ? '' : 'none';
        }
    });
    restrictedSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            element.style.display = isAdmin ? '' : 'none';
        });
    });
    document.querySelectorAll('#sidebar-nav .sidebar-nav-group, #sidebar-nav .sidebar-nav-subgroup').forEach(group => {
        const hasAvailableModules = [...group.querySelectorAll('.nav-link')]
            .some(link => link.style.display !== 'none');
        group.hidden = !hasAvailableModules;
    });
    document.querySelectorAll('#top-module-nav .top-nav-group:not([data-category="Dashboard"])').forEach(group => {
        const hasAvailableModules = [...group.querySelectorAll('.top-nav-link')]
            .some(link => link.style.display !== 'none');
        group.hidden = !hasAvailableModules;
    });
    document.querySelectorAll('#top-module-nav .top-nav-submenu-group').forEach(group => {
        const hasAvailableModules = [...group.querySelectorAll('.top-nav-link')]
            .some(link => link.style.display !== 'none');
        group.hidden = !hasAvailableModules;
    });
};

function updateSidebarSelection(targetId) {
    document.querySelectorAll('#sidebar-nav .nav-link[data-target]').forEach(link => {
        const selected = link.dataset.target === targetId;
        link.classList.toggle('active', selected);
        if (selected) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
}

window.buildSidebarNavigation = function() {
    const nav = document.querySelector('#sidebar-container #sidebar-nav');
    if (!nav || nav.dataset.grouped === 'true') return;

    const categoryByTarget = {
        'view-contacts': 'CRM',
        'view-my-tasks': 'CRM',
        'view-patients': 'CRM',
        'view-appointments': 'CRM',
        'view-public-booking': 'CRM',
        'view-transaction': 'Accounts',
        'view-razorpay': 'Accounts',
        'view-cash-ledger': 'Accounts',
        'view-bank-ledger': 'Accounts',
        'view-ledgers': 'Accounts',
        'view-qr': 'Accounts',
        'view-therapist': 'HR',
        'view-staff': 'HR',
        'view-attendance': 'HR',
        'view-calc': 'Tools',
        'view-corebiq-ai': 'Tools',
        'view-invoice': 'Templates',
        'view-letterhead': 'Templates',
        'view-bank-card': 'Templates',
        'view-report': 'Templates',
        'view-backup': 'Export & Backup',
        'view-branches': 'Settings',
        'view-company': 'Settings',
        'view-users': 'Settings',
        'view-developer': 'Settings',
        'view-updates': 'App Info',
        'view-licenceinfo': 'App Info',
        'view-aboutapp': 'App Info',
        'view-privacy': 'App Info'
    };
    const icons = {
        CRM: 'groups',
        Accounts: 'account_balance_wallet',
        HR: 'badge',
        Templates: 'description',
        Tools: 'build',
        Settings: 'settings',
        'App Info': 'info',
        'Export & Backup': 'cloud_download'
    };
    const sourceLinks = [...nav.querySelectorAll('.nav-link')];
    const dashboard = sourceLinks.find(link => link.dataset.target === 'view-dashboard');
    const email = sourceLinks.find(link => link.dataset.target === 'view-email');
    const entries = new Map();
    if (dashboard) dashboard.dataset.iconCategory = '';
    if (email) email.dataset.iconCategory = '';

    sourceLinks.forEach(link => {
        if (link === dashboard || link === email) return;
        const category = categoryByTarget[link.dataset.target] ||
            (link.id === 'nav-usage-btn' ? 'Settings' : 'Export & Backup');
        link.dataset.iconCategory = ['CRM', 'Accounts', 'HR'].includes(category) ? category : '';
        if (!entries.has(category)) entries.set(category, []);
        entries.get(category).push(link);
    });

    const createGroup = (label, icon, links, groupClass, contentClass) => {
        const group = document.createElement('div');
        group.className = groupClass;
        group.dataset.category = label;

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = groupClass === 'sidebar-nav-group'
            ? 'sidebar-nav-trigger'
            : 'sidebar-nav-submenu-trigger';
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.onclick = () => window.toggleSidebarNavGroup(trigger);

        const iconElement = document.createElement('span');
        iconElement.className = 'material-symbols-rounded';
        iconElement.setAttribute('aria-hidden', 'true');
        iconElement.textContent = icon;

        const labelElement = document.createElement('span');
        labelElement.textContent = label;

        const chevron = document.createElement('span');
        chevron.className = `material-symbols-rounded ${groupClass === 'sidebar-nav-group' ? 'sidebar-nav-chevron' : 'sidebar-nav-submenu-chevron'}`;
        chevron.setAttribute('aria-hidden', 'true');
        chevron.textContent = 'expand_more';
        trigger.append(iconElement, labelElement, chevron);

        const content = document.createElement('div');
        content.className = contentClass;
        links.forEach(link => content.appendChild(link));
        group.append(trigger, content);
        return group;
    };

    const allOriginalLinks = sourceLinks;
    nav.replaceChildren();
    if (dashboard) nav.appendChild(dashboard);

    ['CRM', 'Accounts', 'HR', 'Templates', 'Tools', 'Settings', 'App Info', 'Export & Backup'].forEach(category => {
        const links = entries.get(category) || [];
        if (links.length) {
            nav.appendChild(createGroup(category, icons[category], links, 'sidebar-nav-group', 'sidebar-nav-content'));
        }
    });
    if (email) nav.appendChild(email);

    nav.dataset.grouped = 'true';
    updateSidebarSelection(document.querySelector('.view-section.active')?.id || 'view-dashboard');
    allOriginalLinks.forEach(link => {
        if (link !== dashboard && link !== email && !nav.contains(link)) {
            console.error('A sidebar module link was not assigned to a navigation group:', link);
        }
    });
};

window.buildTopNavigation = function() {
    const source = document.querySelector('#sidebar-container #sidebar-nav');
    const nav = document.getElementById('top-module-nav');
    if (!source || !nav) return;

    const categoryByTarget = {
        'view-contacts': 'CRM',
        'view-my-tasks': 'CRM',
        'view-patients': 'CRM',
        'view-appointments': 'CRM',
        'view-public-booking': 'CRM',
        'view-transaction': 'Accounts',
        'view-razorpay': 'Accounts',
        'view-cash-ledger': 'Accounts',
        'view-bank-ledger': 'Accounts',
        'view-ledgers': 'Accounts',
        'view-qr': 'Accounts',
        'view-therapist': 'HR',
        'view-staff': 'HR',
        'view-attendance': 'HR',
        'view-email': 'Email',
        'view-calc': 'Tools',
        'view-corebiq-ai': 'Tools',
        'view-invoice': 'Templates',
        'view-letterhead': 'Templates',
        'view-bank-card': 'Templates',
        'view-report': 'Templates',
        'view-branches': 'Settings',
        'view-company': 'Settings',
        'view-users': 'Settings',
        'view-developer': 'Settings',
        'view-updates': 'App Info',
        'view-licenceinfo': 'App Info',
        'view-aboutapp': 'App Info',
        'view-backup': 'Export & Backup',
        'view-privacy': 'App Info'
    };
    const menus = new Map([...nav.querySelectorAll('.top-nav-group[data-category]')]
        .map(group => [group.dataset.category, group]));
    menus.forEach(group => {
        const menu = group.querySelector('.top-nav-menu');
        menu?.querySelectorAll('.top-nav-link').forEach(link => link.remove());
    });

    source.querySelectorAll('.nav-link').forEach(sourceLink => {
        const target = sourceLink.dataset.target;
        const category = categoryByTarget[target] || (sourceLink.id === 'nav-usage-btn' ? 'Settings' : '');
        if (category === 'Email') return;
        const group = menus.get(category);
        const menu = group?.querySelector('.top-nav-menu');
        if (!menu) return;

        const link = sourceLink.cloneNode(true);
        link.removeAttribute('id');
        link.removeAttribute('title');
        link.removeAttribute('aria-label');
        link.className = 'top-nav-link';
        link.setAttribute('role', 'menuitem');
        menu.appendChild(link);
    });

    const appInfoMenu = menus.get('App Info')?.querySelector('.top-nav-menu');
    ['#notification-button', '#install-app-button', '.top-nav-support-actions'].forEach(selector => {
        const action = appInfoMenu?.querySelector(selector);
        if (action) appInfoMenu.appendChild(action);
    });

    window.applyRoleVisibility();
};

window.closeTopNavMenus = function() {
    document.querySelectorAll('#top-module-nav .top-nav-menu.open').forEach(menu => menu.classList.remove('open'));
    document.querySelectorAll('#top-module-nav .top-nav-trigger[aria-expanded="true"]').forEach(button => button.setAttribute('aria-expanded', 'false'));
    document.querySelectorAll('#top-module-nav .top-nav-submenu-menu.open').forEach(menu => menu.classList.remove('open'));
    document.querySelectorAll('#top-module-nav .top-nav-submenu-trigger[aria-expanded="true"]').forEach(button => button.setAttribute('aria-expanded', 'false'));
};

window.toggleSidebarNavGroup = function(trigger) {
    const group = trigger.closest('.sidebar-nav-group, .sidebar-nav-subgroup');
    if (!group) return;
    const shouldOpen = !group.classList.contains('open');
    const parent = group.parentElement;
    [...parent.children].forEach(sibling => {
        if (!sibling.matches('.sidebar-nav-group, .sidebar-nav-subgroup') || sibling === group) return;
        sibling.classList.remove('open');
        sibling.querySelector(':scope > .sidebar-nav-trigger, :scope > .sidebar-nav-submenu-trigger')
            ?.setAttribute('aria-expanded', 'false');
    });
    group.classList.toggle('open', shouldOpen);
    trigger.setAttribute('aria-expanded', String(shouldOpen));
};

window.toggleTopNavMenu = function(category, trigger) {
    const group = [...document.querySelectorAll('#top-module-nav .top-nav-group[data-category]')]
        .find(item => item.dataset.category === category);
    const menu = group?.querySelector('.top-nav-menu');
    if (!menu) return;
    const shouldOpen = !menu.classList.contains('open');
    window.closeTopNavMenus();
    if (shouldOpen) {
        menu.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        const triggerRect = trigger.getBoundingClientRect();
        const menuWidth = menu.getBoundingClientRect().width;
        const left = Math.max(8, Math.min(triggerRect.left, window.innerWidth - menuWidth - 8));
        menu.style.left = `${left}px`;
        menu.style.top = `${triggerRect.bottom + 6}px`;
    }
};

window.toggleTopNavSubmenu = function(trigger) {
    const submenu = trigger.parentElement?.querySelector('.top-nav-submenu-menu');
    if (!submenu) return;
    const shouldOpen = !submenu.classList.contains('open');
    const parentMenu = trigger.closest('.top-nav-menu');
    parentMenu?.querySelectorAll('.top-nav-submenu-menu.open').forEach(menu => {
        menu.classList.remove('open');
        menu.previousElementSibling?.setAttribute('aria-expanded', 'false');
    });
    submenu.classList.toggle('open', shouldOpen);
    trigger.setAttribute('aria-expanded', String(shouldOpen));
};

document.addEventListener('click', event => {
    if (!(event.target instanceof Element) ||
        !event.target.closest('#top-module-nav') ||
        event.target.closest('.top-nav-link')) {
        window.closeTopNavMenus();
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') window.closeTopNavMenus();
});
window.addEventListener('resize', window.closeTopNavMenus);

window.updateSidebarCollapseControl = function() {
    const sidebar = document.getElementById('sidebar-container');
    const button = document.getElementById('sidebar-toggle-button');
    if (!sidebar || !button) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const isExpanded = isMobile
        ? sidebar.classList.contains('open')
        : !sidebar.classList.contains('is-collapsed');
    const icon = button.querySelector('.material-symbols-rounded');
    button.setAttribute('aria-expanded', String(isExpanded));
    const actionLabel = isMobile
        ? (isExpanded ? 'Close navigation' : 'Open navigation')
        : (isExpanded ? 'Collapse navigation' : 'Expand navigation');
    button.setAttribute('aria-label', actionLabel);
    button.title = actionLabel;
    if (icon) {
        icon.textContent = isMobile
            ? (isExpanded ? 'menu_open' : 'menu')
            : (isExpanded ? 'left_panel_close' : 'left_panel_open');
    }

    sidebar.querySelectorAll('.nav-link[data-target]').forEach(link => {
        const label = link.cloneNode(true);
        label.querySelectorAll('.material-symbols-rounded').forEach(item => item.remove());
        const text = label.textContent.trim().replace(/\s+/g, ' ');
        link.setAttribute('aria-label', text);
        if (!isMobile && sidebar.classList.contains('is-collapsed')) {
            link.title = text;
        } else {
            link.removeAttribute('title');
        }
    });
};

window.toggleSidebarCollapse = function() {
    const sidebar = document.getElementById('sidebar-container');
    if (!sidebar) return;

    if (window.matchMedia('(max-width: 768px)').matches) {
        sidebar.classList.toggle('open');
    } else {
        sidebar.classList.toggle('is-collapsed');
    }
    window.updateSidebarCollapseControl();
};

/* -------------------------------------------------------
   MENU
------------------------------------------------------- */
window.toggleMobileNavigationMenu = function(forceOpen) {
    const sidebar = document.getElementById('sidebar-container');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    const menuButtons = document.querySelectorAll('.bottom-nav-menu-button');
    if (!sidebar) return;

    if (!window.matchMedia('(max-width: 768px)').matches) {
        sidebar.classList.toggle('is-collapsed');
        window.updateSidebarCollapseControl();
        return;
    }

    const isOpen = typeof forceOpen === 'boolean'
        ? forceOpen
        : !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', isOpen);
    backdrop?.classList.toggle('visible', isOpen);
    menuButtons.forEach(button => {
        button.setAttribute('aria-expanded', String(isOpen));
        button.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
        const icon = button.querySelector('.material-symbols-rounded');
        if (icon instanceof SVGElement) {
            icon.innerHTML = isOpen
                ? '<path d="m18 6-12 12M6 6l12 12"/>'
                : '<path d="M4 6h16M4 12h16M4 18h16"/>';
        } else if (icon) {
            icon.textContent = isOpen ? 'close' : 'menu';
        }
    });
};
window.toggleSidebar = window.toggleMobileNavigationMenu;

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.getElementById('sidebar-container')?.classList.contains('open')) {
        window.toggleMobileNavigationMenu(false);
        document.querySelector('.bottom-nav-menu-button')?.focus();
    }
});

/* -------------------------------------------------------
   DATE FORMATTERS
   Internal values remain YYYY-MM-DD.
   Display values are DD-MM-YYYY.
------------------------------------------------------- */
window.formatIndianDate = function(dateStr) {
    if (!dateStr) return '';

    if (dateStr instanceof Date) {
        const d = dateStr;
        return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
    }

    if (typeof dateStr?.toDate === 'function') return window.formatIndianDate(dateStr.toDate());
    const value = String(dateStr).trim();

    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
    }

    const slashMatch = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (slashMatch) {
        return `${slashMatch[1].padStart(2,'0')}-${slashMatch[2].padStart(2,'0')}-${slashMatch[3]}`;
    }

    const monthMatch = value.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s,-]+(\d{4})$/);
    if (monthMatch) {
        const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
        const month = months.indexOf(monthMatch[2].slice(0,3).toLowerCase());
        if (month >= 0) return monthMatch[1].padStart(2,'0') + '-' + String(month+1).padStart(2,'0') + '-' + monthMatch[3];
    }
    return value;
};

/* -------------------------------------------------------
   COMPONENT LOADER
   Cache-busted so changed header/sidebar/bottomnav files
   are not trapped behind browser/CDN cache.
------------------------------------------------------- */
window.fetchFresh = async function(filename) {
    const separator = filename.includes('?') ? '&' : '?';
    const url = `${filename}${separator}v=${Date.now()}`;

    return fetch(url, {
        cache: 'no-store',
        signal: globalThis.AbortSignal?.timeout?.(12000),
        headers: {
            'Cache-Control': 'no-cache'
        }
    });
};

window.applyLucideIcons = function(root = document) {
    const icons = {
        dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
        contact_page: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M6 16c.8-1.6 1.8-2.4 3-2.4s2.2.8 3 2.4M15 9h3M15 13h3"/>',
        contacts: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1zM16 5.2a3 3 0 0 1 0 5.6M18 14a5 5 0 0 1 3 4.6V20"/>',
        task_alt: '<path d="m3 7 2 2 4-4M13 7h8M3 17l2 2 4-4M13 17h8"/>',
        groups: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
        event_note: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h3M8 18h7"/>',
        calendar_month: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01"/>',
        calendar_today: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
        event_available: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m2 3-4 4-2-2"/>',
        event_busy: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m5 3 4 4m0-4-4 4"/>',
        language: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
        receipt_long: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1zM8 8h8M8 12h8M8 16h5"/>',
        payments: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="12" cy="14" r="2"/><path d="M7 15h.01M17 13h.01"/>',
        account_balance_wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M16 14h2"/><path d="M7 5V3h11"/>',
        account_balance: '<path d="m3 10 9-7 9 7M4 10h16M6 10v9M10 10v9M14 10v9M18 10v9M3 21h18"/>',
        account_tree: '<rect x="3" y="3" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><path d="M6 8v4h12v4M6 12v4"/>',
        qr_code_scanner: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="4" height="4" rx=".5"/><path d="M17 7h-2v4h4M7 17h4v-2M15 15h2v2h-2zM19 19h.01"/>',
        medical_services: '<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 7h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/><path d="M12 11v6M9 14h6"/>',
        badge: '<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="10" r="2.5"/><path d="M7.5 17a5 5 0 0 1 9 0"/>',
        how_to_reg: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
        calculate: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8v4H8zM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',
        mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
        description: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
        cloud_download: '<path d="M20 16.2A4.5 4.5 0 0 0 18 7.5 6 6 0 0 0 6 9a4 4 0 0 0 0 8h2"/><path d="M12 12v9m-4-4 4 4 4-4"/>',
        monitoring: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-5 5"/>',
        apartment: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 21V9h6v12M7 7h.01M11 7h.01M15 7h.01M7 11h.01M17 11h.01M17 15h.01"/>',
        domain: '<path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>',
        manage_accounts: '<circle cx="10" cy="8" r="4"/><path d="M3 21v-2a7 7 0 0 1 11-5.7M19 16v6M16 19h6"/><path d="M17.5 11.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>',
        campaign: '<path d="m3 11 18-5v12L3 13v-2zM11.6 15.8 13 21l4-1-2-5.5M5 14v4a2 2 0 0 0 2 2h2"/>',
        workspace_premium: '<path d="m12 15 3.5 2 1-4 3-2.5-3-2.5-1-4-3.5 2-3.5-2-1 4-3 2.5 3 2.5 1 4z"/><path d="m8 16-1 6 5-2 5 2-1-6"/>',
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 11v5M12 8h.01"/>',
        schedule: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
        auto_awesome: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3zM19 14l1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14z"/>',
        grid_view: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/>',
        open_in_new: '<path d="M14 3h7v7M10 14 21 3"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/>',
        south_west: '<path d="M7 7 17 17M17 7v10H7"/>',
        north_east: '<path d="M7 17 17 7M7 7h10v10"/>',
        today: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h3"/>',
        arrow_forward: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
        error: '<circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/>',
        checklist: '<path d="m3 6 2 2 3-3M11 7h10M3 13l2 2 3-3m3 1h10M3 20l2 2 3-3m3 1h10"/>',
        menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
        privacy_tip: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="m9 12 2 2 4-4"/>',
        business: '<path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>',
        build: '<path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 13l-3-3z"/>',
        settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.8z" transform="translate(-1 -1) scale(.92)"/>',
        more_horiz: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
        more_vert: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
        search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
        person: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        event: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
        wc: '<circle cx="8" cy="5" r="2"/><path d="M8 8v5M4 12l4-4 4 4M6 21l2-8 2 8"/><circle cx="17" cy="5" r="2"/><path d="m17 8-4 8h8l-4-8M15 16v5M19 16v5"/>',
        location_on: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
        call: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.09 5.18 2 2 0 0 1 5.08 3h3a2 2 0 0 1 2 1.72l.54 3.27a2 2 0 0 1-.57 2.11l-1.27 1.27a16 16 0 0 0 5.85 5.85l1.27-1.27a2 2 0 0 1 2.11-.57l3.27.54A2 2 0 0 1 22 16.92z"/>',
        currency_rupee: '<path d="M6 3h12M6 8h12M6 13l8 8M6 13h3a5 5 0 0 0 0-10"/>',
        edit: '<path d="m16 3 5 5M4 20l4-1 13-13-4-4L4 15z"/>',
        visibility: '<path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8-10-8-10-8Z"/><circle cx="12" cy="12" r="3"/>',
        sort: '<path d="M3 6h18M3 12h12M3 18h6"/>',
        tune: '<path d="M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M10 16v4"/>',
        content_copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
        delete: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
        upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4"/>',
        download: '<path d="M12 4v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
        file_download: '<path d="M12 4v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
        deselect: '<path d="M3 3l18 18M4 8v-4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/>',
        picture_as_pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8"/>',
        print: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 15h12v6H6zM18 12h.01"/>',
        expand_more: '<path d="m6 9 6 6 6-6"/>',
        close: '<path d="m18 6-12 12M6 6l12 12"/>',
        apps: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>'
    };
    const moduleHeaderSelector = [
        '.patients-title-icon',
        '.contacts-title-icon',
        '.task-title-icon',
        '.company-page-icon .material-symbols-rounded',
        '.ledger-title-icon .material-symbols-rounded',
        '.page-title-icon .material-symbols-rounded',
        '.title-icon .material-symbols-rounded',
        '.hero-icon .material-symbols-rounded',
        '.bank-card-title .material-symbols-rounded'
    ].map(selector => `.module-container ${selector}`).join(',');
    const selector = [
        '#sidebar-container .nav-link > .material-symbols-rounded:first-child',
        '#sidebar-container .sidebar-nav-trigger > .material-symbols-rounded:first-child',
        '#sidebar-container .sidebar-nav-submenu-trigger > .material-symbols-rounded:first-child',
        '#top-module-nav .top-nav-category-icon',
        '#top-module-nav .top-nav-link > .material-symbols-rounded:first-child',
        '#top-module-nav .top-nav-submenu-trigger > .material-symbols-rounded:first-child',
        '#bottomnav-container .bottom-nav-icon.material-symbols-rounded',
        '#appointment-module .appointment-toolbar .material-symbols-rounded',
        '#appointment-module .appointment-mobile-list .material-symbols-rounded',
        '#appointment-module .therapist-report-header .material-symbols-rounded',
        moduleHeaderSelector
    ].join(',');
    const targets = [];
    if (root instanceof Element && root.matches(selector)) targets.push(root);
    targets.push(...root.querySelectorAll(selector));
    targets.forEach(icon => {
        const color = icon.classList.contains('bottom-nav-icon') ? 'inherit' : 'var(--care-icon)';
        icon.style.setProperty('color', color, 'important');
        if (!(icon instanceof SVGElement)) {
            icon.style.setProperty('font-variation-settings', '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24', 'important');
        }
        if (icon instanceof SVGElement || icon.dataset.lucideIcon === 'true') return;
        const paths = icons[icon.textContent.trim()];
        if (!paths) return;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '1em');
        svg.setAttribute('height', '1em');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '1.8');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');
        svg.dataset.lucideIcon = 'true';
        svg.setAttribute('class', icon.getAttribute('class') || '');
        if (icon.id) svg.id = icon.id;
        if (icon.hidden) svg.setAttribute('hidden', '');
        svg.style.setProperty('color', color, 'important');
        svg.innerHTML = paths;
        icon.replaceWith(svg);
    });
};

window.moduleHtmlCache = new Map();
window.getModuleHtml = function(filename) {
    if (!window.moduleHtmlCache.has(filename)) {
        const request = window.fetchFresh(filename)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`File fetch failed: HTTP ${response.status}`);
                }
                return response.text();
            })
            .catch(error => {
                window.moduleHtmlCache.delete(filename);
                throw error;
            });
        window.moduleHtmlCache.set(filename, request);
    }
    return window.moduleHtmlCache.get(filename);
};

window.prefetchModule = function(targetId) {
    const filename = window.cmAppFileMap[targetId];
    if (filename && !window.moduleHtmlCache.has(filename)) {
        window.getModuleHtml(filename).catch(error => {
            console.error(`Error preloading ${filename}:`, error);
        });
    }
};

document.addEventListener('pointerover', event => {
    const link = event.target.closest('#top-module-nav [data-target^="view-"]');
    if (link) window.prefetchModule(link.dataset.target);
});
document.addEventListener('focusin', event => {
    const link = event.target.closest('#top-module-nav [data-target^="view-"]');
    if (link) window.prefetchModule(link.dataset.target);
});

window.loadComponent = async function(elementId, filename) {
    try {
        const response = await window.fetchFresh(filename);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const element = document.getElementById(elementId);
        if (!element) return;

        element.innerHTML = await response.text();
        window.applyRoleVisibility();

        if (filename === 'components/header.html') {
            window.buildTopNavigation();
            window.applyLucideIcons(document);
            window.updateGlobalClock?.();
            window.updateHeaderProfile();
            window.updateSidebarCollapseControl();
            window.updateNotificationBell();
            window.updateInstallButton();
        }

        if (filename === 'components/bottomnav.html') {
            window.applyLucideIcons(document);
        }

        if (filename === 'components/sidebar.html') {
            window.buildSidebarNavigation();
            window.buildTopNavigation();
            window.applyLucideIcons(document);
            window.updateSidebarCollapseControl();
        }
    } catch (error) {
        console.error(`Error loading ${filename}:`, error);
    }
};

window.COREBIQ_APP_VERSION = 'v1.2';
window.COREBIQ_UPDATES_READ_KEY = 'corebiq-updates-viewed-version';
window.updateNotificationBell = function() {
 const button=document.getElementById('notification-button'), badge=document.getElementById('notif-badge');
 if(!button||!badge)return;
 const count=Number(window.careActivityCount)||0;
 badge.textContent=String(count);badge.hidden=!count;
 button.classList.toggle('has-unread',count>0);
 button.setAttribute('aria-label',count+' daily activity records');button.title='Daily activity';
};
window.openAppUpdates = async function(){
 if(window.currentUser?.role==='developer')return window.switchView('view-developer',null);
 await window.switchView('view-dashboard',null);
 document.getElementById('dashboardActivityList')?.scrollIntoView({behavior:'smooth',block:'center'});
};
window.addEventListener('storage', event => {
    if (event.key === window.COREBIQ_UPDATES_READ_KEY) {
        window.updateNotificationBell();
    }
});

window.updateHeaderProfile = function() {
    const user = window.currentUser;
    const button = document.getElementById('profile-button');
    const fallback = document.getElementById('profile-avatar-fallback');
    if (button && fallback) {
        const previous = button.querySelector('.profile-avatar');
        let photoURL = '';
        try {
            const url = new URL(user?.googlePhotoURL || '');
            if (url.protocol === 'https:') photoURL = url.href;
        } catch { /* No usable Google profile photo. */ }
        if (!photoURL || previous?.src !== photoURL) {
            previous?.remove();
            fallback.removeAttribute('hidden');
            if (photoURL) {
                const photo = document.createElement('img');
                photo.className = 'profile-avatar';
                photo.alt = '';
                photo.hidden = true;
                photo.referrerPolicy = 'no-referrer';
                photo.addEventListener('load', () => {
                    if (!photo.isConnected) return;
                    photo.hidden = false;
                    fallback.setAttribute('hidden', '');
                }, { once: true });
                photo.addEventListener('error', () => {
                    if (!photo.isConnected) return;
                    photo.remove();
                    fallback.removeAttribute('hidden');
                }, { once: true });
                button.append(photo);
                photo.src = photoURL;
            }
        }
    }
    if (!user) return;

    const values = {
        'profile-name': user.name || user.email,
        'profile-email': user.email,
        'profile-role': user.role,
        'profile-branch': user.branch
    };

    Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value || '—';
    });
};

window.toggleProfileMenu = function(forceOpen) {
    const menu = document.getElementById('profile-menu');
    const button = document.getElementById('profile-button');
    if (!menu || !button) return;

    const shouldOpen = typeof forceOpen === 'boolean'
        ? forceOpen
        : !menu.classList.contains('open');
    menu.classList.toggle('open', shouldOpen);
    button.setAttribute('aria-expanded', String(shouldOpen));
};

window.searchModules = function(query) {
    const results = document.getElementById('module-search-results');
    const input = document.getElementById('module-search-input');
    if (!results || !input) return;

    const normalizedQuery = query.trim().toLocaleLowerCase();
    results.replaceChildren();

    if (!normalizedQuery) {
        results.classList.remove('open');
        input.setAttribute('aria-expanded', 'false');
        return;
    }

    const links = Array.from(
        document.querySelectorAll('#top-module-nav [data-target^="view-"]')
    ).filter(link => link.style.display !== 'none' && !link.closest('.top-nav-group')?.hidden);
    const matches = links.map(link => {
        const labelElement = link.cloneNode(true);
        labelElement.querySelectorAll('.material-symbols-rounded').forEach(icon => icon.remove());

        return {
            id: link.getAttribute('data-target'),
            label: labelElement.textContent.trim().replace(/\s+/g, ' '),
            icon: link.querySelector('.material-symbols-rounded')?.textContent.trim() || 'apps'
        };
    }).filter(item => item.id && item.label.toLocaleLowerCase().includes(normalizedQuery));

    if (!matches.length) {
        const empty = document.createElement('div');
        empty.className = 'module-search-empty';
        empty.textContent = 'No matching modules found.';
        results.appendChild(empty);
    } else {
        matches.forEach(item => {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'module-search-result';
            option.setAttribute('role', 'option');

            const icon = document.createElement('span');
            icon.className = 'material-symbols-rounded';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = item.icon;

            const label = document.createElement('span');
            label.textContent = item.label;

            option.append(icon, label);
            option.addEventListener('click', () => window.openModuleFromSearch(item.id));
            results.appendChild(option);
        });
    }

    results.classList.add('open');
    input.setAttribute('aria-expanded', 'true');
};

window.toggleModuleSearch = function(forceOpen) {
    const container = document.querySelector('.module-search');
    const button = document.getElementById('module-search-toggle');
    const input = document.getElementById('module-search-input');
    if (!container || !button || !input) return;

    const shouldOpen = typeof forceOpen === 'boolean'
        ? forceOpen
        : !container.classList.contains('open');
    container.classList.toggle('open', shouldOpen);
    button.setAttribute('aria-expanded', String(shouldOpen));

    if (shouldOpen) {
        input.focus();
    } else {
        input.value = '';
        window.searchModules('');
        input.blur();
    }
};

window.clearModuleSearch = function() {
    const input = document.getElementById('module-search-input');
    if (!input) return;

    input.value = '';
    window.searchModules('');
    input.focus();
};

window.openModuleFromSearch = function(targetId) {
    const navElement = document.querySelector(
        `#top-module-nav [data-target="${targetId}"]`
    );

    if (navElement && (navElement.style.display === 'none' || navElement.closest('.top-nav-group')?.hidden)) return;

    window.switchView(targetId, navElement || null);
    window.toggleModuleSearch(false);
};

window.handleModuleSearchKeydown = function(event) {
    if (event.key === 'Escape') {
        window.toggleModuleSearch(false);
        return;
    }

    if (event.key === 'Enter') {
        event.preventDefault();
        const firstResult = document.querySelector(
            '#module-search-results .module-search-result'
        );
        firstResult?.click();
    }
};

/* -------------------------------------------------------
   CALCULATOR POPUP
------------------------------------------------------- */
window.toggleCalculator = function() {
    const popup = document.getElementById('calc-popup-container');
    if (!popup) return;

    if (popup.style.display === 'flex') {
        popup.style.display = 'none';
        document.querySelector('[data-nav-action="calculator"]')?.setAttribute('aria-pressed', 'false');
        return;
    }

    popup.style.display = 'flex';
    document.querySelector('[data-nav-action="calculator"]')?.setAttribute('aria-pressed', 'true');

    const contentDiv = document.getElementById('calc-popup-content');

    if (contentDiv && contentDiv.innerHTML.trim() === '') {
        contentDiv.innerHTML =
            '<iframe src="modules/tools/calc/calc.html?v=' + Date.now() +
            '" style="width:100%;height:100%;border:none;background:transparent"></iframe>';
    }
};

window.toggleSupportMenu = function(event) {
    event?.stopPropagation();
    const button = document.getElementById('support-button');
    const menu = document.getElementById('support-menu');
    if (!button || !menu) return;
    const isOpen = menu.classList.toggle('open');
    button.setAttribute('aria-expanded', String(isOpen));
};

window.openDashboardPendingDues = async function() {
    window.dashboardPendingDuesRequested = true;
    await window.switchView(
        'view-appointments',
        document.querySelector('#top-module-nav [data-target="view-appointments"]')
    );
    if (
        window.dashboardPendingDuesRequested &&
        typeof window.showPendingDues === 'function'
    ) {
        window.dashboardPendingDuesRequested = false;
        window.showPendingDues();
    }
};

function dragElement(elmnt) {
    if (!elmnt) return;

    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = document.getElementById(elmnt.id + "-header");

    if (!header) return;

    header.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if (window.innerWidth <= 768) return;

        e = e || window.event;
        e.preventDefault();

        pos3 = e.clientX;
        pos4 = e.clientY;

        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();

        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;

        pos3 = e.clientX;
        pos4 = e.clientY;

        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        elmnt.style.bottom = "auto";
        elmnt.style.right = "auto";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

/* -------------------------------------------------------
   DYNAMIC MODULE LOADER
   Loads module HTML on demand and reuses its in-memory fetch cache.
   Keeps relative imports working from /development/.
------------------------------------------------------- */
document.addEventListener('click', event => {
    if (!event.target.closest('.care-hero-add')) {
        document.querySelector('.care-hero-add[open]')?.removeAttribute('open');
    }
});
document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const menu = document.querySelector('.care-hero-add[open]');
    if (!menu) return;
    menu.removeAttribute('open');
    menu.querySelector('summary')?.focus();
});

const careQuickActions = {
    appointment: ['view-appointments', 'openAppointmentForm'],
    transaction: ['view-transaction', 'openTxnForm'],
    attendance: ['view-attendance', 'openAttModal']
};

window.openCareQuickAction = async function(action, button) {
    const [viewId, form] = careQuickActions[action] || [];
    if (!viewId || button.disabled) return;
    button.disabled = true;
    button.closest('details')?.removeAttribute('open');
    try {
        await window.switchView(viewId);
        const view = document.getElementById(viewId);
        if (view?.dataset.loaded === 'true' && view.classList.contains('active')) window[form]?.();
    } finally {
        button.disabled = false;
    }
};

// Mobile/PWA browser back follows app navigation rather than leaving abruptly.
// A duplicate home state is the exit guard. Web browsers may not permit closing
// a tab programmatically; confirmed exit therefore returns to browser history.
let careHistoryInitialized = false;
let careRestoringHistory = false;
let careExiting = false;
let careExitPrompt = false;
function careHomeView() { return window.currentUser?.role === 'developer' ? 'view-developer' : 'view-dashboard'; }
function ensureCareHistory() {
    if (careHistoryInitialized || typeof history.pushState !== 'function') return;
    careHistoryInitialized = true;
    const home = careHomeView();
    if (history.state?.corebiqGuard && history.state.corebiqCareView === home) return;
    history.replaceState({ ...(history.state || {}), corebiqCareView: home, corebiqCareRoot: true }, '', location.href);
    history.pushState({ corebiqCareView: home, corebiqGuard: true }, '', location.href);
}
window.addEventListener('popstate', async event => {
    closeMobileListPopup();
    window.closeAppointmentActions?.();
    if (!careHistoryInitialized || !window.currentUser || careExiting) return;
    const home = careHomeView();
    const target = event.state?.corebiqCareView || home;
    if (event.state?.corebiqCareRoot || !event.state?.corebiqCareView) {
        history.pushState({ corebiqCareView: home, corebiqGuard: true }, '', location.href);
        if (careExitPrompt) return;
        careRestoringHistory = true;
        try {
            if (document.querySelector('.view-section.active')?.id !== home) await window.switchView(home);
        } finally { careRestoringHistory = false; }
        careExitPrompt = true;
        try {
            const confirmed = await (window.careConfirm
                ? window.careConfirm('Do you want to exit COREBIQ Care?', { title: 'Exit application?', action: 'Exit' })
                : Promise.resolve(window.confirm('Do you want to exit COREBIQ Care?')));
            if (confirmed && history.length > 2) {
                careExiting = true;
                history.go(-2);
            }
        } finally { careExitPrompt = false; }
        return;
    }
    if (careExitPrompt) return;
    careRestoringHistory = true;
    try {
        await window.switchView(document.getElementById(target) ? target : home);
    } finally { careRestoringHistory = false; }
});

window.switchView = async function(targetId, navElement) {
    closeMobileListPopup();
    window.closeAppointmentActions?.();
    window.closeTopNavMenus();
    const role = window.currentUser?.role;
    if (role === 'developer' && !developerViews.has(targetId)) {
        targetId = 'view-developer';
        navElement = null;
    }
    if (targetId === 'view-developer' && role !== 'developer' && role !== 'admin') return;
    if (targetId === 'view-razorpay' && role !== 'admin') return;


    if (targetId === 'view-calc') {
        window.toggleCalculator();
        return;
    }
    const previouslyActiveView = document.querySelector('.view-section.active')?.id;
    if (window.currentUser) {
        ensureCareHistory();
        if (!careRestoringHistory && previouslyActiveView && previouslyActiveView !== targetId && history.state?.corebiqCareView !== targetId) {
            history.pushState({ corebiqCareView: targetId }, '', location.href);
        }
    }


    document
        .querySelectorAll('.nav-link, .top-nav-link, .nav-item, .bottom-nav-item')
        .forEach(el => {
            el.classList.remove('active');
        });

    if (
        navElement &&
        !navElement.classList.contains('close-menu-btn')
    ) {
        navElement.classList.add('active');
    }
    updateSidebarSelection(targetId);
    document.querySelectorAll('#top-module-nav [data-target]').forEach(link => {
        if (link.dataset.target === targetId) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
    const activeTopModule = document.querySelector(`#top-module-nav [data-target="${targetId}"]`);
    document.querySelectorAll('#top-module-nav .top-nav-trigger').forEach(button => button.classList.remove('active'));
    const activeGroup = navElement?.closest('.top-nav-group');
    const activeCategoryTrigger = activeGroup?.querySelector('.top-nav-trigger[aria-haspopup="true"]');
    if (activeCategoryTrigger) activeCategoryTrigger.classList.add('active');
    if (activeTopModule?.closest('.top-nav-group')?.dataset.category === 'Email') {
        activeTopModule.classList.add('active');
    }
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        const target = item.getAttribute('onclick')?.match(/switchView\('([^']+)'/)?.[1];
        const isActive = target === targetId;
        item.classList.toggle('active', isActive);
        if (isActive) {
            item.setAttribute('aria-current', 'page');
        } else {
            item.removeAttribute('aria-current');
        }
    });
    window.applyLucideIcons(document.getElementById('bottomnav-container'));

    document
        .querySelectorAll('.view-section')
        .forEach(el => el.classList.remove('active'));

    const targetDiv = document.getElementById(targetId);
    if (!targetDiv) return;
    const mainContent = document.getElementById('main-content');
    mainContent?.classList.toggle('dashboard-main-active', targetId === 'view-dashboard');
    mainContent?.classList.toggle('patient-main-active', targetId === 'view-patients');

    if (
        window.innerWidth <= 768 &&
        document.getElementById('sidebar-container')?.classList.contains('open')
    ) {
        window.toggleMobileNavigationMenu();
    }

    if (targetId === 'view-invoice') {
        targetDiv.classList.add('active');
        mountModuleCard(targetDiv, modulePageTitle(targetId), () => window.switchView('view-dashboard'));
        window.dispatchInvoicePayload();
        return;
    }

    if (targetDiv.querySelector('iframe')) {
        targetDiv.classList.add('active');
        mountModuleCard(targetDiv, modulePageTitle(targetId), () => window.switchView('view-dashboard'));
        return;
    }

    const filename = window.cmAppFileMap[targetId];

    if (!filename) {
        targetDiv.innerHTML =
            '<div style="padding:40px;text-align:center;color:var(--danger)">Module mapping not found.</div>';
        targetDiv.classList.add('active');
        return;
    }

    /* First load: fetch the module. */
    if (
        targetDiv.dataset.loaded !== 'true' &&
        targetDiv.dataset.loading !== 'true'
    ) {

        const loader = window.createCareLoader?.('Loading ' + modulePageTitle(targetId));
        targetDiv.replaceChildren(...(loader ? [loader] : []));

        targetDiv.classList.add('active');
        targetDiv.dataset.loading = 'true';

        try {
            const htmlText = await window.getModuleHtml(filename);

            if (!targetDiv.classList.contains('active')) {
                delete targetDiv.dataset.loading;
                return;
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const moduleUrl = new URL(filename, document.baseURI);
            doc.querySelectorAll('[src], [href], [poster], [action]').forEach(element => {
                ['src', 'href', 'poster', 'action'].forEach(attribute => {
                    const value = element.getAttribute(attribute);
                    if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return;
                    element.setAttribute(attribute, new URL(value, moduleUrl).href);
                });
            });

            const moduleContent =
                doc.querySelector('.module-container') || doc.body;

            targetDiv.innerHTML = '';
            // The shell already loads the shared CSS and fonts. Only mount the
            // stylesheets explicitly marked as belonging to this module.
            const moduleStyles = new Set();
            doc.querySelectorAll('link[rel~="stylesheet"]').forEach(stylesheet => {
                const href = stylesheet.getAttribute('href');
                if (href && stylesheet.hasAttribute('data-module-style') && !moduleStyles.has(href)) {
                    moduleStyles.add(href);
                    targetDiv.appendChild(stylesheet);
                } else {
                    stylesheet.remove();
                }
            });

            /* Move children instead of accidentally losing body content. */
            if (moduleContent === doc.body) {
                Array.from(moduleContent.childNodes).forEach(node => {
                    targetDiv.appendChild(node);
                });
            } else {
                targetDiv.appendChild(moduleContent);
            }
            window.applyLucideIcons(targetDiv);

            /* Preserve module-specific styles declared in the fetched page head. */
            doc.head.querySelectorAll('style').forEach(style => {
                targetDiv.prepend(style.cloneNode(true));
            });

            const moduleRoot = targetDiv.querySelector('.module-container');
            const isInteractiveDataModule = /\/modules\/(?:accounts|crm|hr|settings)\//i.test(moduleUrl.pathname);
            const formViewRoot = moduleRoot || targetDiv;
            if (isInteractiveDataModule && formViewRoot.querySelector('form, table, .form-card, input:not([type="hidden"]), select, textarea')) {
                formViewRoot.classList.add('form-view');
            }

            /* Re-create scripts so dynamically inserted modules execute. */
            for (const oldScript of targetDiv.querySelectorAll('script')) {
                if (oldScript.type === 'module' && oldScript.src) {
                    await import(oldScript.src);
                    oldScript.remove();
                    continue;
                }

                const newScript = document.createElement('script');

                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                if (newScript.src && newScript.type !== 'module') {
                    newScript.async = false;
                }

                newScript.appendChild(
                    document.createTextNode(oldScript.innerHTML)
                );

                oldScript.parentNode.replaceChild(newScript, oldScript);
            }

            mountModuleCard(targetDiv, modulePageTitle(targetId), () => window.switchView('view-dashboard'));
            mountModuleList(targetDiv);
            targetDiv.dataset.loaded = 'true';
            delete targetDiv.dataset.loading;

        } catch (error) {

            delete targetDiv.dataset.loading;
            console.error(`Error loading ${filename}:`, error);

            targetDiv.innerHTML = `
                <div style="
                    text-align:center;
                    padding:40px;
                    color:var(--danger);
                    background:#FEF2F2;
                    border-radius:12px;
                    border:1px solid #FEE2E2;
                ">
                    <span class="material-symbols-rounded" style="font-size:32px;margin-bottom:8px">error</span>
                    <br>
                    <b>Unable to load this module.</b>
                    <br>
                    Check your connection and try again.
                    <br><br>
                    <button
                        onclick="window.switchView('${targetId}',null)"
                        style="
                            border:1px solid var(--border);
                            background:#fff;
                            border-radius:8px;
                            padding:8px 14px;
                            cursor:pointer;
                            font-weight:600;
                        ">
                        Retry
                    </button>
                </div>
            `;
        }

    } else {
        targetDiv.classList.add('active');
    }

    if (targetId === 'view-dashboard') window.fetchDashboardData?.();
};

/* -------------------------------------------------------
   BOOTSTRAP
------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('resize', window.updateSidebarCollapseControl);

    document.addEventListener('click', event => {
        if (!event.target.closest('.support-actions')) {
            const supportMenu = document.getElementById('support-menu');
            const supportButton = document.getElementById('support-button');
            supportMenu?.classList.remove('open');
            supportButton?.setAttribute('aria-expanded', 'false');
        }

        if (!event.target.closest('.header-actions')) {
            window.toggleProfileMenu(false);
        }

        if (!event.target.closest('.module-search')) {
            window.toggleModuleSearch(false);
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            document.getElementById('support-menu')?.classList.remove('open');
            document.getElementById('support-button')?.setAttribute('aria-expanded', 'false');
            window.toggleProfileMenu(false);
            window.toggleModuleSearch(false);
        }

    });

    dragElement(
        document.getElementById(
            "calc-popup-container"
        )
    );

    /*
       Load shared components with cache-busting.
       These do NOT render the appointment module.
       modules/crm/appointments/appointments.html is loaded only by switchView().
    */
    window.loadComponent(
        'header-container',
        'components/header.html'
    );

    window.loadComponent(
        'sidebar-container',
        'components/sidebar.html'
    );

    window.loadComponent(
        'bottomnav-container',
        'components/bottomnav.html'
    );

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        navigator.serviceWorker.register('./sw.js').catch(error => {
            console.error('Service worker registration failed:', error);
        });
    }

    /* If sidebar finishes after authentication, apply role again. */
    setTimeout(
        window.applyRoleVisibility,
        300
    );
    setTimeout(
        window.applyRoleVisibility,
        1000
    );
});