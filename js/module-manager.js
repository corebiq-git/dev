/*
 * COREBIQ Module Manager
 * One file, two modes:
 *   Browser: renders navigation and powers module-manager.html.
 *   Node.js: scans/creates indexes and runs a localhost management API.
 *
 * Run from the project root: node js/module-manager.js
 */
(function (root) {
  'use strict';

  // -----------------------------
  // Browser mode
  // -----------------------------
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const ICONS = {
      crm: 'users', erp: 'layers-3', inventory: 'boxes', hr: 'contact-round',
      templates: 'files', tools: 'receipt-text', reports: 'chart-no-axes-combined',
      settings: 'settings', dashboard: 'layout-dashboard'
    };

    function titleCase(value) {
      const acronyms = { crm: 'CRM', erp: 'ERP', hr: 'HR', gst: 'GST', api: 'API' };
      return String(value || '').split(/[-_\s]+/).filter(Boolean)
        .map(part => acronyms[part.toLowerCase()] || part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }

    function addNavStyles() {
      if (document.getElementById('corebiq-module-nav-styles')) return;
      const style = document.createElement('style');
      style.id = 'corebiq-module-nav-styles';
      style.textContent = `
        .cbq-module-nav-item { display: grid; gap: 3px; min-width: 0; width: 100%; }
        .cbq-module-nav-main { display: flex; align-items: center; gap: 3px; min-width: 0; }
        .cbq-module-nav-main > :is(.side-link, .drawer-main-link) { flex: 1; min-width: 0; }
        .cbq-module-nav-toggle {
          display: grid;
          place-items: center;
          flex: 0 0 36px;
          height: 36px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }
        .cbq-module-nav-toggle:hover,
        .cbq-module-nav-toggle[aria-expanded="true"] { background: var(--bg-tonal, #f0f4f9); }
        .cbq-module-nav-toggle svg { width: 16px; height: 16px; transition: transform .16s ease; }
        .cbq-module-nav-toggle[aria-expanded="true"] svg { transform: rotate(90deg); }
        .cbq-module-nav-children {
          display: none;
          gap: 3px;
          margin: 0 0 5px 9px;
          padding: 4px 4px 4px 7px;
          border-inline-start: 2px solid var(--border-light, #dee3eb);
          border-radius: 0 12px 12px 0;
          background: var(--bg-tonal, #f0f4f9);
        }
        .cbq-module-nav-item.is-open > .cbq-module-nav-children { display: grid; }
        .cbq-module-nav-children .cbq-module-nav-children { margin-inline-start: 4px; }
        .cbq-module-nav-children :is(.side-link, .drawer-main-link) {
          min-height: 42px;
          height: auto;
          gap: 8px;
          padding: 7px 8px;
          border-radius: 8px;
          font-size: .875rem;
          overflow-wrap: anywhere;
        }
        .cbq-module-nav-children :is(svg, i) { width: 17px; height: 17px; flex-shrink: 0; }
        .cbq-module-nav-children a[aria-current="page"] {
          background: var(--primary-100, #d3e3fd);
          color: var(--primary-900, #041e49);
          font-weight: 600;
        }
        .cbq-module-nav-item :is(a, button):focus-visible {
          outline: 2px solid var(--primary, #0b57d0);
          outline-offset: -2px;
        }
        .drawer-links .cbq-module-nav-toggle { flex-basis: 44px; height: 44px; }
        .drawer-links .cbq-module-nav-children .drawer-main-link { min-height: 44px; }
        @media (prefers-reduced-motion: reduce) {
          .cbq-module-nav-toggle svg { transition: none; }
        }
      `;
      document.head.appendChild(style);
    }

    function makeLink(node, mobile) {
      const link = document.createElement('a');
      link.href = new URL(node.href, document.baseURI).href;
      link.className = mobile ? 'drawer-main-link' : 'side-link';
      link.dataset.modulePath = node.path;
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', node.icon || 'folder');
      icon.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = node.title || titleCase(node.name);
      link.append(icon, label);
      return link;
    }

    function makeNode(node, mobile, depth) {
      const wrap = document.createElement('div');
      wrap.className = 'cbq-module-nav-item';
      wrap.dataset.modulePath = node.path;
      const main = document.createElement('div');
      main.className = 'cbq-module-nav-main';
      main.appendChild(makeLink(node, mobile));

      if (node.children && node.children.length) {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'cbq-module-nav-toggle';
        toggle.setAttribute('aria-label', `${node.title || titleCase(node.name)} submenu`);
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', `${mobile ? 'drawer' : 'sidebar'}-submenu-${encodeURIComponent(node.path)}`);
        const chevron = document.createElement('i');
        chevron.setAttribute('data-lucide', 'chevron-right');
        toggle.appendChild(chevron);
        toggle.addEventListener('click', () => {
          const open = wrap.classList.toggle('is-open');
          toggle.setAttribute('aria-expanded', String(open));
        });
        main.appendChild(toggle);
      }
      wrap.appendChild(main);

      if (node.children && node.children.length) {
        const children = document.createElement('div');
        children.className = 'cbq-module-nav-children';
        children.id = main.lastElementChild.getAttribute('aria-controls');
        node.children.forEach(child => children.appendChild(makeNode(child, mobile, depth + 1)));
        wrap.appendChild(children);
      }
      return wrap;
    }

    function markActive(container) {
      if (!container) return;
      const current = decodeURI(location.pathname).replace(/\\/g, '/');
      container.querySelectorAll('a[data-module-path]').forEach(link => {
        const hrefPath = new URL(link.href).pathname.replace(/\\/g, '/');
        const active = current === hrefPath || current.startsWith(hrefPath.replace(/index\.html$/, ''));
        link.classList.toggle('active', active);
        if (active) {
          if (current === hrefPath || current === hrefPath.replace(/index\.html$/, '')) {
            link.setAttribute('aria-current', 'page');
          }
          let parent = link.closest('.cbq-module-nav-item');
          while (parent) {
            parent.classList.add('is-open');
            const button = parent.querySelector(':scope > .cbq-module-nav-main .cbq-module-nav-toggle');
            if (button) button.setAttribute('aria-expanded', 'true');
            parent = parent.parentElement?.closest('.cbq-module-nav-item');
          }
        }
      });
    }

    async function renderNavigation() {
      addNavStyles();
      let response;
      try {
        response = await fetch(new URL('modules.json', document.baseURI), { cache: 'no-store' });
        if (!response.ok) throw new Error(`modules.json: ${response.status}`);
      } catch (error) {
        console.warn('[COREBIQ Module Manager] Navigation manifest unavailable. Run node js/module-manager.js.', error);
        return;
      }
      const manifest = await response.json();
      const desktop = document.querySelector('.side-nav');
      const mobile = document.querySelector('.drawer-links');
      const nodes = Array.isArray(manifest.modules) ? manifest.modules : [];

      [desktop, mobile].forEach((nav, index) => {
        if (!nav) return;
        const isMobile = index === 1;
        const home = nav.querySelector('[data-nav-key="home"]');
        const homeClone = home ? home.cloneNode(true) : null;
        nav.replaceChildren();
        if (homeClone) nav.appendChild(homeClone);
        nodes.forEach(node => {
          // Settings remains in the desktop sidebar's existing bottom section.
          if (!isMobile && node.name.toLowerCase() === 'settings') return;
          nav.appendChild(makeNode(node, isMobile, 0));
        });
        if (isMobile && !nodes.some(node => node.name.toLowerCase() === 'settings')) {
          const settings = document.querySelector('.sidebar-bottom [data-nav-key="settings"]');
          if (settings) nav.appendChild(settings.cloneNode(true));
        }
        markActive(nav);
      });

      const desktopSettings = document.querySelector('.sidebar-bottom [data-nav-key="settings"]');
      const settingsNode = nodes.find(node => node.name.toLowerCase() === 'settings');
      if (desktopSettings && settingsNode) desktopSettings.href = new URL(settingsNode.href, document.baseURI).href;

      if (window.lucide) window.lucide.createIcons();
      document.dispatchEvent(new CustomEvent('corebiq:module-navigation-ready', { detail: manifest }));
    }

    async function api(path, options = {}) {
      const response = await fetch(`/__module-manager/${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
      return data;
    }

    function initManagerPage() {
      const tree = document.getElementById('module-tree');
      if (!tree) return;
      const form = document.getElementById('module-create-form');
      const parentSelect = document.getElementById('module-parent');
      const status = document.getElementById('manager-status');
      const count = document.getElementById('module-count');
      const setStatus = (message, type = 'info') => {
        status.textContent = message;
        status.dataset.type = type;
      };

      function flatten(nodes, prefix = '') {
        const result = [];
        nodes.forEach(node => {
          result.push({ path: node.path, title: `${prefix}${node.title}` });
          result.push(...flatten(node.children || [], `${prefix}${node.title} / `));
        });
        return result;
      }

      function renderTree(nodes) {
        tree.replaceChildren();
        const render = (node, level) => {
          const item = document.createElement('li');
          item.className = 'manager-tree-item';
          item.style.setProperty('--level', level);
          const icon = document.createElement('i');
          icon.setAttribute('data-lucide', node.icon || 'folder');
          const name = document.createElement('span');
          name.className = 'manager-tree-name';
          name.textContent = node.title;
          const path = document.createElement('code');
          path.textContent = node.path;
          const actions = document.createElement('div');
          actions.className = 'manager-tree-actions';
          const add = document.createElement('button');
          add.type = 'button'; add.textContent = '+ Submodule'; add.className = 'quiet';
          add.addEventListener('click', () => { parentSelect.value = node.path; document.getElementById('module-name').focus(); });
          const rename = document.createElement('button');
          rename.type = 'button'; rename.textContent = 'Rename'; rename.className = 'quiet';
          rename.addEventListener('click', async () => {
            const next = prompt(`Rename “${node.title}” to:`, node.name);
            if (!next || next.trim() === node.name) return;
            try { await api('rename', { method: 'POST', body: JSON.stringify({ path: node.path, newName: next.trim() }) }); await refresh(); setStatus('Folder renamed and navigation synchronised.', 'success'); }
            catch (error) { setStatus(error.message, 'error'); }
          });
          const del = document.createElement('button');
          del.type = 'button'; del.textContent = 'Delete'; del.className = 'danger';
          del.addEventListener('click', async () => {
            const typed = prompt(`Move “${node.title}” and all its contents to the recoverable trash? Type ${node.name} to confirm.`);
            if (typed !== node.name) return;
            try { await api('delete', { method: 'POST', body: JSON.stringify({ path: node.path, confirmName: typed }) }); await refresh(); setStatus('Folder moved to recoverable trash. Navigation synchronised.', 'success'); }
            catch (error) { setStatus(error.message, 'error'); }
          });
          actions.append(add, rename, del);
          item.append(icon, name, path, actions);
          tree.appendChild(item);
          (node.children || []).forEach(child => render(child, level + 1));
        };
        nodes.forEach(node => render(node, 0));
        if (window.lucide) window.lucide.createIcons();
      }

      async function refresh() {
        const data = await api('tree');
        renderTree(data.modules || []);
        const all = flatten(data.modules || []);
        count.textContent = `${data.modules.length} main modules · ${Math.max(0, all.length - data.modules.length)} nested folders`;
        const selected = parentSelect.value;
        parentSelect.replaceChildren(new Option('Main module (root)', ''));
        all.forEach(item => parentSelect.add(new Option(item.title, item.path)));
        if (selected && [...parentSelect.options].some(option => option.value === selected)) parentSelect.value = selected;
      }

      form.addEventListener('submit', async event => {
        event.preventDefault();
        const name = document.getElementById('module-name').value.trim();
        const parentPath = parentSelect.value;
        const icon = document.getElementById('module-icon').value.trim();
        if (!name) return;
        try {
          await api('create', { method: 'POST', body: JSON.stringify({ name, parentPath, icon }) });
          form.reset();
          await refresh();
          setStatus('Folder created, index generated and navigation synchronised.', 'success');
        } catch (error) { setStatus(error.message, 'error'); }
      });

      document.getElementById('sync-modules').addEventListener('click', async () => {
        try { await api('sync', { method: 'POST', body: '{}' }); await refresh(); setStatus('Folder scan complete. Generated indexes and navigation are up to date.', 'success'); }
        catch (error) { setStatus(error.message, 'error'); }
      });

      refresh().then(() => setStatus('Connected to the local COREBIQ project folder.', 'success'))
        .catch(error => setStatus(`${error.message}. Start the manager using: node js/module-manager.js`, 'error'));
    }

    window.COREBIQModuleManager = { renderNavigation };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initManagerPage);
    else initManagerPage();
    return;
  }

  // -----------------------------
  // Node.js local manager mode
  // -----------------------------
  const fs = require('node:fs');
  const path = require('node:path');
  const http = require('node:http');
  const crypto = require('node:crypto');
  const ROOT = process.cwd();
  const MODULES_DIR = path.join(ROOT, 'modules');
  const TRASH_DIR = path.join(ROOT, '.module-manager-trash');
  const GENERATED_MARKER = '<!-- COREBIQ_MODULE_MANAGER_GENERATED -->';
  const DEFAULT_ORDER = ['crm', 'erp', 'inventory', 'hr', 'templates', 'tools', 'reports', 'settings'];
  const DEFAULT_ICONS = { crm: 'users', erp: 'layers-3', inventory: 'boxes', hr: 'contact-round', templates: 'files', tools: 'receipt-text', reports: 'chart-no-axes-combined', settings: 'settings' };
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

  function send(res, status, data, type = 'application/json; charset=utf-8') {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
  }
  function safeSegment(value) {
    const name = String(value || '').trim().replace(/\\/g, '/').split('/').pop().replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-');
    if (!name || name === '.' || name === '..') throw new Error('Enter a valid folder name.');
    return name;
  }
  function resolveModulePath(relative) {
    const clean = String(relative || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const full = path.resolve(MODULES_DIR, clean);
    if (full !== MODULES_DIR && !full.startsWith(MODULES_DIR + path.sep)) throw new Error('Invalid module path.');
    if (full === MODULES_DIR) throw new Error('Select a module folder, not the modules root.');
    return full;
  }
  function titleFromName(name) {
    const acronyms = { crm: 'CRM', erp: 'ERP', hr: 'HR', gst: 'GST', api: 'API' };
    return String(name).split(/[-_\s]+/).filter(Boolean).map(word => acronyms[word.toLowerCase()] || word[0].toUpperCase() + word.slice(1)).join(' ');
  }
  function readMeta(dir) {
    const file = path.join(dir, '.module.json');
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
  }
  function writeMeta(dir, meta) { fs.writeFileSync(path.join(dir, '.module.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8'); }
  function isDirectory(dir) { try { return fs.statSync(dir).isDirectory(); } catch { return false; } }
  function htmlFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).filter(item => item.isFile() && item.name.toLowerCase().endsWith('.html') && item.name.toLowerCase() !== 'index.html').map(item => item.name);
  }
  function chooseEntry(dir, name) {
    const files = htmlFiles(dir);
    const preferred = [`${name}.html`, `${name.toLowerCase()}.html`, 'dashboard.html', 'reports.html', 'settings.html'];
    for (const file of preferred) if (files.includes(file)) return file;
    const dashboardDir = path.join(dir, 'dashboard');
    if (isDirectory(dashboardDir)) {
      const dashboardFiles = htmlFiles(dashboardDir);
      const candidate = dashboardFiles.includes('dashboard.html') ? 'dashboard.html' : dashboardFiles[0];
      if (candidate) return path.posix.join('dashboard', candidate);
    }
    return files.sort((a, b) => a.localeCompare(b))[0] || null;
  }
  function relativeHref(fromDir, targetFile) {
    return path.relative(fromDir, targetFile).split(path.sep).join('/');
  }
  function generatedIndexContent(dir, name, entry, children) {
    const title = titleFromName(name);
    if (entry) {
      const href = relativeHref(dir, path.join(dir, entry));
      const safeHref = JSON.stringify(href);
      return `<!doctype html>\n${GENERATED_MARKER}\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${href.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"><title>${title} | COREBIQ</title></head><body><p>Opening <a href="${href.replace(/"/g, '&quot;')}">${title}</a>…</p><script>location.replace(${safeHref});</script></body></html>\n`;
    }
    const links = children.map(child => `<li><a href="${child.name}/index.html">${titleFromName(child.name)}</a></li>`).join('\n');
    return `<!doctype html>\n${GENERATED_MARKER}\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | COREBIQ</title><style>body{font:15px Inter,Arial,sans-serif;margin:0;padding:36px;color:#202124;background:#f7f9fc}main{max-width:760px;margin:auto}a{color:#185abc;text-decoration:none}li{padding:10px 0}</style></head><body><main><h1>${title}</h1><p>Choose a section to continue.</p><ul>${links || '<li>This module is ready. Add a page or submodule from Module Manager.</li>'}</ul></main></body></html>\n`;
  }
  function scanFolder(dir, relative = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules').sort((a, b) => {
      const ai = DEFAULT_ORDER.indexOf(a.name.toLowerCase()); const bi = DEFAULT_ORDER.indexOf(b.name.toLowerCase());
      if (!relative && ai !== -1 && bi !== -1) return ai - bi;
      if (!relative && ai !== -1) return -1;
      if (!relative && bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
    return entries.map(entry => {
      const childDir = path.join(dir, entry.name);
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const meta = readMeta(childDir);
      return { name: entry.name, title: meta.title || titleFromName(entry.name), icon: meta.icon || DEFAULT_ICONS[entry.name.toLowerCase()] || 'folder', path: childRelative, href: `modules/${childRelative}/index.html`, children: scanFolder(childDir, childRelative) };
    });
  }
  function writeGeneratedIndexes(dir) {
    const children = fs.readdirSync(dir, { withFileTypes: true }).filter(item => item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules');
    children.forEach(child => writeGeneratedIndexes(path.join(dir, child.name)));
    const name = path.basename(dir);
    const indexFile = path.join(dir, 'index.html');
    let existing = '';
    try { existing = fs.readFileSync(indexFile, 'utf8'); } catch {}
    const entry = chooseEntry(dir, name);
    if (!fs.existsSync(indexFile) || existing.includes(GENERATED_MARKER)) {
      fs.writeFileSync(indexFile, generatedIndexContent(dir, name, entry, children), 'utf8');
    }
  }
  function syncAll() {
    if (!isDirectory(MODULES_DIR)) throw new Error('The /modules folder was not found. Run this tool from the COREBIQ project root.');
    writeGeneratedIndexes(MODULES_DIR);
    const manifest = { generatedAt: new Date().toISOString(), modules: scanFolder(MODULES_DIR) };
    fs.writeFileSync(path.join(ROOT, 'modules.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    return manifest;
  }
  function readBody(req) {
    return new Promise((resolve, reject) => {
      let body = ''; req.on('data', chunk => { body += chunk; if (body.length > 1_000_000) reject(new Error('Request too large.')); });
      req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON request.')); } });
      req.on('error', reject);
    });
  }
  function ensureWithinModules(dir) {
    if (!dir.startsWith(MODULES_DIR + path.sep) || !isDirectory(dir)) throw new Error('Module folder not found.');
  }
  async function handleApi(req, res, url) {
    try {
      if (req.method === 'GET' && url.pathname === '/__module-manager/tree') return send(res, 200, syncAll());
      if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
      const body = await readBody(req);
      if (url.pathname === '/__module-manager/sync') return send(res, 200, syncAll());
      if (url.pathname === '/__module-manager/create') {
        const name = safeSegment(body.name);
        const parent = body.parentPath ? resolveModulePath(body.parentPath) : MODULES_DIR;
        if (parent !== MODULES_DIR) ensureWithinModules(parent);
        const target = path.join(parent, name);
        if (!target.startsWith(MODULES_DIR + path.sep)) throw new Error('Invalid destination.');
        if (fs.existsSync(target)) throw new Error('A folder with this name already exists.');
        fs.mkdirSync(target, { recursive: false });
        writeMeta(target, { title: titleFromName(name), icon: String(body.icon || DEFAULT_ICONS[name.toLowerCase()] || 'folder') });
        return send(res, 201, { ok: true, manifest: syncAll() });
      }
      if (url.pathname === '/__module-manager/rename') {
        const source = resolveModulePath(body.path); ensureWithinModules(source);
        const newName = safeSegment(body.newName);
        const destination = path.join(path.dirname(source), newName);
        if (fs.existsSync(destination)) throw new Error('A folder with this name already exists.');
        fs.renameSync(source, destination);
        const meta = readMeta(destination); writeMeta(destination, { ...meta, title: titleFromName(newName) });
        return send(res, 200, { ok: true, manifest: syncAll() });
      }
      if (url.pathname === '/__module-manager/delete') {
        const source = resolveModulePath(body.path); ensureWithinModules(source);
        if (path.dirname(source) === MODULES_DIR && DEFAULT_ORDER.includes(path.basename(source).toLowerCase()) && body.confirmName !== path.basename(source)) throw new Error('Type the exact folder name to confirm deletion.');
        if (body.confirmName !== path.basename(source)) throw new Error('Deletion not confirmed.');
        fs.mkdirSync(TRASH_DIR, { recursive: true });
        const trashName = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}-${path.basename(source)}`;
        fs.renameSync(source, path.join(TRASH_DIR, trashName));
        return send(res, 200, { ok: true, movedToTrash: trashName, manifest: syncAll() });
      }
      return send(res, 404, { error: 'Unknown manager endpoint.' });
    } catch (error) { return send(res, 400, { error: error.message || 'Operation failed.' }); }
  }
  function serveStatic(req, res, url) {
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { return send(res, 400, 'Bad URL', 'text/plain'); }
    if (pathname === '/') pathname = '/index.html';
    const file = path.resolve(ROOT, `.${pathname}`);
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return send(res, 403, 'Forbidden', 'text/plain');
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) return send(res, 404, 'Not found', 'text/plain');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
      fs.createReadStream(file).pipe(res);
    });
  }
  function startServer() {
    const portArg = process.argv.find((arg, index) => process.argv[index - 1] === '--port');
    const port = Number(portArg || process.env.COREBIQ_MANAGER_PORT || 4177);
    try { syncAll(); } catch (error) { console.error(`[COREBIQ Module Manager] ${error.message}`); process.exitCode = 1; return; }
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
      if (url.pathname.startsWith('/__module-manager/')) return handleApi(req, res, url);
      serveStatic(req, res, url);
    });
    server.listen(port, '127.0.0.1', () => {
      console.log('\nCOREBIQ Module Manager is running.');
      console.log(`Editor: http://127.0.0.1:${port}/module-manager.html`);
      console.log(`App:    http://127.0.0.1:${port}/index.html`);
      console.log('Localhost only: this management API is not exposed to your network or public hosting.');
      console.log('Press Ctrl+C to stop.\n');
    });
  }
  startServer();
})(typeof globalThis !== 'undefined' ? globalThis : this);
