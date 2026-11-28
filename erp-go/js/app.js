
    (function () {
      'use strict';

      /* =======================================================================
         1. SAFE STORAGE & CROSS-TAB SYNC HELPER (NEVER THROWS IN SANDBOX)
         ======================================================================= */
      const DB_KEY = 'erp_g_corebiq_db_v3';
      const memoryFallback = {};

      const SafeStorage = {
        get(key) {
          try {
            return window.localStorage.getItem(key);
          } catch (e) {
            return memoryFallback[key] || null;
          }
        },
        set(key, val) {
          try {
            window.localStorage.setItem(key, val);
          } catch (e) {
            memoryFallback[key] = val;
          }
        },
        sizeKB(key) {
          const val = this.get(key) || '';
          return (new Blob([val]).size / 1024).toFixed(1);
        }
      };

      let syncChannel = null;
      try {
        if ('BroadcastChannel' in window) {
          syncChannel = new BroadcastChannel('erp_g_sync_channel');
          syncChannel.onmessage = (ev) => {
            if (ev.data && ev.data.type === 'DB_UPDATED') {
              loadDB();
              renderApp();
              showToast('Real-time sync received from another tab!', 'info');
            }
          };
        }
      } catch (e) { /* Safe ignore in restricted sandboxes */ }

      try {
        window.addEventListener('storage', (ev) => {
          if (ev.key === DB_KEY && ev.newValue) {
            loadDB();
            renderApp();
          }
        });
      } catch (e) {}

      /* =======================================================================
         2. DATE (yyyy-Mmm-dd), CURRENCY (₹ INDIAN), ESCAPE & CSV EXPORT HELPERS
         ======================================================================= */
      const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const TODAY = new Date();

      function toISODate(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      }
      const TODAY_ISO = toISODate(TODAY);

      function daysAgoISO(days) {
        const d = new Date(TODAY);
        d.setDate(d.getDate() - days);
        return toISODate(d);
      }

      // Mandatory yyyy-Mmm-dd date format (e.g., 2026-Nov-28)
      function fmtDate(iso) {
        if (!iso) return '-';
        const parts = String(iso).split('-');
        if (parts.length !== 3) return iso;
        const m = MONTHS[parseInt(parts[1], 10) - 1] || parts[1];
        return `${parts[0]}-${m}-${parts[2]}`;
      }

      // Indian Rupee formatting with Indian comma grouping (₹1,24,500)
      function fmtINR(val, decimals = 0) {
        const n = Number(val) || 0;
        const sign = n < 0 ? '-' : '';
        return sign + '₹' + Math.abs(n).toLocaleString('en-IN', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });
      }

      function esc(str) {
        if (str === null || str === undefined) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      function uid(prefix) {
        return prefix + '-' + Date.now().toString(36).toUpperCase().slice(-4) + Math.floor(10 + Math.random() * 89);
      }

      function showToast(msg, type = 'info') {
        const wrap = document.getElementById('toast-wrap');
        if (!wrap) return;
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.textContent = msg;
        wrap.appendChild(el);
        setTimeout(() => {
          el.style.opacity = '0';
          el.style.transition = 'opacity 0.2s';
          setTimeout(() => el.remove(), 220);
        }, 2600);
      }

      function copyToClipboard(text, okMsg = 'Copied to clipboard!') {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          showToast(okMsg, 'success');
        } catch (e) {
          showToast('Copy failed. Please copy manually.', 'warning');
        }
      }

      function exportCSV(filename, headers, rows) {
        try {
          const lines = [headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',')];
          rows.forEach(r => {
            lines.push(r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','));
          });
          const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${filename}_${TODAY_ISO}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast(`Exported ${filename}.csv`, 'success');
        } catch (e) {
          showToast('Export error: ' + e.message, 'error');
        }
      }

      /* =======================================================================
         3. CRISP INLINE SVG ICONS & HOUSEHOLD ITEM ILLUSTRATIONS
         ======================================================================= */
      const ICONS = {
        dashboard: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
        catalogues: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
        salesApp: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>`,
        purchase: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2m9 0H9m5 0h1m5 0h1a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`,
        reports: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18M8 16v-3m5 3V8m5 8v-5"/></svg>`,
        lock: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
        camera: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
        plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
        download: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
        print: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
        mapPin: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
        phone: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
        wa: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`
      };

      function getHouseholdSVG(key) {
        const map = {
          bucket: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#ECFDF5"/><path d="M22 27 C22 14,58 14,58 27" fill="none" stroke="#065F46" stroke-width="3" stroke-linecap="round"/><path d="M20 27 L60 27 L54 64 C53.5 67 51 69 48 69 L32 69 C29 69 26.5 67 26 64 Z" fill="#059669"/><ellipse cx="40" cy="27" rx="20" ry="5" fill="#34D399"/><rect x="29" y="39" width="22" height="5" rx="2.5" fill="#A7F3D0" opacity="0.8"/></svg>`,
          mug: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#F0FDF4"/><path d="M24 23 L50 23 L47 62 C47 65 44 67 41 67 L33 67 C30 67 27 65 27 62 Z" fill="#0D9488"/><path d="M50 30 C61 30 61 52 48 52" fill="none" stroke="#0F766E" stroke-width="5" stroke-linecap="round"/><ellipse cx="37" cy="23" rx="13" ry="3.5" fill="#5EEAD4"/><circle cx="37" cy="45" r="6" fill="#CCFBF1" opacity="0.7"/></svg>`,
          tub: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#EFF6FF"/><path d="M12 34 L68 34 L60 62 C59 65 56 67 52 67 L28 67 C24 67 21 65 20 62 Z" fill="#2563EB"/><ellipse cx="40" cy="34" rx="28" ry="6" fill="#60A5FA"/><rect x="10" y="31" width="60" height="4" rx="2" fill="#1E40AF"/></svg>`,
          broom: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#FFFBEB"/><line x1="56" y1="12" x2="36" y2="42" stroke="#78350F" stroke-width="5" stroke-linecap="round"/><path d="M31 40 L42 46 L28 68 L14 60 Z" fill="#D97706"/><path d="M34 42 L22 64 M38 44 L26 66" stroke="#FEF3C7" stroke-width="1.8"/><rect x="30" y="38" width="13" height="6" rx="2" transform="rotate(30 36 41)" fill="#059669"/></svg>`,
          seekh: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#FEF3C7"/><path d="M56 14 L34 44 L16 66 L28 70 L44 48 L62 18 Z" fill="#92400E"/><rect x="44" y="24" width="12" height="7" rx="2" transform="rotate(38 50 28)" fill="#DC2626"/><line x1="36" y1="45" x2="21" y2="66" stroke="#FDE68A" stroke-width="1.6"/></svg>`,
          mop: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#ECFDF5"/><line x1="40" y1="10" x2="40" y2="47" stroke="#202322" stroke-width="4" stroke-linecap="round"/><rect x="22" y="46" width="36" height="8" rx="3" fill="#059669"/><path d="M20 54 Q24 68 28 54 Q32 68 36 54 Q40 68 44 54 Q48 68 52 54 Q56 68 60 54" fill="#34D399" stroke="#047857" stroke-width="1.5"/></svg>`,
          dustbin: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#F1F5F3"/><rect x="22" y="22" width="36" height="6" rx="2" fill="#202322"/><path d="M34 22 L34 17 L46 17 L46 22" fill="none" stroke="#202322" stroke-width="2.5"/><path d="M25 28 L55 28 L52 66 L28 66 Z" fill="#475569"/><line x1="34" y1="35" x2="35" y2="59" stroke="#CBD5E1" stroke-width="2.5" stroke-linecap="round"/><line x1="40" y1="35" x2="40" y2="59" stroke="#CBD5E1" stroke-width="2.5" stroke-linecap="round"/><line x1="46" y1="35" x2="45" y2="59" stroke="#CBD5E1" stroke-width="2.5" stroke-linecap="round"/><rect x="34" y="64" width="12" height="4" rx="1" fill="#059669"/></svg>`,
          brush: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#FEF2F2"/><rect x="16" y="28" width="48" height="14" rx="5" fill="#DC2626"/><path d="M20 42 L20 58 M26 42 L26 58 M32 42 L32 58 M38 42 L38 58 M44 42 L44 58 M50 42 L50 58 M56 42 L56 58 M60 42 L60 58" stroke="#D97706" stroke-width="2.5" stroke-linecap="round"/></svg>`,
          jar: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#FFF7ED"/><rect x="27" y="16" width="26" height="8" rx="2" fill="#EA580C"/><rect x="23" y="25" width="34" height="42" rx="6" fill="#FED7AA" stroke="#EA580C" stroke-width="2"/><rect x="28" y="35" width="24" height="16" rx="2" fill="#FFFFFF"/><line x1="32" y1="41" x2="48" y2="41" stroke="#EA580C" stroke-width="2"/><line x1="34" y1="46" x2="46" y2="46" stroke="#FB923C" stroke-width="2"/></svg>`,
          drum: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#F0FDF4"/><rect x="22" y="17" width="36" height="8" rx="3" fill="#047857"/><rect x="20" y="25" width="40" height="43" rx="5" fill="#10B981"/><line x1="20" y1="38" x2="60" y2="38" stroke="#047857" stroke-width="2.5"/><line x1="20" y1="53" x2="60" y2="53" stroke="#047857" stroke-width="2.5"/></svg>`,
          basket: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#F0FDFA"/><path d="M18 28 L62 28 L56 65 L24 65 Z" fill="#0D9488"/><rect x="15" y="24" width="50" height="6" rx="2" fill="#115E59"/><circle cx="31" cy="40" r="3" fill="#CCFBF1"/><circle cx="40" cy="40" r="3" fill="#CCFBF1"/><circle cx="49" cy="40" r="3" fill="#CCFBF1"/><circle cx="33" cy="52" r="3" fill="#CCFBF1"/><circle cx="40" cy="52" r="3" fill="#CCFBF1"/><circle cx="47" cy="52" r="3" fill="#CCFBF1"/></svg>`,
          hanger: `<svg viewBox="0 0 80 80"><rect width="80" height="80" fill="#F5F3FF"/><path d="M40 28 C40 20,48 18,48 24 C48 27,45 28,40 31" fill="none" stroke="#6D28D9" stroke-width="3.5" stroke-linecap="round"/><path d="M40 31 L14 54 C12 56 13 59 16 59 L64 59 C67 59 68 56 66 54 Z" fill="none" stroke="#5B21B6" stroke-width="4" stroke-linejoin="round"/></svg>`
        };
        return map[key] || map.bucket;
      }

      function renderPhoto(photo, iconKey, sizePx = 56) {
        const inner = photo
          ? `<img src="${esc(photo)}" alt="Photo" />`
          : getHouseholdSVG(iconKey);
        return `<div class="photo-box" style="width:${sizePx}px;height:${sizePx}px;">${inner}</div>`;
      }

      // Compress uploaded device photo via HTML5 Canvas before saving to storage
      function compressPhotoInput(inputEl, hiddenId, previewId) {
        const file = inputEl.files && inputEl.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 320;
            let w = img.width, h = img.height;
            if (w > h && w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; }
            else if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
            const hid = document.getElementById(hiddenId);
            if (hid) hid.value = dataUrl;
            const prev = document.getElementById(previewId);
            if (prev) prev.innerHTML = `<img src="${dataUrl}" alt="Uploaded Preview" />`;
            showToast('Photo uploaded & optimized!', 'success');
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      }

      /* =======================================================================
         4. PRELOADED ENTERPRISE SEED DATASET (HOUSEHOLD ITEMS + INDIAN B2B)
         ======================================================================= */
      function getSeedDB() {
        return {
          company: {
            name: 'ERP-GO Household & Plasticware Distributors',
            brand: 'COREBIQ',
            gstin: '32AABCE8841K1Z9',
            city: 'Koyilandy, Kozhikode, Kerala',
            phone: '9847001122'
          },
          users: [
            {
              id: 'USR-ADMIN', name: 'Vikram Menon', role: 'Admin', salesmanId: null,
              permissions: { dashboard: true, catalogues: true, salesApp: true, purchase: true, reports: true, viewProfit: true }
            },
            {
              id: 'USR-SM1', name: 'Arjun Nair', role: 'Salesman', salesmanId: 'SM-01',
              permissions: { dashboard: false, catalogues: true, salesApp: true, purchase: false, reports: false, viewProfit: false }
            },
            {
              id: 'USR-PUR', name: 'Deepa Krishnan', role: 'Purchase Manager', salesmanId: null,
              permissions: { dashboard: true, catalogues: true, salesApp: false, purchase: true, reports: true, viewProfit: false }
            },
            {
              id: 'USR-ACC', name: 'Ramesh Iyer', role: 'Accountant', salesmanId: null,
              permissions: { dashboard: true, catalogues: true, salesApp: false, purchase: true, reports: true, viewProfit: true }
            }
          ],
          routes: ['Kozhikode North', 'Koyilandy Highway', 'Kannur Town', 'Thrissur Central'],
          categories: [
            { name: 'Buckets & Mugs', iconKey: 'bucket', photo: '' },
            { name: 'Brooms & Mops', iconKey: 'broom', photo: '' },
            { name: 'Dustbins & Utility', iconKey: 'dustbin', photo: '' },
            { name: 'Kitchen & Storage', iconKey: 'jar', photo: '' },
            { name: 'Laundry & Bath', iconKey: 'basket', photo: '' }
          ],
          salesmen: [
            { id: 'SM-01', name: 'Arjun Nair', phone: '9847112233', route: 'Kozhikode North', target: 250000, lat: 11.2588, lng: 75.7804, status: 'On Route', lastCheckIn: `${fmtDate(TODAY_ISO)} 09:40 AM` },
            { id: 'SM-02', name: 'Faisal Rahman', phone: '9745223344', route: 'Koyilandy Highway', target: 200000, lat: 11.4429, lng: 75.6976, status: 'Online', lastCheckIn: `${fmtDate(TODAY_ISO)} 10:15 AM` },
            { id: 'SM-03', name: 'Nithin Raj', phone: '9447334455', route: 'Kannur Town', target: 180000, lat: 11.8745, lng: 75.3704, status: 'On Route', lastCheckIn: `${fmtDate(TODAY_ISO)} 09:12 AM` },
            { id: 'SM-04', name: 'Sneha Varghese', phone: '9895445566', route: 'Thrissur Central', target: 220000, lat: 10.5276, lng: 76.2144, status: 'Idle', lastCheckIn: `${fmtDate(daysAgoISO(1))} 05:30 PM` }
          ],
          products: [
            // 1. Buckets & Mugs
            { id: 'P-101', sku: 'BKT-20L', name: '20L Virgin Plastic Bucket', category: 'Buckets & Mugs', iconKey: 'bucket', photo: '', options: ['16L', '20L', '25L'], costPrice: 130, sellPrice: 185, gst: 18, stock: 180, reorderLevel: 30, stockAgeDays: 14, lastSoldDaysAgo: 0, openingStock: 210, purchasedQty: 90, soldQty: 120 },
            { id: 'P-102', sku: 'MUG-15L', name: '1.5L Printed Bath Mug (Pack 12)', category: 'Buckets & Mugs', iconKey: 'mug', photo: '', options: ['1L', '1.5L'], costPrice: 230, sellPrice: 330, gst: 18, stock: 96, reorderLevel: 20, stockAgeDays: 22, lastSoldDaysAgo: 1, openingStock: 120, purchasedQty: 40, soldQty: 64 },
            { id: 'P-103', sku: 'TUB-35L', name: '35L Heavy Utility Tub', category: 'Buckets & Mugs', iconKey: 'tub', photo: '', options: ['25L', '35L', '45L'], costPrice: 195, sellPrice: 275, gst: 18, stock: 22, reorderLevel: 25, stockAgeDays: 19, lastSoldDaysAgo: 0, openingStock: 50, purchasedQty: 22, soldQty: 50 },
            // 2. Brooms & Mops
            { id: 'P-104', sku: 'BRM-PHL', name: 'Assam Phool Grass Broom (Bundle 10)', category: 'Brooms & Mops', iconKey: 'broom', photo: '', options: ['Regular', 'Jumbo'], costPrice: 520, sellPrice: 710, gst: 5, stock: 112, reorderLevel: 25, stockAgeDays: 16, lastSoldDaysAgo: 0, openingStock: 145, purchasedQty: 55, soldQty: 88 },
            { id: 'P-105', sku: 'BRM-SKH', name: 'Coconut Seekh Hard Broom (Bundle 12)', category: 'Brooms & Mops', iconKey: 'seekh', photo: '', options: ['Standard', 'Heavy'], costPrice: 350, sellPrice: 480, gst: 5, stock: 74, reorderLevel: 20, stockAgeDays: 34, lastSoldDaysAgo: 3, openingStock: 90, purchasedQty: 30, soldQty: 46 },
            { id: 'P-106', sku: 'MOP-360', name: '360° Steel Spin Mop Set', category: 'Brooms & Mops', iconKey: 'mop', photo: '', options: ['Plastic Basket', 'Steel Basket'], costPrice: 485, sellPrice: 675, gst: 18, stock: 46, reorderLevel: 15, stockAgeDays: 24, lastSoldDaysAgo: 1, openingStock: 62, purchasedQty: 24, soldQty: 40 },
            // 3. Dustbins & Utility
            { id: 'P-107', sku: 'DST-15L', name: '15L Pedal Dustbin', category: 'Dustbins & Utility', iconKey: 'dustbin', photo: '', options: ['10L', '15L', '20L'], costPrice: 175, sellPrice: 245, gst: 18, stock: 68, reorderLevel: 20, stockAgeDays: 48, lastSoldDaysAgo: 5, openingStock: 85, purchasedQty: 20, soldQty: 37 },
            { id: 'P-108', sku: 'BRS-HRD', name: 'Hard Bristle Scrub Brush (Doz)', category: 'Dustbins & Utility', iconKey: 'brush', photo: '', options: ['Floor', 'Sink'], costPrice: 280, sellPrice: 395, gst: 18, stock: 58, reorderLevel: 15, stockAgeDays: 74, lastSoldDaysAgo: 39, openingStock: 65, purchasedQty: 10, soldQty: 17 },
            // 4. Kitchen & Storage
            { id: 'P-109', sku: 'JAR-6PC', name: '6-Pc Airtight Storage Jar Set', category: 'Kitchen & Storage', iconKey: 'jar', photo: '', options: ['500ml', '1000ml'], costPrice: 310, sellPrice: 440, gst: 18, stock: 52, reorderLevel: 12, stockAgeDays: 102, lastSoldDaysAgo: 64, openingStock: 56, purchasedQty: 0, soldQty: 4 },
            { id: 'P-110', sku: 'DRM-10L', name: '10L Atta/Grain Drum', category: 'Kitchen & Storage', iconKey: 'drum', photo: '', options: ['10L', '15L'], costPrice: 245, sellPrice: 350, gst: 18, stock: 65, reorderLevel: 15, stockAgeDays: 28, lastSoldDaysAgo: 4, openingStock: 75, purchasedQty: 20, soldQty: 30 },
            // 5. Laundry & Bath
            { id: 'P-111', sku: 'LND-40L', name: '40L Ventilated Laundry Basket', category: 'Laundry & Bath', iconKey: 'basket', photo: '', options: ['Medium', 'Large'], costPrice: 280, sellPrice: 390, gst: 18, stock: 64, reorderLevel: 15, stockAgeDays: 95, lastSoldDaysAgo: 72, openingStock: 64, purchasedQty: 0, soldQty: 0 },
            { id: 'P-112', sku: 'HNG-12P', name: '12-Pc Heavy Plastic Hanger Set', category: 'Laundry & Bath', iconKey: 'hanger', photo: '', options: ['Adult', 'Kids'], costPrice: 120, sellPrice: 175, gst: 12, stock: 125, reorderLevel: 25, stockAgeDays: 21, lastSoldDaysAgo: 2, openingStock: 140, purchasedQty: 35, soldQty: 50 }
          ],
          customers: [
            { id: 'C-01', name: 'Malabar Home Needs & Plastics', contact: 'Abdul Rahman', phone: '9847012345', route: 'Kozhikode North', gstin: '32AABCM4521K1Z5', creditLimit: 150000, outstanding: 42500, overdueDays: 18, lat: 11.2588, lng: 75.7804 },
            { id: 'C-02', name: 'Sri Lakshmi Household Mart', contact: 'Suresh Nair', phone: '9447198765', route: 'Koyilandy Highway', gstin: '32AFHPS9120D1Z2', creditLimit: 100000, outstanding: 68400, overdueDays: 46, lat: 11.4429, lng: 75.6976 },
            { id: 'C-03', name: 'Kannur Wholesale Bazaar', contact: 'Riyas K', phone: '9895667788', route: 'Kannur Town', gstin: '32CCPKB7741M1Z8', creditLimit: 200000, outstanding: 94200, overdueDays: 72, lat: 11.8745, lng: 75.3704 },
            { id: 'C-04', name: 'Thrissur Plastic & Crockery', contact: 'Jose Mathew', phone: '9745067890', route: 'Thrissur Central', gstin: '32AAACT8832F1Z1', creditLimit: 120000, outstanding: 31800, overdueDays: 98, lat: 10.5276, lng: 76.2144 },
            { id: 'C-05', name: 'Koyilandy Hyper Choice', contact: 'Anil Kumar', phone: '9847556677', route: 'Koyilandy Highway', gstin: '32AAFKH3102L1Z4', creditLimit: 125000, outstanding: 18500, overdueDays: 12, lat: 11.4480, lng: 75.7010 }
          ],
          suppliers: [
            { id: 'SUP-01', name: 'Cochin Polymer Moulders Pvt Ltd', contact: 'Harish Varma', phone: '9846011223', city: 'Ernakulam', gstin: '32AAACC1122K1Z1', outstanding: 84500, category: 'Buckets & Tubs' },
            { id: 'SUP-02', name: 'Malabar Broom & Brush Works', contact: 'Thomas Kurian', phone: '9446122334', city: 'Thrissur', gstin: '32BBBHT2233M1Z4', outstanding: 46200, category: 'Brooms & Mops' },
            { id: 'SUP-03', name: 'Deccan Homeware Plastics', contact: 'Prakash Rao', phone: '9886099887', city: 'Coimbatore', gstin: '33CCDDE9988N1Z2', outstanding: 112000, category: 'Dustbins & Kitchen' }
          ],
          orders: [
            {
              id: 'ORD-2026-101', date: TODAY_ISO, customerId: 'C-01', salesmanId: 'SM-01', route: 'Kozhikode North',
              items: [
                { productId: 'P-101', name: '20L Virgin Plastic Bucket', option: '20L', qty: 60, unitPrice: 185, costPrice: 130, gst: 18 },
                { productId: 'P-104', name: 'Assam Phool Grass Broom (Bundle 10)', option: 'Jumbo', qty: 20, unitPrice: 710, costPrice: 520, gst: 5 }
              ],
              discountType: 'flat', discountVal: 0, gstMode: 'exclusive',
              subtotal: 25300, discountAmt: 0, tax: 2708, total: 28008, costTotal: 18200, profit: 7100,
              status: 'Pending', notes: 'Morning dispatch requested'
            },
            {
              id: 'ORD-2026-102', date: TODAY_ISO, customerId: 'C-02', salesmanId: 'SM-02', route: 'Koyilandy Highway',
              items: [
                { productId: 'P-106', name: '360° Steel Spin Mop Set', option: 'Steel Basket', qty: 25, unitPrice: 675, costPrice: 485, gst: 18 },
                { productId: 'P-102', name: '1.5L Printed Bath Mug (Pack 12)', option: '1.5L', qty: 18, unitPrice: 330, costPrice: 230, gst: 18 }
              ],
              discountType: 'flat', discountVal: 0, gstMode: 'exclusive',
              subtotal: 22815, discountAmt: 0, tax: 4107, total: 26922, costTotal: 16265, profit: 6550,
              status: 'Approved', notes: 'Send GST invoice copy'
            },
            {
              id: 'ORD-2026-103', date: daysAgoISO(2), customerId: 'C-03', salesmanId: 'SM-03', route: 'Kannur Town',
              items: [
                { productId: 'P-107', name: '15L Pedal Dustbin', option: '15L', qty: 45, unitPrice: 245, costPrice: 175, gst: 18 },
                { productId: 'P-103', name: '35L Heavy Utility Tub', option: '35L', qty: 40, unitPrice: 275, costPrice: 195, gst: 18 }
              ],
              discountType: 'flat', discountVal: 0, gstMode: 'exclusive',
              subtotal: 22025, discountAmt: 0, tax: 3965, total: 25990, costTotal: 15675, profit: 6350,
              status: 'Dispatched', notes: 'Sent via Malabar Parcel'
            },
            {
              id: 'ORD-2026-104', date: daysAgoISO(10), customerId: 'C-04', salesmanId: 'SM-04', route: 'Thrissur Central',
              items: [
                { productId: 'P-105', name: 'Coconut Seekh Hard Broom (Bundle 12)', option: 'Heavy', qty: 30, unitPrice: 480, costPrice: 350, gst: 5 },
                { productId: 'P-112', name: '12-Pc Heavy Plastic Hanger Set', option: 'Adult', qty: 50, unitPrice: 175, costPrice: 120, gst: 12 }
              ],
              discountType: 'flat', discountVal: 0, gstMode: 'exclusive',
              subtotal: 23150, discountAmt: 0, tax: 1770, total: 24920, costTotal: 16500, profit: 6650,
              status: 'Delivered', notes: 'POD signed'
            },
            {
              id: 'ORD-2026-105', date: daysAgoISO(22), customerId: 'C-05', salesmanId: 'SM-02', route: 'Koyilandy Highway',
              items: [
                { productId: 'P-110', name: '10L Atta/Grain Drum', option: '15L', qty: 40, unitPrice: 350, costPrice: 245, gst: 18 }
              ],
              discountType: 'flat', discountVal: 0, gstMode: 'exclusive',
              subtotal: 14000, discountAmt: 0, tax: 2520, total: 16520, costTotal: 9800, profit: 4200,
              status: 'Delivered', notes: 'Paid via UPI'
            },
            {
              id: 'ORD-2026-106', date: daysAgoISO(58), customerId: 'C-01', salesmanId: 'SM-01', route: 'Kozhikode North',
              items: [
                { productId: 'P-101', name: '20L Virgin Plastic Bucket', option: '25L', qty: 120, unitPrice: 185, costPrice: 130, gst: 18 }
              ],
              discountType: 'flat', discountVal: 0, gstMode: 'exclusive',
              subtotal: 22200, discountAmt: 0, tax: 3996, total: 26196, costTotal: 15600, profit: 6600,
              status: 'Delivered', notes: 'Festival stock'
            }
          ],
          purchaseOrders: [
            {
              id: 'PO-2026-01', date: daysAgoISO(3), supplierId: 'SUP-01',
              items: [
                { productId: 'P-101', name: '20L Virgin Plastic Bucket', qty: 100, rate: 130, gst: 18 },
                { productId: 'P-103', name: '35L Heavy Utility Tub', qty: 40, rate: 195, gst: 18 }
              ],
              subtotal: 20800, tax: 3744, total: 24544, status: 'Received', notes: 'Unloaded at Koyilandy Godown'
            },
            {
              id: 'PO-2026-02', date: TODAY_ISO, supplierId: 'SUP-02',
              items: [
                { productId: 'P-104', name: 'Assam Phool Grass Broom (Bundle 10)', qty: 40, rate: 520, gst: 5 }
              ],
              subtotal: 20800, tax: 1040, total: 21840, status: 'Ordered', notes: 'Urgent replenishment'
            }
          ],
          expenses: [
            { id: 'EXP-01', date: TODAY_ISO, category: 'Fuel & Logistics', amount: 4200, mode: 'UPI', notes: 'Delivery van diesel' },
            { id: 'EXP-02', date: daysAgoISO(4), category: 'Warehouse Rent', amount: 18000, mode: 'NEFT', notes: 'Monthly godown lease' },
            { id: 'EXP-03', date: daysAgoISO(9), category: 'Salaries & Bata', amount: 22500, mode: 'Bank Transfer', notes: 'Sales staff allowance' },
            { id: 'EXP-04', date: daysAgoISO(16), category: 'Utilities & Internet', amount: 3100, mode: 'UPI', notes: 'Electricity & Fiber' }
          ],
          returns: [
            { id: 'CN-2026-01', date: daysAgoISO(5), orderId: 'ORD-2026-103', customerId: 'C-03', productName: '15L Pedal Dustbin', qty: 4, amount: 1156, reason: 'Lid cracked in transit' },
            { id: 'CN-2026-02', date: daysAgoISO(17), orderId: 'ORD-2026-104', customerId: 'C-04', productName: '12-Pc Heavy Plastic Hanger Set', qty: 5, amount: 980, reason: 'Excess quantity billed' }
          ],
          collections: [
            { id: 'RCP-01', date: TODAY_ISO, customerId: 'C-01', amount: 35000, mode: 'UPI' },
            { id: 'RCP-02', date: daysAgoISO(3), customerId: 'C-02', amount: 28000, mode: 'NEFT' },
            { id: 'RCP-03', date: daysAgoISO(11), customerId: 'C-05', amount: 16520, mode: 'Cash' },
            { id: 'RCP-04', date: daysAgoISO(20), customerId: 'C-03', amount: 52000, mode: 'Cheque' }
          ]
        };
      }

      /* =======================================================================
         5. APPLICATION STATE & DATA ACCESSORS
         ======================================================================= */
      const state = {
        db: null,
        activeUserId: 'USR-ADMIN',
        activeTab: 'dashboard',       // dashboard | catalogues | salesApp | purchase | reports
        salesSubTab: 'order',         // order | customers | orders | gps
        catalogueCategory: null,      // null = categories grid, string = items in category
        catalogueSearch: '',
        salesOrderCategory: 'all',
        customerSearch: '',
        activeReport: 'stock_aging',
        filters: {
          period: 'yearly',           // daily | monthly | yearly
          customerId: 'all',
          productId: 'all',
          salesmanId: 'all',
          route: 'all',
          orderStatus: 'all'
        },
        cart: {
          customerId: 'C-01',
          salesmanId: 'SM-01',
          date: TODAY_ISO,
          discountType: 'flat',       // flat | pct
          discountVal: 0,
          gstMode: 'exclusive',       // exclusive | inclusive
          notes: '',
          items: []
        },
        poDraft: {
          supplierId: 'SUP-01',
          notes: '',
          items: []
        }
      };

      function loadDB() {
        const raw = SafeStorage.get(DB_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.products && parsed.customers && parsed.orders) {
              if (parsed.company && typeof parsed.company.name === 'string' && parsed.company.name.startsWith('ERP G ')) {
                parsed.company.name = parsed.company.name.replace(/^ERP G /, 'ERP-GO ');
              }
              state.db = parsed;
              return;
            }
          } catch (e) {}
        }
        state.db = getSeedDB();
        saveDB(true);
      }

      function saveDB(silent = false) {
        SafeStorage.set(DB_KEY, JSON.stringify(state.db));
        const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const el = document.getElementById('sidebar-sync-time');
        if (el) el.textContent = now;
        if (!silent && syncChannel) {
          try { syncChannel.postMessage({ type: 'DB_UPDATED' }); } catch (e) {}
        }
      }

      function getActiveUser() {
        return state.db.users.find(u => u.id === state.activeUserId) || (signedIn ? demoAccounts().find(u=>u.id===state.activeUserId) : null) || state.db.users[0];
      }

      function getCustomer(id) { return state.db.customers.find(c => c.id === id); }
      function getSalesman(id) { return state.db.salesmen.find(s => s.id === id); }
      function getSupplier(id) { return state.db.suppliers.find(s => s.id === id); }
      function getProduct(id) { return state.db.products.find(p => p.id === id); }

      function getAllCategories() {
        const map = new Map();
        (state.db.categories || []).forEach(c => map.set(c.name, c));
        state.db.products.forEach(p => {
          if (!map.has(p.category)) map.set(p.category, { name: p.category, iconKey: p.iconKey || 'bucket', photo: p.photo || '' });
        });
        return Array.from(map.values());
      }

      function getCategoryMeta(name) {
        return getAllCategories().find(c => c.name === name) || { name, iconKey: 'bucket', photo: '' };
      }

      function matchesPeriod(iso, period) {
        if (!iso || period === 'all') return true;
        if (period === 'daily') return iso === TODAY_ISO;
        const d = new Date(iso + 'T00:00:00');
        if (isNaN(d.getTime())) return true;
        if (period === 'monthly') return d.getFullYear() === TODAY.getFullYear() && d.getMonth() === TODAY.getMonth();
        if (period === 'yearly') return d.getFullYear() === TODAY.getFullYear();
        return true;
      }

      function getFilteredOrders() {
        const f = state.filters;
        const user = getActiveUser();
        return state.db.orders.filter(o => {
          if (user.role === 'Salesman' && user.salesmanId && o.salesmanId !== user.salesmanId) return false;
          if (!matchesPeriod(o.date, f.period)) return false;
          if (f.customerId !== 'all' && o.customerId !== f.customerId) return false;
          if (f.salesmanId !== 'all' && o.salesmanId !== f.salesmanId) return false;
          if (f.route !== 'all' && o.route !== f.route) return false;
          if (f.productId !== 'all' && !o.items.some(i => i.productId === f.productId)) return false;
          if (f.orderStatus !== 'all' && o.status !== f.orderStatus) return false;
          return true;
        });
      }

      /* =======================================================================
         6. SHELL & NAVIGATION RENDERER
         ======================================================================= */
      const NAV_TABS = [
        { id: 'dashboard', label: 'Dashboard', perm: 'dashboard' },
        { id: 'catalogues', label: 'Catalogues', perm: 'catalogues' },
        { id: 'salesApp', label: 'Sales App', perm: 'salesApp' },
        { id: 'purchase', label: 'Purchase', perm: 'purchase' },
        { id: 'reports', label: 'Reports', perm: 'reports' }
      ];

      function navigateTo(tabId) {
        const user = getActiveUser();
        const t = NAV_TABS.find(x => x.id === tabId);
        if (t && !user.permissions[t.perm]) {
          showToast(`Access restricted for ${user.role} role.`, 'warning');
          return;
        }
        state.activeTab = tabId;
        renderApp();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      function switchRole(userId) { signOut(); }

      function triggerManualSync() {
        saveDB();
        showToast('Device DB synced across modules!', 'success');
      }

      function renderShell() {
        const user = getActiveUser();
        const curTab = NAV_TABS.find(t => t.id === state.activeTab);
        if (!curTab || !user.permissions[curTab.perm]) {
          const first = NAV_TABS.find(t => user.permissions[t.perm]);
          if (first) state.activeTab = first.id;
        }

        // Role dropdown
        const roleSel = document.getElementById('role-switcher');
        if (roleSel) {
          roleSel.innerHTML = state.db.users.map(u =>
            `<option value="${u.id}" ${u.id === state.activeUserId ? 'selected' : ''}>${esc(u.role)}</option>`
          ).join('');
        }
        const sideLabel = document.getElementById('sidebar-user-label');
        if (sideLabel) sideLabel.textContent = `${user.name} (${user.role})`;

        const titles = {
          dashboard: 'Management Dashboard',
          catalogues: 'Household Stock Catalogues',
          salesApp: 'Salesman Mobile App',
          purchase: 'Purchase Management (PO)',
          reports: 'Reports & Business Analysis (17)'
        };
        const titleEl = document.getElementById('desktop-page-title');
        if (titleEl) titleEl.textContent = titles[state.activeTab] || 'ERP-GO';

        // Desktop sidebar
        const sideNav = document.getElementById('desktop-sidebar-nav');
        if (sideNav) {
          sideNav.innerHTML = NAV_TABS.map(t => {
            const allowed = user.permissions[t.perm];
            const active = state.activeTab === t.id;
            return `
              <button onclick="ERPG.navigateTo('${t.id}')" class="side-btn ${active ? 'active' : ''} ${!allowed ? 'locked' : ''}">
                <span class="side-btn-left">${ICONS[t.id]} <span>${t.label}</span></span>
                ${!allowed ? ICONS.lock : ''}
              </button>
            `;
          }).join('');
        }

        // Mobile bottom nav
        const bnav = document.getElementById('mobile-bottom-nav');
        const cartQty = state.cart.items.reduce((s, i) => s + i.qty, 0);
        if (bnav) {
          bnav.innerHTML = NAV_TABS.map(t => {
            const allowed = user.permissions[t.perm];
            const active = state.activeTab === t.id;
            const badge = (t.id === 'salesApp' && cartQty > 0) ? `<span class="nav-badge">${cartQty}</span>` : '';
            return `
              <button onclick="ERPG.navigateTo('${t.id}')" class="bnav-btn ${active ? 'active' : ''} ${!allowed ? 'locked' : ''}">
                ${badge}
                ${ICONS[t.id]}
                <span>${t.label}</span>
              </button>
            `;
          }).join('');
        }
      }

      function renderApp() {
        if (!signedIn) return;
        renderShell();
        const main = document.getElementById('app-main');
        if (!main) return;
        if (state.activeTab === 'dashboard') main.innerHTML = renderDashboard();
        else if (state.activeTab === 'catalogues') main.innerHTML = renderCatalogues();
        else if (state.activeTab === 'salesApp') main.innerHTML = renderSalesApp();
        else if (state.activeTab === 'purchase') main.innerHTML = renderPurchase();
        else if (state.activeTab === 'reports') main.innerHTML = renderReports();
      }

      /* =======================================================================
         7. MODULE 1: MANAGEMENT DASHBOARD (#17, #21)
         ======================================================================= */

      function dashboardCashflow() {
        const period = state.filters.period;
        const monthly = period === 'yearly';
        const count = monthly ? 12 : period === 'daily' ? 7 : TODAY.getDate();
        const dates = Array.from({length:count}, (_,i) => monthly ? new Date(TODAY.getFullYear(),i,1) : period === 'daily' ? new Date(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate()-6+i) : new Date(TODAY.getFullYear(),TODAY.getMonth(),i+1));
        const key = d => monthly ? toISODate(d).slice(0,7) : toISODate(d);
        const sum = (rows,d) => rows.filter(r => String(r.date).slice(0,monthly?7:10) === key(d)).reduce((a,r)=>a+(Number(r.amount)||0),0);
        const incoming = dates.map(d=>sum(state.db.collections,d));
        const outgoing = dates.map(d=>sum(state.db.expenses,d));
        const max = Math.max(1,...incoming,...outgoing);
        const x = i => 36+i*310/Math.max(1,count-1);
        const y = n => 112-n/max*88;
        const line = values => values.map((v,i)=>x(i)+','+y(v)).join(' ');
        return `<section class="card dash-panel"><div class="dash-heading"><div><h2>Cash flow</h2><p>Recorded collections and operating expenses · ${period==='daily'?'Last 7 days':period==='monthly'?'Month to date':'This year'}</p></div></div>
          <div class="dash-legend"><span><i></i> Collections</span><span><i></i> Expenses</span></div>
          <svg class="dash-chart" viewBox="0 0 360 144" role="img" aria-label="Collections and operating expenses line graph">
          ${[0,.5,1].map(v=>`<line x1="36" x2="346" y1="${y(v*max)}" y2="${y(v*max)}" stroke="#e4e7e6"/><text x="32" y="${y(v*max)+3}" text-anchor="end">${v===0?'0':max>=1000?(v*max/1000).toFixed(1)+'k':Math.round(v*max)}</text>`).join('')}
          <polyline points="${line(incoming)}" fill="none" stroke="#059669" stroke-width="2" stroke-linejoin="round"/><polyline points="${line(outgoing)}" fill="none" stroke="#626765" stroke-width="2" stroke-linejoin="round"/>
          ${dates.map((d,i)=>`<circle cx="${x(i)}" cy="${y(incoming[i])}" r="2" fill="#059669"><title>${key(d)}: ${fmtINR(incoming[i])}</title></circle><circle cx="${x(i)}" cy="${y(outgoing[i])}" r="2" fill="#626765"><title>${key(d)}: ${fmtINR(outgoing[i])}</title></circle>`).join('')}
          ${dates.map((d,i)=>i===0||i===count-1||i%Math.ceil(count/5)===0?`<text x="${x(i)}" y="132" text-anchor="middle">${monthly?MONTHS[d.getMonth()]:d.getDate()+' '+MONTHS[d.getMonth()]}</text>`:'').join('')}</svg>
          <p class="dash-note">Operating cash movement only; excludes unrecorded payments and opening balances.</p></section>`;
      }
      function dashboardActivities(orders) {
        const rows = [...orders.map(o=>({date:o.date,title:'Sales order',detail:o.id,amount:o.total})),...state.db.collections.map(o=>({date:o.date,title:'Collection received',detail:o.id,amount:o.amount})),...state.db.expenses.map(o=>({date:o.date,title:'Operating expense',detail:o.category,amount:-o.amount}))].filter(o=>matchesPeriod(o.date,state.filters.period)).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,6);
        return `<section class="card dash-panel"><div class="dash-heading"><div><h2>Recent activities</h2><p>Latest recorded transactions</p></div></div>${rows.length?rows.map(o=>`<div class="dash-activity"><div class="dash-activity-icon">${o.amount<0?`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>`:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m17 7-10 10M17 17H7V7"/></svg>`}</div><div class="dash-activity-copy"><strong>${esc(o.title)}</strong><small>${esc(o.detail)} · ${esc(fmtDate(o.date))}</small></div><strong>${fmtINR(o.amount)}</strong></div>`).join(''):'<p class="dash-note">No recorded activities for this period.</p>'}</section>`;
      }
      function renderDashboard() {
        const orders = getFilteredOrders();
        const totalSales = orders.reduce((s, o) => s + o.total, 0);
        const grossProfit = orders.reduce((s, o) => s + o.profit, 0);
        const expenses = state.db.expenses.filter(e => matchesPeriod(e.date, state.filters.period)).reduce((s, e) => s + e.amount, 0);
        const netProfit = grossProfit - expenses;
        const collections = state.db.collections.filter(c => matchesPeriod(c.date, state.filters.period)).reduce((s, c) => s + c.amount, 0);
        const outstanding = state.db.customers.reduce((s, c) => s + c.outstanding, 0);
        const stockVal = state.db.products.reduce((s, p) => s + (p.stock * p.costPrice), 0);
        const pendingOrders = state.db.orders.filter(o => o.status === 'Pending');
        const canProfit = getActiveUser().permissions.viewProfit;

        const badgeClass = {
          Pending: 'badge-amber',
          Approved: 'badge-blue',
          Dispatched: 'badge-charcoal',
          Delivered: 'badge-emerald'
        };

        return `
          <div class="stack erp-dashboard">
            <section class="dash-welcome"><div><p>Business workspace</p><h1>Welcome M/s Lotus Enterprises.</h1><p>Here is your business overview.</p></div><time datetime="${TODAY_ISO}">${esc(fmtDate(TODAY_ISO))}</time></section>
            <!-- Period Filter Bar + Export Summary -->
            <div class="card dash-filter">
              <div class="dash-period" role="group" aria-label="Reporting period">
                ${['daily', 'monthly', 'yearly'].map(p => `
                  <button onclick="ERPG.setFilter('period','${p}')" class="btn btn-sm ${state.filters.period === p ? 'btn-primary' : 'btn-outline'}" style="text-transform:capitalize;">${p}</button>
                `).join('')}
              </div>
              <button onclick="ERPG.exportDashboardSummary()" class="btn btn-sm btn-charcoal dash-export" aria-label="Export summary" title="Export summary">
                ${ICONS.download}<span>Export</span>
              </button>
            </div>

            <!-- 2-Col Mobile / 4-Col Desktop KPI Grid (8 Mini-Cards) -->
            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-label"><span>Total Sales</span><span class="badge badge-emerald">${orders.length} ord</span></div>
                <div class="kpi-value">${fmtINR(totalSales)}</div>
                <div class="kpi-sub">Incl. GST (${state.filters.period})</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label"><span>Gross Profit</span><span class="badge badge-emerald">Margin</span></div>
                <div class="kpi-value text-emerald">${canProfit ? fmtINR(grossProfit) : 'Restricted'}</div>
                <div class="kpi-sub">Revenue minus COGS</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label"><span>Net Profit</span><span class="badge ${netProfit >= 0 ? 'badge-emerald' : 'badge-rose'}">P&amp;L</span></div>
                <div class="kpi-value ${netProfit >= 0 ? 'text-emerald' : 'text-rose'}">${canProfit ? fmtINR(netProfit) : 'Restricted'}</div>
                <div class="kpi-sub">After operating expenses</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label"><span>Expenses</span><span class="badge badge-amber">Outflow</span></div>
                <div class="kpi-value">${fmtINR(expenses)}</div>
                <div class="kpi-sub">Logistics, rent &amp; bata</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label"><span>Collections</span><span class="badge badge-emerald">Inflow</span></div>
                <div class="kpi-value text-emerald">${fmtINR(collections)}</div>
                <div class="kpi-sub">UPI, NEFT, Cash &amp; Cheque</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label"><span>Outstanding</span><span class="badge badge-rose">Due</span></div>
                <div class="kpi-value text-rose">${fmtINR(outstanding)}</div>
                <div class="kpi-sub">${state.db.customers.length} active parties</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label"><span>Stock Value</span><span class="badge badge-muted">${state.db.products.length} SKUs</span></div>
                <div class="kpi-value">${fmtINR(stockVal)}</div>
                <div class="kpi-sub">At purchase cost</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label"><span>Pending Orders</span><span class="badge badge-amber">Action</span></div>
                <div class="kpi-value text-amber">${pendingOrders.length}</div>
                <div class="kpi-sub">Awaiting approval</div>
              </div>
            </div>

            <!-- Quick Action Bar -->
            <div class="card card-pad flex flex-wrap items-center gap-2">
              <button onclick="ERPG.quickAction('newOrder')" class="btn btn-primary">${ICONS.plus} New Sales Order</button>
              <button onclick="ERPG.navigateTo('catalogues')" class="btn btn-soft-emerald">${ICONS.catalogues} Browse Catalogues</button>
              <button onclick="ERPG.navigateTo('purchase')" class="btn btn-outline">${ICONS.purchase} New Purchase Order</button>
              <button onclick="ERPG.quickAction('gps')" class="btn btn-charcoal">${ICONS.mapPin} GPS Check-In</button>
            </div>

            <div class="dash-insights">${dashboardCashflow()}${dashboardActivities(orders)}</div>
            <!-- Live Salesman Orders Feed (#21) -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h2 style="font-size:15px;">Live Salesman Orders Feed</h2>
                  <p class="text-xs text-muted">Real-time view of all orders — click status to advance workflow</p>
                </div>
                <span class="badge badge-emerald">● Live Sync</span>
              </div>
              <div class="card-pad stack-sm">
                ${state.db.orders.slice(0, 8).map(o => {
                  const cust = getCustomer(o.customerId);
                  const sm = getSalesman(o.salesmanId);
                  return `
                    <div class="card card-pad flex flex-wrap items-center justify-between gap-2" style="background:var(--bg-surface);">
                      <div class="min-w-0" style="flex:1 1 220px;">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-heading font-bold">${esc(o.id)}</span>
                          <span class="text-xs text-muted">${fmtDate(o.date)}</span>
                          <span class="badge badge-muted">${esc(o.route)}</span>
                        </div>
                        <div class="text-sm font-bold mt-1">${esc(cust ? cust.name : o.customerId)}</div>
                        <div class="text-xs text-secondary">Salesman: ${esc(sm ? sm.name : o.salesmanId)} • ${o.items.length} item(s)</div>
                      </div>
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-heading font-bold" style="font-size:15px;margin-right:4px;">${fmtINR(o.total)}</span>
                        <button onclick="ERPG.cycleOrderStatus('${o.id}')" class="badge ${badgeClass[o.status] || 'badge-muted'}" title="Click to cycle status" style="cursor:pointer;">${esc(o.status)} ↻</button>
                        <button onclick="ERPG.openPrintOrderModal('${o.id}')" class="btn btn-sm btn-outline">${ICONS.print} Print</button>
                        <button onclick="ERPG.sendOrderWA('${o.id}')" class="btn btn-sm btn-wa">${ICONS.wa} WA</button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        `;
      }

      function exportDashboardSummary() {
        const rep = buildReportData('mgmt_summary');
        exportCSV('ERP_GO_Management_Summary', rep.headers, rep.rows);
      }

      function quickAction(type) {
        if (type === 'newOrder') {
          state.salesSubTab = 'order';
          navigateTo('salesApp');
        } else if (type === 'gps') {
          state.salesSubTab = 'gps';
          navigateTo('salesApp');
        }
      }

      /* =======================================================================
         8. MODULE 2: CATALOGUES (HOUSEHOLD ITEMS + PHOTO UPLOAD)
         ======================================================================= */
      function renderCatalogues() {
        const categories = getAllCategories();

        // Category Cards Overview
        if (!state.catalogueCategory) {
          return `
            <div class="stack">
              <div class="card card-pad flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span class="badge badge-emerald">Household &amp; Plasticware Stock</span>
                  <h2 style="font-size:18px;margin-top:4px;">Stock Catalogues (${categories.length} Categories)</h2>
                  <p class="text-xs text-secondary">Select a category and click <strong>Go →</strong> to inspect stock, edit photos, or add items to a Sales Order.</p>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                  <button onclick="ERPG.openAddCategoryModal()" class="btn btn-outline">${ICONS.plus} Category</button>
                  <button onclick="ERPG.openProductModal(null)" class="btn btn-primary">${ICONS.plus} Add Stock Item</button>
                </div>
              </div>

              <div class="cat-grid">
                ${categories.map(cat => {
                  const items = state.db.products.filter(p => p.category === cat.name);
                  const qty = items.reduce((s, p) => s + p.stock, 0);
                  const val = items.reduce((s, p) => s + (p.stock * p.costPrice), 0);
                  return `
                    <div class="card" style="overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;">
                      <div>
                        <div onclick="ERPG.openCatalogueCategory('${esc(cat.name)}')" style="height:126px;background:var(--bg-subtle);position:relative;cursor:pointer;overflow:hidden;">
                          ${cat.photo
                            ? `<img src="${esc(cat.photo)}" alt="${esc(cat.name)}" style="width:100%;height:100%;object-fit:cover;" />`
                            : `<div style="width:100%;height:100%;padding:14px;display:flex;align-items:center;justify-content:center;">${getHouseholdSVG(cat.iconKey)}</div>`
                          }
                          <span class="badge badge-charcoal" style="position:absolute;top:8px;right:8px;">${items.length} Items</span>
                        </div>
                        <div style="padding:11px 12px 6px 12px;">
                          <h3 class="truncate" style="font-size:14px;">${esc(cat.name)}</h3>
                          <div class="text-xs text-secondary mt-1">Stock: <strong>${qty}</strong> pcs</div>
                          <div class="text-xs text-emerald font-bold">${fmtINR(val)}</div>
                        </div>
                      </div>
                      <div style="padding:8px 12px 12px 12px;display:flex;gap:6px;">
                        <button onclick="ERPG.openCatalogueCategory('${esc(cat.name)}')" class="btn btn-sm btn-primary flex-1">Go →</button>
                        <button onclick="ERPG.openEditCatPhotoModal('${esc(cat.name)}')" class="btn btn-sm btn-outline" title="Edit Category Photo">${ICONS.camera}</button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }

        // Category Drill-down Item List
        const catMeta = getCategoryMeta(state.catalogueCategory);
        const items = state.db.products.filter(p =>
          p.category === state.catalogueCategory &&
          (!state.catalogueSearch || p.name.toLowerCase().includes(state.catalogueSearch.toLowerCase()) || p.sku.toLowerCase().includes(state.catalogueSearch.toLowerCase()))
        );

        return `
          <div class="stack">
            <div class="card card-pad flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <button onclick="ERPG.openCatalogueCategory(null)" class="btn btn-sm btn-outline">← Categories</button>
                ${renderPhoto(catMeta.photo, catMeta.iconKey, 42)}
                <div>
                  <div class="text-xs font-bold text-emerald">STOCK CATEGORY</div>
                  <h2 style="font-size:16px;">${esc(state.catalogueCategory)} (${items.length})</h2>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <input class="input input-sm" style="width:170px;" value="${esc(state.catalogueSearch)}" oninput="ERPG.setCatSearch(this.value)" placeholder="Search item / SKU..." />
                <button onclick="ERPG.openProductModal(null, '${esc(state.catalogueCategory)}')" class="btn btn-sm btn-primary">${ICONS.plus} Add Item</button>
                <button onclick="ERPG.goToOrderWithCat('${esc(state.catalogueCategory)}')" class="btn btn-sm btn-charcoal">Order Form (${state.cart.items.length})</button>
              </div>
            </div>

            <div class="grid-3">
              ${items.map(p => {
                const stkBadge = p.stock <= 0 ? 'badge-rose' : p.stock <= p.reorderLevel ? 'badge-amber' : 'badge-emerald';
                return `
                  <div class="card card-pad flex flex-col justify-between" style="display:flex;flex-direction:column;gap:10px;">
                    <div class="flex gap-3">
                      <div onclick="ERPG.addToCart('${p.id}')" style="cursor:pointer;" title="Click to add to order">
                        ${renderPhoto(p.photo, p.iconKey, 72)}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between gap-1">
                          <span class="text-xs font-bold text-muted">${esc(p.sku)}</span>
                          <span class="badge ${stkBadge}">Stock: ${p.stock}</span>
                        </div>
                        <h3 style="font-size:13.5px;margin-top:3px;line-height:1.3;">${esc(p.name)}</h3>
                        <div class="text-xs text-muted mt-1">Options: ${esc((p.options || []).join(', '))}</div>
                        <div class="flex items-center justify-between mt-2">
                          <span class="font-heading font-bold" style="font-size:15px;">${fmtINR(p.sellPrice)}</span>
                          <span class="text-xs text-secondary">Cost: ${fmtINR(p.costPrice)} • GST ${p.gst}%</span>
                        </div>
                        <div class="text-xs text-muted mt-1">Stock Age: ${p.stockAgeDays} days</div>
                      </div>
                    </div>
                    <div class="flex gap-2" style="padding-top:8px;border-top:1px solid var(--border);">
                      <button onclick="ERPG.addToCart('${p.id}')" ${p.stock <= 0 ? 'disabled' : ''} class="btn btn-sm btn-primary flex-1">${ICONS.plus} Add to Order</button>
                      <button onclick="ERPG.openProductModal('${p.id}')" class="btn btn-sm btn-outline">${ICONS.camera} Edit / Photo</button>
                    </div>
                  </div>
                `;
              }).join('') || `<div class="card card-pad text-muted text-sm" style="grid-column:1/-1;text-align:center;">No items found in this category.</div>`}
            </div>
          </div>
        `;
      }

      /* =======================================================================
         9. MODULE 3: SALESMAN MOBILE APP (#19–#24)
         ======================================================================= */
      function renderSalesApp() {
        const subTabs = [
          { id: 'order', label: 'Take Order' },
          { id: 'customers', label: 'Customers' },
          { id: 'orders', label: 'Orders' },
          { id: 'gps', label: 'GPS Live' }
        ];

        let content = '';
        if (state.salesSubTab === 'order') content = renderTakeOrderTab();
        else if (state.salesSubTab === 'customers') content = renderCustomersTab();
        else if (state.salesSubTab === 'orders') content = renderOrdersListTab();
        else if (state.salesSubTab === 'gps') content = renderGPSTab();

        return `
          <div class="stack">
            <div class="tab-bar no-scrollbar">
              ${subTabs.map(t => `
                <button onclick="ERPG.setSalesSubTab('${t.id}')" class="tab-btn ${state.salesSubTab === t.id ? 'active-emerald' : ''}">${t.label}</button>
              `).join('')}
            </div>
            ${content}
          </div>
        `;
      }

      function computeCartTotals() {
        let rawSub = 0, totalTax = 0, costTotal = 0;
        state.cart.items.forEach(it => {
          const lineAmt = it.unitPrice * it.qty;
          costTotal += (it.costPrice || 0) * it.qty;
          if (state.cart.gstMode === 'inclusive') {
            const base = lineAmt / (1 + it.gst / 100);
            rawSub += base;
            totalTax += (lineAmt - base);
          } else {
            rawSub += lineAmt;
            totalTax += (lineAmt * it.gst) / 100;
          }
        });
        const discVal = Math.max(0, Number(state.cart.discountVal) || 0);
        const discountAmt = state.cart.discountType === 'pct'
          ? Math.round((rawSub * Math.min(100, discVal)) / 100)
          : Math.min(rawSub, discVal);
        const taxableAfterDisc = Math.max(0, rawSub - discountAmt);
        const ratio = rawSub > 0 ? taxableAfterDisc / rawSub : 1;
        const tax = Math.round(totalTax * ratio);
        const cgst = Math.round(tax / 2);
        const sgst = tax - cgst;
        const grandTotal = Math.round(taxableAfterDisc + tax);
        const profit = Math.round(taxableAfterDisc - costTotal);
        return {
          subtotal: Math.round(rawSub),
          discountAmt: Math.round(discountAmt),
          taxable: Math.round(taxableAfterDisc),
          tax, cgst, sgst, grandTotal,
          costTotal: Math.round(costTotal),
          profit
        };
      }

      function renderTakeOrderTab() {
        const user = getActiveUser();
        if (user.salesmanId) state.cart.salesmanId = user.salesmanId;
        const cust = getCustomer(state.cart.customerId) || state.db.customers[0];
        if (cust) state.cart.customerId = cust.id;

        const categories = getAllCategories();
        const visibleProducts = state.salesOrderCategory === 'all'
          ? state.db.products
          : state.db.products.filter(p => p.category === state.salesOrderCategory);

        const totals = computeCartTotals();
        const overLimit = cust && (cust.outstanding + totals.grandTotal > cust.creditLimit);

        return `
          <div class="split-order">
            <!-- LEFT: Customer + Category Photo Strip + Item Photo Cards -->
            <div class="stack">
              <!-- Customer & Credit Alert Card -->
              <div class="card card-pad stack-sm">
                <div class="grid-2" style="gap:10px;">
                  <div>
                    <label class="field-label">Customer</label>
                    <select class="select" onchange="ERPG.setCartField('customerId', this.value)">
                      ${state.db.customers.map(c => `<option value="${c.id}" ${c.id === state.cart.customerId ? 'selected' : ''}>${esc(c.name)} (${esc(c.route)})</option>`).join('')}
                    </select>
                  </div>
                  <div>
                    <label class="field-label">Salesman</label>
                    <select class="select" ${user.salesmanId ? 'disabled' : ''} onchange="ERPG.setCartField('salesmanId', this.value)">
                      ${state.db.salesmen.map(s => `<option value="${s.id}" ${s.id === state.cart.salesmanId ? 'selected' : ''}>${esc(s.name)} • ${esc(s.route)}</option>`).join('')}
                    </select>
                  </div>
                </div>
                ${cust ? `
                  <div style="padding:9px 10px;border-radius:var(--radius-sm);background:${overLimit ? 'var(--rose-soft)' : 'var(--bg-surface)'};border:1px solid ${overLimit ? 'var(--rose-border)' : 'var(--border)'};display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;font-size:12px;">
                    <div>
                      <span class="text-muted">Route:</span> <strong>${esc(cust.route)}</strong>
                      <span class="text-muted" style="margin:0 5px;">|</span>
                      <span class="text-muted">Ph:</span> <strong>${esc(cust.phone)}</strong>
                      <span class="text-muted" style="margin:0 5px;">|</span>
                      <span class="text-muted">Due:</span> <strong class="${overLimit ? 'text-rose' : ''}">${fmtINR(cust.outstanding)}</strong> / ${fmtINR(cust.creditLimit)}
                    </div>
                    ${overLimit
                      ? `<span class="badge badge-rose">Credit Limit Exceeded!</span>`
                      : `<span class="badge badge-emerald">✓ Credit OK</span>`}
                  </div>
                ` : ''}
              </div>

              <!-- Visual Category Photo Strip -->
              <div class="card card-pad stack-sm">
                <div class="flex items-center justify-between">
                  <span class="field-label" style="margin:0;">Select Category Photo</span>
                  <button onclick="ERPG.navigateTo('catalogues')" class="text-xs font-bold text-emerald">Full Catalogues →</button>
                </div>
                <div class="cat-strip no-scrollbar">
                  <button onclick="ERPG.setSalesOrderCat('all')" class="cat-strip-card ${state.salesOrderCategory === 'all' ? 'active' : ''}">
                    <div class="photo-box" style="width:44px;height:44px;margin:0 auto 5px auto;background:var(--emerald-soft);color:var(--emerald-dark);">${ICONS.catalogues}</div>
                    <div class="text-xs font-bold truncate">All Items</div>
                    <div style="font-size:10px;" class="text-muted">${state.db.products.length} SKUs</div>
                  </button>
                  ${categories.map(cat => {
                    const cnt = state.db.products.filter(p => p.category === cat.name).length;
                    return `
                      <button onclick="ERPG.setSalesOrderCat('${esc(cat.name)}')" class="cat-strip-card ${state.salesOrderCategory === cat.name ? 'active' : ''}">
                        <div style="margin:0 auto 5px auto;width:44px;height:44px;">${renderPhoto(cat.photo, cat.iconKey, 44)}</div>
                        <div class="text-xs font-bold truncate">${esc(cat.name)}</div>
                        <div style="font-size:10px;" class="text-muted">${cnt} items</div>
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Category-Filtered Item Grid with Photos (Click to Add) -->
              <div class="grid-2" style="gap:10px;">
                ${visibleProducts.map(p => {
                  const stkCls = p.stock <= 0 ? 'badge-rose' : p.stock <= p.reorderLevel ? 'badge-amber' : 'badge-emerald';
                  return `
                    <div onclick="ERPG.addToCart('${p.id}')" class="card card-pad" style="cursor:pointer;display:flex;gap:10px;align-items:center;transition:border-color 0.15s;" title="Click to add to Editable Order Form">
                      ${renderPhoto(p.photo, p.iconKey, 60)}
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between gap-1">
                          <span class="text-xs font-bold text-muted">${esc(p.sku)}</span>
                          <span class="badge ${stkCls}">Stk: ${p.stock}</span>
                        </div>
                        <div class="font-bold text-sm mt-1" style="line-height:1.25;">${esc(p.name)}</div>
                        <div class="flex items-center justify-between mt-1">
                          <span class="font-heading font-bold text-emerald" style="font-size:14px;">${fmtINR(p.sellPrice)}</span>
                          <span class="badge badge-charcoal">+ Add</span>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- RIGHT: Editable Sales Order Form -->
            <div class="card card-pad stack-sm" style="position:sticky;top:72px;">
              <div class="flex items-center justify-between" style="padding-bottom:8px;border-bottom:1px solid var(--border);">
                <div>
                  <h3 style="font-size:15px;">Editable Sales Order Form (${state.cart.items.length})</h3>
                  <div class="text-xs text-muted">Date: ${fmtDate(state.cart.date)} • Edit Option, Rate &amp; Qty inline</div>
                </div>
                ${state.cart.items.length ? `<button onclick="ERPG.clearCart()" class="text-xs font-bold text-rose">Clear</button>` : ''}
              </div>

              ${state.cart.items.length === 0
                ? `<div class="text-muted text-xs" style="padding:26px 10px;text-align:center;">Tap any household item card on the left to add it to this editable sales order form.</div>`
                : `
                  <div class="stack-sm" style="max-height:310px;overflow-y:auto;padding-right:2px;">
                    ${state.cart.items.map((item, idx) => {
                      const prod = getProduct(item.productId);
                      const opts = (prod && prod.options && prod.options.length) ? prod.options : [item.option];
                      const lineVal = Math.round(item.unitPrice * item.qty);
                      return `
                        <div class="order-line">
                          <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2 min-w-0">
                              ${renderPhoto(prod ? prod.photo : '', prod ? prod.iconKey : 'bucket', 34)}
                              <div class="min-w-0">
                                <div class="text-xs font-bold truncate">${esc(item.name)}</div>
                                <div style="font-size:10.5px;" class="text-muted">GST ${item.gst}% • Line: <strong style="color:var(--charcoal);">${fmtINR(lineVal)}</strong></div>
                              </div>
                            </div>
                            <button onclick="ERPG.removeCartItem(${idx})" class="text-rose font-bold" style="padding:2px 6px;">✕</button>
                          </div>
                          <div class="flex items-center gap-2 flex-wrap">
                            <select class="select select-sm" style="flex:1 1 92px;" onchange="ERPG.editCartLine(${idx},'option',this.value)">
                              ${opts.map(o => `<option value="${esc(o)}" ${o === item.option ? 'selected' : ''}>${esc(o)}</option>`).join('')}
                            </select>
                            <div style="width:78px;">
                              <input type="number" min="1" class="input input-sm" value="${item.unitPrice}" onchange="ERPG.editCartLine(${idx},'unitPrice',this.value)" title="Unit Rate (₹)" />
                            </div>
                            <div class="stepper">
                              <button type="button" onclick="ERPG.stepCartQty(${idx},-1)">−</button>
                              <input type="number" min="1" value="${item.qty}" onchange="ERPG.editCartLine(${idx},'qty',this.value)" />
                              <button type="button" onclick="ERPG.stepCartQty(${idx},1)">+</button>
                            </div>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>

                  <!-- Discount, GST Mode & Date -->
                  <div class="grid-2" style="gap:8px;padding-top:6px;border-top:1px solid var(--border);">
                    <div>
                      <label class="field-label">Discount</label>
                      <div class="flex gap-1">
                        <select class="select select-sm" style="width:58px;" onchange="ERPG.setCartField('discountType',this.value)">
                          <option value="flat" ${state.cart.discountType === 'flat' ? 'selected' : ''}>₹</option>
                          <option value="pct" ${state.cart.discountType === 'pct' ? 'selected' : ''}>%</option>
                        </select>
                        <input type="number" min="0" class="input input-sm" value="${state.cart.discountVal}" onchange="ERPG.setCartField('discountVal',this.value)" />
                      </div>
                    </div>
                    <div>
                      <label class="field-label">GST Mode</label>
                      <select class="select select-sm" onchange="ERPG.setCartField('gstMode',this.value)">
                        <option value="exclusive" ${state.cart.gstMode === 'exclusive' ? 'selected' : ''}>Exclusive (+GST)</option>
                        <option value="inclusive" ${state.cart.gstMode === 'inclusive' ? 'selected' : ''}>Inclusive (Incl.)</option>
                      </select>
                    </div>
                  </div>

                  <div class="grid-2" style="gap:8px;">
                    <div>
                      <label class="field-label">Order Date</label>
                      <input type="date" class="input input-sm" value="${state.cart.date}" onchange="ERPG.setCartField('date',this.value)" />
                    </div>
                    <div>
                      <label class="field-label">Notes</label>
                      <input class="input input-sm" value="${esc(state.cart.notes)}" oninput="ERPG.setCartFieldSilent('notes',this.value)" placeholder="Delivery / payment terms" />
                    </div>
                  </div>

                  <!-- Totals Summary Box -->
                  <div style="padding:11px 12px;border-radius:var(--radius-md);background:var(--charcoal);color:#FFFFFF;font-size:12px;" class="stack-sm">
                    <div class="flex justify-between"><span>Taxable Subtotal</span><span>${fmtINR(totals.subtotal)}</span></div>
                    ${totals.discountAmt > 0 ? `<div class="flex justify-between" style="color:#FDE68A;"><span>Discount</span><span>- ${fmtINR(totals.discountAmt)}</span></div>` : ''}
                    <div class="flex justify-between" style="color:#CBD5E1;"><span>CGST + SGST</span><span>${fmtINR(totals.cgst)} + ${fmtINR(totals.sgst)}</span></div>
                    <div class="flex justify-between font-heading font-bold" style="font-size:16px;padding-top:6px;border-top:1px solid #374151;color:#34D399;">
                      <span>Grand Total</span><span>${fmtINR(totals.grandTotal)}</span>
                    </div>
                  </div>

                  <!-- Primary Action Buttons -->
                  <div class="stack-sm">
                    <button onclick="ERPG.submitOrder(false)" class="btn btn-block btn-primary">Save &amp; Sync Order</button>
                    <div class="flex gap-2">
                      <button onclick="ERPG.previewDraftEstimate()" class="btn btn-outline flex-1">${ICONS.print} Preview / Print</button>
                      <button onclick="ERPG.submitOrder(true)" class="btn btn-wa flex-1">${ICONS.wa} Send Estimate WA</button>
                    </div>
                  </div>
                `}
            </div>
          </div>
        `;
      }

      function renderCustomersTab() {
        const q = state.customerSearch.toLowerCase();
        const list = state.db.customers.filter(c =>
          !q || c.name.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q) || c.route.toLowerCase().includes(q) || c.phone.includes(q)
        );
        return `
          <div class="stack">
            <div class="card card-pad flex flex-wrap items-center justify-between gap-2">
              <input class="input" style="max-width:280px;" value="${esc(state.customerSearch)}" oninput="ERPG.setCustomerSearch(this.value)" placeholder="Search customer, route, phone..." />
              <button onclick="ERPG.openAddCustomerModal()" class="btn btn-primary">${ICONS.plus} Add Customer</button>
            </div>

            <div class="grid-2">
              ${list.map(c => `
                <div class="card card-pad stack-sm">
                  <div class="flex justify-between gap-2">
                    <div class="min-w-0">
                      <h3 style="font-size:14.5px;">${esc(c.name)}</h3>
                      <div class="text-xs text-secondary">${esc(c.contact)} • +91 ${esc(c.phone)}</div>
                      <div class="flex items-center gap-1 mt-1 flex-wrap">
                        <span class="badge badge-muted">${esc(c.route)}</span>
                        <span class="text-xs text-muted">Limit: ${fmtINR(c.creditLimit)}</span>
                      </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                      <div style="font-size:10px;font-weight:700;" class="text-muted">OUTSTANDING</div>
                      <div class="font-heading font-bold ${c.outstanding > c.creditLimit * 0.7 ? 'text-rose' : 'text-amber'}" style="font-size:15px;">${fmtINR(c.outstanding)}</div>
                      <div style="font-size:10px;" class="text-muted">${c.overdueDays}d aging</div>
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center justify-between gap-2" style="padding-top:8px;border-top:1px solid var(--border);">
                    <div class="flex gap-1 flex-wrap">
                      <a href="tel:+91${esc(c.phone)}" class="btn btn-sm btn-outline">${ICONS.phone} Call</a>
                      <a href="https://wa.me/91${esc(c.phone)}" target="_blank" rel="noopener" class="btn btn-sm btn-wa">${ICONS.wa} WA</a>
                      ${c.lat && c.lng ? `<a href="https://maps.google.com/?q=${c.lat},${c.lng}" target="_blank" rel="noopener" class="btn btn-sm btn-outline">${ICONS.mapPin} Map</a>` : ''}
                    </div>
                    <div class="flex gap-1">
                      <button onclick="ERPG.startOrderForCustomer('${c.id}')" class="btn btn-sm btn-primary">Start Order</button>
                      <button onclick="ERPG.openCollectPaymentModal('${c.id}')" class="btn btn-sm btn-soft-emerald">+ Collect</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      function renderOrdersListTab() {
        const orders = getFilteredOrders();
        const badgeClass = { Pending: 'badge-amber', Approved: 'badge-blue', Dispatched: 'badge-charcoal', Delivered: 'badge-emerald' };
        return `
          <div class="stack">
            <div class="card card-pad flex flex-wrap gap-2">
              <select class="select select-sm" style="width:auto;" onchange="ERPG.setFilter('salesmanId',this.value)">
                <option value="all">All Salesmen</option>
                ${state.db.salesmen.map(s => `<option value="${s.id}" ${state.filters.salesmanId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
              </select>
              <select class="select select-sm" style="width:auto;" onchange="ERPG.setFilter('route',this.value)">
                <option value="all">All Routes</option>
                ${state.db.routes.map(r => `<option value="${esc(r)}" ${state.filters.route === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}
              </select>
              <select class="select select-sm" style="width:auto;" onchange="ERPG.setFilter('orderStatus',this.value)">
                <option value="all">All Statuses</option>
                ${['Pending', 'Approved', 'Dispatched', 'Delivered'].map(st => `<option value="${st}" ${state.filters.orderStatus === st ? 'selected' : ''}>${st}</option>`).join('')}
              </select>
            </div>

            <div class="stack-sm">
              ${orders.map(o => {
                const cust = getCustomer(o.customerId);
                const sm = getSalesman(o.salesmanId);
                return `
                  <div class="card card-pad flex flex-wrap items-center justify-between gap-3">
                    <div class="min-w-0" style="flex:1 1 240px;">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-heading font-bold">${esc(o.id)}</span>
                        <span class="text-xs text-muted">${fmtDate(o.date)}</span>
                        <span class="badge badge-muted">${esc(o.route)}</span>
                      </div>
                      <div class="font-bold text-sm mt-1">${esc(cust ? cust.name : o.customerId)} <span class="text-xs text-muted font-normal">• ${esc(sm ? sm.name : o.salesmanId)}</span></div>
                      <div class="text-xs text-secondary mt-1">${o.items.map(i => `${i.qty}× ${i.name} (${i.option})`).join(', ')}</div>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-heading font-bold" style="font-size:15px;">${fmtINR(o.total)}</span>
                      <button onclick="ERPG.cycleOrderStatus('${o.id}')" class="badge ${badgeClass[o.status] || 'badge-muted'}" style="cursor:pointer;">${esc(o.status)} ↻</button>
                      <button onclick="ERPG.openPrintOrderModal('${o.id}')" class="btn btn-sm btn-outline">${ICONS.print} Estimate</button>
                      <button onclick="ERPG.sendOrderWA('${o.id}')" class="btn btn-sm btn-wa">${ICONS.wa} WA</button>
                    </div>
                  </div>
                `;
              }).join('') || `<div class="card card-pad text-muted text-xs" style="text-align:center;">No orders match current filters.</div>`}
            </div>
          </div>
        `;
      }

      function renderGPSTab() {
        return `
          <div class="stack">
            <div class="card card-pad flex flex-wrap items-center justify-between gap-3" style="background:var(--charcoal);color:#FFFFFF;border-color:var(--charcoal);">
              <div>
                <span class="badge badge-emerald">● Live Field Tracking</span>
                <h3 style="color:#FFFFFF;font-size:16px;margin-top:6px;">Salesman GPS Check-In &amp; Route Radar</h3>
                <p style="font-size:12px;color:#CBD5E1;">Log active salesman GPS coordinates with timestamp and open live pins in Google Maps.</p>
              </div>
              <button onclick="ERPG.checkInGPS()" class="btn btn-primary">${ICONS.mapPin} Check-In My Live GPS</button>
            </div>

            <div class="grid-2">
              ${state.db.salesmen.map(s => {
                const smOrders = state.db.orders.filter(o => o.salesmanId === s.id);
                const smTotal = smOrders.reduce((sum, o) => sum + o.total, 0);
                return `
                  <div class="card card-pad stack-sm">
                    <div class="flex items-center justify-between gap-2">
                      <div>
                        <h3 style="font-size:14.5px;">${esc(s.name)}</h3>
                        <div class="text-xs text-secondary">${esc(s.route)} • +91 ${esc(s.phone)}</div>
                      </div>
                      <span class="badge ${s.status === 'Online' || s.status === 'On Route' ? 'badge-emerald' : 'badge-muted'}">${esc(s.status)}</span>
                    </div>
                    <div style="padding:9px 10px;border-radius:var(--radius-sm);background:var(--bg-surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:8px;">
                      <div class="text-xs">
                        <div class="text-muted">Coordinates: <strong>${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}</strong></div>
                        <div class="text-muted">Last Check-In: <strong>${esc(s.lastCheckIn)}</strong></div>
                      </div>
                      <a href="https://maps.google.com/?q=${s.lat},${s.lng}" target="_blank" rel="noopener" class="btn btn-sm btn-primary">${ICONS.mapPin} Maps</a>
                    </div>
                    <div class="flex justify-between text-xs text-secondary">
                      <span>Orders: <strong>${smOrders.length}</strong></span>
                      <span>Achieved: <strong class="text-emerald">${fmtINR(smTotal)}</strong></span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      /* =======================================================================
         10. MODULE 4: PURCHASE MANAGEMENT (#18)
         ======================================================================= */
      function renderPurchase() {
        const sub = state.poDraft.items.reduce((s, i) => s + (i.qty * i.rate), 0);
        const tax = state.poDraft.items.reduce((s, i) => s + ((i.qty * i.rate * i.gst) / 100), 0);
        const total = Math.round(sub + tax);

        return `
          <div class="stack">
            <!-- Create PO Form -->
            <div class="card card-pad stack-sm">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 style="font-size:16px;">Create Purchase Order (PO)</h2>
                  <p class="text-xs text-muted">Order replenishment stock from household suppliers &amp; print or share via WA</p>
                </div>
                <span class="badge badge-emerald">Total: ${fmtINR(total)}</span>
              </div>

              <div class="grid-2" style="gap:10px;">
                <div>
                  <label class="field-label">Select Supplier</label>
                  <select class="select" onchange="ERPG.setPOSupplier(this.value)">
                    ${state.db.suppliers.map(s => `<option value="${s.id}" ${s.id === state.poDraft.supplierId ? 'selected' : ''}>${esc(s.name)} (${esc(s.city)})</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="field-label">Notes / Delivery Instructions</label>
                  <input class="input" value="${esc(state.poDraft.notes)}" oninput="ERPG.setPONotes(this.value)" placeholder="e.g., Unload at Koyilandy Godown" />
                </div>
              </div>

              <div class="flex flex-wrap gap-2" style="padding-top:6px;border-top:1px solid var(--border);">
                <select id="po-item-sel" class="select" style="flex:2 1 200px;">
                  ${state.db.products.map(p => `<option value="${p.id}">${esc(p.name)} (Cost: ${fmtINR(p.costPrice)} | Stk: ${p.stock})</option>`).join('')}
                </select>
                <input id="po-cost-inp" type="number" min="1" class="input" style="width:110px;" placeholder="Cost ₹ (auto)" />
                <input id="po-qty-inp" type="number" min="1" value="20" class="input" style="width:86px;" placeholder="Qty" />
                <button onclick="ERPG.addPOItem()" class="btn btn-charcoal">${ICONS.plus} Add Line</button>
              </div>

              ${state.poDraft.items.length ? `
                <div class="stack-sm">
                  ${state.poDraft.items.map((it, idx) => `
                    <div class="flex items-center justify-between gap-2" style="padding:8px 10px;border-radius:var(--radius-sm);background:var(--bg-surface);border:1px solid var(--border);font-size:12.5px;">
                      <div><strong>${esc(it.name)}</strong> — ${it.qty} × ${fmtINR(it.rate)} (+${it.gst}% GST) = <strong>${fmtINR(Math.round(it.qty * it.rate * (1 + it.gst / 100)))}</strong></div>
                      <button onclick="ERPG.removePOItem(${idx})" class="text-rose font-bold">✕</button>
                    </div>
                  `).join('')}
                  <div class="flex justify-between items-center flex-wrap gap-2 mt-1">
                    <div class="text-xs text-secondary">Subtotal: <strong>${fmtINR(sub)}</strong> • GST: <strong>${fmtINR(Math.round(tax))}</strong> • Grand Total: <strong class="text-emerald">${fmtINR(total)}</strong></div>
                    <button onclick="ERPG.savePO()" class="btn btn-primary">Save Purchase Order</button>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Purchase Orders List -->
            <div class="card">
              <div class="card-header">
                <h2 style="font-size:15px;">Purchase Orders (${state.db.purchaseOrders.length})</h2>
                <span class="text-xs text-muted">Mark Received to auto-increment stock</span>
              </div>
              <div class="card-pad stack-sm">
                ${state.db.purchaseOrders.map(po => {
                  const sup = getSupplier(po.supplierId);
                  return `
                    <div class="card card-pad flex flex-wrap items-center justify-between gap-3" style="background:var(--bg-surface);">
                      <div class="min-w-0" style="flex:1 1 230px;">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-heading font-bold">${esc(po.id)}</span>
                          <span class="text-xs text-muted">${fmtDate(po.date)}</span>
                          <span class="badge ${po.status === 'Received' ? 'badge-emerald' : 'badge-amber'}">${esc(po.status)}</span>
                        </div>
                        <div class="font-bold text-sm mt-1">${esc(sup ? sup.name : po.supplierId)}</div>
                        <div class="text-xs text-secondary">${po.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</div>
                      </div>
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-heading font-bold" style="font-size:15px;">${fmtINR(po.total)}</span>
                        ${po.status !== 'Received' ? `<button onclick="ERPG.markPOReceived('${po.id}')" class="btn btn-sm btn-primary">Mark Received</button>` : ''}
                        <button onclick="ERPG.openPrintPOModal('${po.id}')" class="btn btn-sm btn-outline">${ICONS.print} Print PO</button>
                        <button onclick="ERPG.sharePOWA('${po.id}')" class="btn btn-sm btn-wa">${ICONS.wa} WA</button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        `;
      }

      /* =======================================================================
         11. MODULE 5: ALL 17 REPORTS & BUSINESS ANALYSIS + EXCEL EXPORT
         ======================================================================= */
      const REPORTS_LIST = [
        { id: 'stock_aging', num: 1, title: 'Stock Aging Report' },
        { id: 'receivables_aging', num: 2, title: 'Receivables Aging Report' },
        { id: 'route_item_sales', num: 3, title: 'Route-wise & Item-wise Sales' },
        { id: 'daily_sales', num: 4, title: 'Daily Sales Report' },
        { id: 'salesman_profit', num: 5, title: 'Salesman Sales, Costing & Profit' },
        { id: 'gross_net_profit', num: 6, title: 'Gross Profit & Net Profit' },
        { id: 'expense_analysis', num: 7, title: 'Expense Analysis Report' },
        { id: 'purchase_analysis', num: 8, title: 'Purchase Analysis Report' },
        { id: 'stock_movement', num: 9, title: 'Stock Movement Report' },
        { id: 'slow_non_moving', num: 10, title: 'Slow & Non-Moving Stock' },
        { id: 'customer_profit', num: 11, title: 'Customer-wise Profitability' },
        { id: 'supplier_outstanding', num: 12, title: 'Supplier Outstanding Report' },
        { id: 'cash_flow', num: 13, title: 'Cash Flow Report' },
        { id: 'target_vs_achieve', num: 14, title: 'Sales Target vs Achievement' },
        { id: 'sales_returns', num: 15, title: 'Sales Return & Credit Note' },
        { id: 'pl_comparison', num: 16, title: 'Monthly & Yearly P&L Comparison' },
        { id: 'mgmt_summary', num: 17, title: 'Management Summary Report' }
      ];

      function buildReportData(id) {
        const orders = getFilteredOrders();
        const expenses = state.db.expenses.filter(e => matchesPeriod(e.date, state.filters.period));
        const pos = state.db.purchaseOrders.filter(p => matchesPeriod(p.date, state.filters.period));
        const collections = state.db.collections.filter(c => matchesPeriod(c.date, state.filters.period));
        const returns = state.db.returns.filter(r => matchesPeriod(r.date, state.filters.period));

        switch (id) {
          case 'stock_aging': {
            const headers = ['SKU', 'Item Name', 'Category', 'Stock', 'Age (Days)', 'Bucket', 'Value (₹)'];
            const rows = state.db.products
              .filter(p => state.filters.productId === 'all' || p.id === state.filters.productId)
              .map(p => {
                const b = p.stockAgeDays <= 30 ? '0-30 Days' : p.stockAgeDays <= 60 ? '31-60 Days' : p.stockAgeDays <= 90 ? '61-90 Days' : '90+ Days';
                return [p.sku, p.name, p.category, p.stock, p.stockAgeDays, b, p.stock * p.costPrice];
              });
            return { headers, rows, kpi: `Total Stock Value: ${fmtINR(rows.reduce((s, r) => s + r[6], 0))}` };
          }
          case 'receivables_aging': {
            const headers = ['Customer', 'Route', '0-30d (₹)', '31-60d (₹)', '61-90d (₹)', '90+d (₹)', 'Total Due (₹)'];
            const rows = state.db.customers
              .filter(c => (state.filters.customerId === 'all' || c.id === state.filters.customerId) && (state.filters.route === 'all' || c.route === state.filters.route))
              .map(c => [
                c.name, c.route,
                c.overdueDays <= 30 ? c.outstanding : 0,
                c.overdueDays > 30 && c.overdueDays <= 60 ? c.outstanding : 0,
                c.overdueDays > 60 && c.overdueDays <= 90 ? c.outstanding : 0,
                c.overdueDays > 90 ? c.outstanding : 0,
                c.outstanding
              ]);
            return { headers, rows, kpi: `Total Receivables: ${fmtINR(rows.reduce((s, r) => s + r[6], 0))}` };
          }
          case 'route_item_sales': {
            const map = {};
            orders.forEach(o => o.items.forEach(it => {
              if (state.filters.productId !== 'all' && it.productId !== state.filters.productId) return;
              const k = o.route + '||' + it.name;
              if (!map[k]) map[k] = { route: o.route, item: it.name, qty: 0, sales: 0 };
              map[k].qty += it.qty;
              map[k].sales += it.qty * it.unitPrice;
            }));
            const headers = ['Route', 'Item Name', 'Qty Sold', 'Sales Value (₹)'];
            const rows = Object.values(map).map(x => [x.route, x.item, x.qty, x.sales]);
            return { headers, rows, kpi: `Total Route/Item Sales: ${fmtINR(rows.reduce((s, r) => s + r[3], 0))}` };
          }
          case 'daily_sales': {
            const map = {};
            orders.forEach(o => {
              if (!map[o.date]) map[o.date] = { date: o.date, cnt: 0, sub: 0, tax: 0, total: 0 };
              map[o.date].cnt++; map[o.date].sub += o.subtotal; map[o.date].tax += o.tax; map[o.date].total += o.total;
            });
            const headers = ['Date', 'Orders', 'Taxable (₹)', 'GST (₹)', 'Grand Total (₹)'];
            const rows = Object.values(map).sort((a, b) => b.date.localeCompare(a.date)).map(x => [fmtDate(x.date), x.cnt, x.sub, x.tax, x.total]);
            return { headers, rows, kpi: `Active Days: ${rows.length} | Total: ${fmtINR(rows.reduce((s, r) => s + r[4], 0))}` };
          }
          case 'salesman_profit': {
            const headers = ['Salesman', 'Route', 'Orders', 'Sales (₹)', 'Costing (₹)', 'Profit (₹)', 'Margin'];
            const rows = state.db.salesmen
              .filter(s => state.filters.salesmanId === 'all' || s.id === state.filters.salesmanId)
              .map(s => {
                const so = orders.filter(o => o.salesmanId === s.id);
                const sales = so.reduce((a, b) => a + b.subtotal, 0);
                const cost = so.reduce((a, b) => a + b.costTotal, 0);
                const prof = sales - cost;
                return [s.name, s.route, so.length, sales, cost, prof, sales > 0 ? ((prof / sales) * 100).toFixed(1) + '%' : '0%'];
              });
            return { headers, rows, kpi: `Total Salesman Profit: ${fmtINR(rows.reduce((s, r) => s + r[5], 0))}` };
          }
          case 'gross_net_profit': {
            const sales = orders.reduce((s, o) => s + o.subtotal, 0);
            const cogs = orders.reduce((s, o) => s + o.costTotal, 0);
            const gross = sales - cogs;
            const exp = expenses.reduce((s, e) => s + e.amount, 0);
            const ret = returns.reduce((s, r) => s + r.amount, 0);
            const net = gross - exp - ret;
            const pct = v => sales > 0 ? ((v / sales) * 100).toFixed(1) + '%' : '0%';
            return {
              headers: ['Profit & Loss Line', 'Amount (₹)', '% of Sales'],
              rows: [
                ['Net Sales Revenue (Excl. GST)', sales, '100.0%'],
                ['Less: Cost of Goods Sold', cogs, pct(cogs)],
                ['Gross Profit', gross, pct(gross)],
                ['Less: Operating Expenses', exp, pct(exp)],
                ['Less: Sales Returns / Credit Notes', ret, pct(ret)],
                ['Net Profit / (Loss)', net, pct(net)]
              ],
              kpi: `Net Profit: ${fmtINR(net)}`
            };
          }
          case 'expense_analysis': {
            const headers = ['Date', 'ID', 'Category', 'Mode', 'Notes', 'Amount (₹)'];
            const rows = expenses.map(e => [fmtDate(e.date), e.id, e.category, e.mode, e.notes, e.amount]);
            return { headers, rows, kpi: `Total Expenses: ${fmtINR(rows.reduce((s, r) => s + r[5], 0))}`, action: 'expense' };
          }
          case 'purchase_analysis': {
            const headers = ['PO #', 'Date', 'Supplier', 'Status', 'Subtotal (₹)', 'GST (₹)', 'Total (₹)'];
            const rows = pos.map(p => {
              const sup = getSupplier(p.supplierId);
              return [p.id, fmtDate(p.date), sup ? sup.name : p.supplierId, p.status, p.subtotal, p.tax, p.total];
            });
            return { headers, rows, kpi: `Total Purchases: ${fmtINR(rows.reduce((s, r) => s + r[6], 0))}` };
          }
          case 'stock_movement': {
            const headers = ['SKU', 'Item Name', 'Opening', 'Purchased (+)', 'Sold (-)', 'Closing', 'Value (₹)'];
            const rows = state.db.products.map(p => [p.sku, p.name, p.openingStock, p.purchasedQty, p.soldQty, p.stock, p.stock * p.costPrice]);
            return { headers, rows, kpi: `Closing Units: ${rows.reduce((s, r) => s + r[5], 0)}` };
          }
          case 'slow_non_moving': {
            const headers = ['SKU', 'Item Name', 'Stock', 'Last Sold (Days)', 'Status', 'Blocked Capital (₹)'];
            const rows = state.db.products.filter(p => p.lastSoldDaysAgo >= 30).map(p => [
              p.sku, p.name, p.stock, p.lastSoldDaysAgo,
              (p.soldQty === 0 || p.lastSoldDaysAgo >= 60) ? 'Non-Moving' : 'Slow-Moving',
              p.stock * p.costPrice
            ]);
            return { headers, rows, kpi: `Blocked Capital: ${fmtINR(rows.reduce((s, r) => s + r[5], 0))}` };
          }
          case 'customer_profit': {
            const headers = ['Customer', 'Route', 'Orders', 'Revenue (₹)', 'Cost (₹)', 'Profit (₹)', 'Margin'];
            const rows = state.db.customers.map(c => {
              const co = orders.filter(o => o.customerId === c.id);
              const rev = co.reduce((a, b) => a + b.subtotal, 0);
              const cost = co.reduce((a, b) => a + b.costTotal, 0);
              const prof = rev - cost;
              return [c.name, c.route, co.length, rev, cost, prof, rev > 0 ? ((prof / rev) * 100).toFixed(1) + '%' : '0%'];
            });
            return { headers, rows, kpi: `Customer Profit: ${fmtINR(rows.reduce((s, r) => s + r[5], 0))}` };
          }
          case 'supplier_outstanding': {
            const headers = ['Supplier', 'Contact', 'Phone', 'City', 'GSTIN', 'Payable (₹)'];
            const rows = state.db.suppliers.map(s => [s.name, s.contact, s.phone, s.city, s.gstin, s.outstanding]);
            return { headers, rows, kpi: `Total Payable: ${fmtINR(rows.reduce((s, r) => s + r[5], 0))}` };
          }
          case 'cash_flow': {
            const inflow = collections.reduce((s, c) => s + c.amount, 0);
            const expOut = expenses.reduce((s, e) => s + e.amount, 0);
            const purOut = pos.filter(p => p.status === 'Received').reduce((s, p) => s + p.total, 0);
            const net = inflow - expOut - purOut;
            return {
              headers: ['Cash Flow Stream', 'Direction', 'Amount (₹)'],
              rows: [
                ['Customer Collections', 'Inflow (+)', inflow],
                ['Operating Expenses', 'Outflow (-)', -expOut],
                ['Supplier Purchases Received', 'Outflow (-)', -purOut],
                ['Net Cash Flow', net >= 0 ? 'Surplus' : 'Deficit', net]
              ],
              kpi: `Net Cash Flow: ${fmtINR(net)}`
            };
          }
          case 'target_vs_achieve': {
            const headers = ['Salesman', 'Route', 'Target (₹)', 'Achieved (₹)', 'Achievement %', 'Progress'];
            const rows = state.db.salesmen.map(s => {
              const ach = orders.filter(o => o.salesmanId === s.id).reduce((a, b) => a + b.total, 0);
              const pct = s.target > 0 ? Math.min(100, Math.round((ach / s.target) * 100)) : 0;
              return [s.name, s.route, s.target, ach, pct + '%', pct];
            });
            return { headers, rows, kpi: `Team Sales: ${fmtINR(rows.reduce((s, r) => s + r[3], 0))}`, hasProgressCol: 5 };
          }
          case 'sales_returns': {
            const headers = ['Credit Note #', 'Date', 'Order #', 'Customer', 'Item', 'Qty', 'Reason', 'Credit (₹)'];
            const rows = returns.map(r => {
              const c = getCustomer(r.customerId);
              return [r.id, fmtDate(r.date), r.orderId, c ? c.name : r.customerId, r.productName, r.qty, r.reason, r.amount];
            });
            return { headers, rows, kpi: `Total Credit Notes: ${fmtINR(rows.reduce((s, r) => s + r[7], 0))}`, action: 'return' };
          }
          case 'pl_comparison': {
            const mSales = state.db.orders.filter(o => matchesPeriod(o.date, 'monthly')).reduce((s, o) => s + o.subtotal, 0);
            const mProf = state.db.orders.filter(o => matchesPeriod(o.date, 'monthly')).reduce((s, o) => s + o.profit, 0);
            const mExp = state.db.expenses.filter(e => matchesPeriod(e.date, 'monthly')).reduce((s, e) => s + e.amount, 0);
            const ySales = state.db.orders.filter(o => matchesPeriod(o.date, 'yearly')).reduce((s, o) => s + o.subtotal, 0);
            const yProf = state.db.orders.filter(o => matchesPeriod(o.date, 'yearly')).reduce((s, o) => s + o.profit, 0);
            const yExp = state.db.expenses.filter(e => matchesPeriod(e.date, 'yearly')).reduce((s, e) => s + e.amount, 0);
            return {
              headers: ['P&L Metric', 'This Month (₹)', 'This Year (₹)'],
              rows: [
                ['Sales Revenue (Excl. GST)', mSales, ySales],
                ['Gross Profit', mProf, yProf],
                ['Operating Expenses', mExp, yExp],
                ['Net Profit', mProf - mExp, yProf - yExp]
              ],
              kpi: `YTD Net Profit: ${fmtINR(yProf - yExp)}`
            };
          }
          default: {
            const sales = orders.reduce((s, o) => s + o.total, 0);
            const gross = orders.reduce((s, o) => s + o.profit, 0);
            const exp = expenses.reduce((s, e) => s + e.amount, 0);
            const col = collections.reduce((s, c) => s + c.amount, 0);
            const out = state.db.customers.reduce((s, c) => s + c.outstanding, 0);
            const stk = state.db.products.reduce((s, p) => s + (p.stock * p.costPrice), 0);
            return {
              headers: ['Executive Metric', 'Value (₹)', 'Details'],
              rows: [
                ['Total Sales (Incl. GST)', sales, `${orders.length} Orders`],
                ['Gross Profit', gross, 'Sales minus COGS'],
                ['Operating Expenses', exp, `${expenses.length} Entries`],
                ['Net Profit', gross - exp, 'After Expenses'],
                ['Collections Received', col, `${collections.length} Receipts`],
                ['Customer Outstanding', out, `${state.db.customers.length} Customers`],
                ['Closing Stock Value', stk, `${state.db.products.length} Household SKUs`]
              ],
              kpi: `Management Summary (${state.filters.period.toUpperCase()})`
            };
          }
        }
      }

      function renderReports() {
        const meta = REPORTS_LIST.find(r => r.id === state.activeReport) || REPORTS_LIST[0];
        const rep = buildReportData(state.activeReport);

        return `
          <div class="stack">
            <!-- Universal Multi-Dimensional Filter Bar -->
            <div class="card card-pad stack-sm">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-1 flex-wrap">
                  <span class="text-xs font-bold text-muted" style="margin-right:4px;">PERIOD:</span>
                  ${['daily', 'monthly', 'yearly'].map(p => `
                    <button onclick="ERPG.setFilter('period','${p}')" class="btn btn-sm ${state.filters.period === p ? 'btn-charcoal' : 'btn-outline'}" style="text-transform:capitalize;">${p}</button>
                  `).join('')}
                </div>
                <div class="flex gap-2">
                  <button onclick="ERPG.exportActiveReport()" class="btn btn-sm btn-primary">${ICONS.download} Export Excel (.csv)</button>
                  <button onclick="window.print()" class="btn btn-sm btn-outline">${ICONS.print} Print</button>
                </div>
              </div>

              <div class="kpi-grid" style="gap:8px;padding-top:6px;border-top:1px solid var(--border);">
                <select class="select select-sm" onchange="ERPG.setFilter('customerId',this.value)">
                  <option value="all">All Customers</option>
                  ${state.db.customers.map(c => `<option value="${c.id}" ${state.filters.customerId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
                </select>
                <select class="select select-sm" onchange="ERPG.setFilter('productId',this.value)">
                  <option value="all">All Items</option>
                  ${state.db.products.map(p => `<option value="${p.id}" ${state.filters.productId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
                </select>
                <select class="select select-sm" onchange="ERPG.setFilter('salesmanId',this.value)">
                  <option value="all">All Salesmen</option>
                  ${state.db.salesmen.map(s => `<option value="${s.id}" ${state.filters.salesmanId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
                </select>
                <select class="select select-sm" onchange="ERPG.setFilter('route',this.value)">
                  <option value="all">All Routes</option>
                  ${state.db.routes.map(r => `<option value="${esc(r)}" ${state.filters.route === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- 17 Reports Selector -->
            <div class="card card-pad stack-sm">
              <label class="field-label" style="margin:0;">Select Report (1 – 17)</label>
              <select class="select" onchange="ERPG.setActiveReport(this.value)">
                ${REPORTS_LIST.map(r => `<option value="${r.id}" ${r.id === state.activeReport ? 'selected' : ''}>${r.num}. ${esc(r.title)}</option>`).join('')}
              </select>
            </div>

            <!-- Printable Report Table -->
            <div id="print-area" class="card">
              <div class="card-header">
                <div>
                  <h2 style="font-size:15.5px;">${meta.num}. ${esc(meta.title)}</h2>
                  <div class="text-xs font-bold text-emerald mt-1">${esc(rep.kpi)}</div>
                </div>
                <div class="no-print flex gap-2">
                  ${rep.action === 'expense' ? `<button onclick="ERPG.openAddExpenseModal()" class="btn btn-sm btn-primary">${ICONS.plus} Add Expense</button>` : ''}
                  ${rep.action === 'return' ? `<button onclick="ERPG.openAddReturnModal()" class="btn btn-sm btn-primary">${ICONS.plus} Log Sales Return</button>` : ''}
                </div>
              </div>
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>${rep.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>
                  </thead>
                  <tbody>
                    ${rep.rows.map(row => `
                      <tr>
                        ${row.map((cell, ci) => {
                          if (rep.hasProgressCol === ci) {
                            return `<td><div class="progress-track"><div class="progress-fill" style="width:${cell}%;"></div></div></td>`;
                          }
                          const isINR = typeof cell === 'number' && rep.headers[ci].includes('₹');
                          return `<td style="${isINR ? 'font-weight:700;' : ''}">${isINR ? fmtINR(cell) : esc(cell)}</td>`;
                        }).join('')}
                      </tr>
                    `).join('') || `<tr><td colspan="${rep.headers.length}" style="text-align:center;padding:24px;" class="text-muted">No records match the selected filters.</td></tr>`}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `;
      }

      /* =======================================================================
         12. BUSINESS LOGIC ACTIONS (CART, ORDERS, PO, GPS, MODALS, RBAC)
         ======================================================================= */
      function addToCart(productId) {
        const p = getProduct(productId);
        if (!p || p.stock <= 0) { showToast('Item out of stock!', 'warning'); return; }
        const opt = (p.options && p.options[0]) || 'Standard';
        const existing = state.cart.items.find(i => i.productId === p.id && i.option === opt);
        if (existing) {
          if (existing.qty + 1 > p.stock) { showToast(`Max stock available: ${p.stock}`, 'warning'); return; }
          existing.qty += 1;
        } else {
          state.cart.items.push({
            productId: p.id, name: p.name, option: opt, qty: 1,
            unitPrice: p.sellPrice, costPrice: p.costPrice, gst: p.gst
          });
        }
        renderApp();
        showToast(`Added "${p.name}" to Order Form`, 'success');
      }

      function editCartLine(idx, field, val) {
        const it = state.cart.items[idx];
        if (!it) return;
        if (field === 'option') it.option = val;
        else if (field === 'unitPrice') it.unitPrice = Math.max(1, Number(val) || it.unitPrice);
        else if (field === 'qty') {
          const p = getProduct(it.productId);
          const q = Math.max(1, parseInt(val, 10) || 1);
          it.qty = (p && q > p.stock) ? (showToast(`Max stock is ${p.stock}`, 'warning'), p.stock) : q;
        }
        renderApp();
      }

      function stepCartQty(idx, delta) {
        const it = state.cart.items[idx];
        if (!it) return;
        const p = getProduct(it.productId);
        const next = it.qty + delta;
        if (next <= 0) state.cart.items.splice(idx, 1);
        else if (p && next > p.stock) { showToast(`Max stock is ${p.stock}`, 'warning'); return; }
        else it.qty = next;
        renderApp();
      }

      function formatOrderWA(order) {
        const cust = getCustomer(order.customerId);
        const lines = [
          `*ERP-GO (COREBIQ) — SALES ORDER ESTIMATE*`,
          `Order #: *${order.id}* | Date: ${fmtDate(order.date)}`,
          `Customer: *${cust ? cust.name : order.customerId}*`,
          `Route: ${order.route}`,
          `──────────────────`
        ];
        order.items.forEach((it, idx) => {
          lines.push(`${idx + 1}. ${it.name} [${it.option}]`);
          lines.push(`   ${it.qty} × ${fmtINR(it.unitPrice)} (GST ${it.gst}%) = *${fmtINR(Math.round(it.qty * it.unitPrice))}*`);
        });
        lines.push(`──────────────────`);
        lines.push(`Subtotal: ${fmtINR(order.subtotal)}`);
        if (order.discountAmt > 0) lines.push(`Discount: -${fmtINR(order.discountAmt)}`);
        const halfTax = Math.round(order.tax / 2);
        lines.push(`CGST + SGST: ${fmtINR(halfTax)} + ${fmtINR(order.tax - halfTax)}`);
        lines.push(`*GRAND TOTAL: ${fmtINR(order.total)}*`);
        if (order.notes) lines.push(`Notes: ${order.notes}`);
        if (cust && cust.lat && cust.lng) lines.push(`Location: https://maps.google.com/?q=${cust.lat},${cust.lng}`);
        return lines.join('\n');
      }

      function submitOrder(openWA) {
        const cust = getCustomer(state.cart.customerId);
        const sm = getSalesman(state.cart.salesmanId) || state.db.salesmen[0];
        if (!cust || !state.cart.items.length) { showToast('Select customer and at least 1 item.', 'warning'); return; }
        const t = computeCartTotals();

        state.cart.items.forEach(i => {
          const p = getProduct(i.productId);
          if (p) {
            p.stock = Math.max(0, p.stock - i.qty);
            p.soldQty = (p.soldQty || 0) + i.qty;
            p.lastSoldDaysAgo = 0;
          }
        });

        const orderId = `ORD-${TODAY.getFullYear()}-${state.db.orders.length + 101}`;
        const newOrder = {
          id: orderId,
          date: state.cart.date || TODAY_ISO,
          customerId: cust.id,
          salesmanId: sm.id,
          route: cust.route,
          items: JSON.parse(JSON.stringify(state.cart.items)),
          discountType: state.cart.discountType,
          discountVal: Number(state.cart.discountVal) || 0,
          gstMode: state.cart.gstMode,
          subtotal: t.subtotal,
          discountAmt: t.discountAmt,
          tax: t.tax,
          total: t.grandTotal,
          costTotal: t.costTotal,
          profit: t.profit,
          status: 'Pending',
          notes: state.cart.notes.trim()
        };

        state.db.orders.unshift(newOrder);
        cust.outstanding = (cust.outstanding || 0) + t.grandTotal;
        state.cart.items = [];
        state.cart.discountVal = 0;
        state.cart.notes = '';
        saveDB();
        renderApp();
        showToast(`Order ${orderId} saved & synced!`, 'success');

        if (openWA) {
          sendOrderWA(orderId);
        }
      }

      function sendOrderWA(orderId) {
        const o = state.db.orders.find(x => x.id === orderId);
        const cust = getCustomer(o ? o.customerId : '');
        if (!o) return;
        const msg = formatOrderWA(o);
        const phone = cust ? cust.phone : '';
        window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
      }

      function cycleOrderStatus(orderId) {
        const flow = ['Pending', 'Approved', 'Dispatched', 'Delivered'];
        const o = state.db.orders.find(x => x.id === orderId);
        if (!o) return;
        o.status = flow[(flow.indexOf(o.status) + 1) % flow.length];
        saveDB();
        renderApp();
        showToast(`${o.id} marked as ${o.status}`, 'info');
      }

      function checkInGPS() {
        const u = getActiveUser();
        const sm = state.db.salesmen.find(s => s.id === u.salesmanId) || state.db.salesmen[0];
        const stamp = `${fmtDate(TODAY_ISO)} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

        const applyCheckIn = (lat, lng, note) => {
          sm.lat = lat;
          sm.lng = lng;
          sm.status = 'Online';
          sm.lastCheckIn = stamp;
          saveDB();
          renderApp();
          showToast(`GPS Check-In logged for ${sm.name} (${note})`, 'success');
        };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            pos => applyCheckIn(pos.coords.latitude, pos.coords.longitude, 'Live GPS'),
            () => applyCheckIn(11.4429 + (Math.random() - 0.5) * 0.01, 75.6976 + (Math.random() - 0.5) * 0.01, 'Simulated'),
            { enableHighAccuracy: true, timeout: 6000 }
          );
        } else {
          applyCheckIn(11.4429, 75.6976, 'Simulated');
        }
      }

      /* =======================================================================
         13. MODALS (PRINT, PRODUCT PHOTO, CATEGORY, CUSTOMER, COLLECTION, SETTINGS)
         ======================================================================= */
      function openModal(html) {
        document.getElementById('modal-box').innerHTML = html;
        document.getElementById('modal-backdrop').classList.add('open');
        document.body.style.overflow = 'hidden';
      }

      function closeModal() {
        document.getElementById('modal-backdrop').classList.remove('open');
        document.body.style.overflow = '';
      }

      function openPrintOrderModal(orderId) {
        const o = state.db.orders.find(x => x.id === orderId);
        if (!o) return;
        const cust = getCustomer(o.customerId);
        const waMsg = formatOrderWA(o);
        const halfTax = Math.round(o.tax / 2);
        openModal(`
          <div class="modal-head no-print">
            <h3>Order Estimate — ${esc(o.id)}</h3>
            <button onclick="ERPG.closeModal()" style="color:#fff;font-size:18px;">✕</button>
          </div>
          <div id="print-area" class="modal-body stack-sm" style="font-size:12.5px;">
            <div class="flex justify-between" style="padding-bottom:10px;border-bottom:2px solid var(--charcoal);">
              <div>
                <div class="font-heading font-bold" style="font-size:18px;">ERP<span style="color:var(--emerald);">-GO</span> <span class="corebiq-badge">COREBIQ</span></div>
                <div class="text-xs text-secondary">${esc(state.db.company.name)}</div>
                <div class="text-xs text-muted">GSTIN: ${esc(state.db.company.gstin)} • ${esc(state.db.company.city)}</div>
              </div>
              <div style="text-align:right;">
                <div class="font-heading font-bold" style="font-size:14px;">${esc(o.id)}</div>
                <div class="text-xs text-muted">Date: ${fmtDate(o.date)}</div>
              </div>
            </div>
            <div style="padding:10px;border-radius:var(--radius-sm);background:var(--bg-surface);border:1px solid var(--border);">
              <div class="font-bold">${esc(cust ? cust.name : o.customerId)}</div>
              <div class="text-xs text-secondary">Route: ${esc(o.route)} • Ph: +91 ${esc(cust ? cust.phone : '')}</div>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Item &amp; Option</th><th>Qty</th><th>Rate</th><th>GST</th><th>Amount</th></tr></thead>
                <tbody>
                  ${o.items.map(i => `<tr><td>${esc(i.name)} (${esc(i.option)})</td><td>${i.qty}</td><td>${fmtINR(i.unitPrice)}</td><td>${i.gst}%</td><td style="font-weight:700;">${fmtINR(i.qty * i.unitPrice)}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
            <div style="margin-left:auto;width:230px;" class="stack-sm">
              <div class="flex justify-between"><span>Subtotal</span><span>${fmtINR(o.subtotal)}</span></div>
              ${o.discountAmt > 0 ? `<div class="flex justify-between"><span>Discount</span><span>- ${fmtINR(o.discountAmt)}</span></div>` : ''}
              <div class="flex justify-between"><span>CGST + SGST</span><span>${fmtINR(halfTax)} + ${fmtINR(o.tax - halfTax)}</span></div>
              <div class="flex justify-between font-heading font-bold" style="font-size:15px;padding-top:6px;border-top:1.5px solid var(--charcoal);"><span>Grand Total</span><span>${fmtINR(o.total)}</span></div>
            </div>
          </div>
          <div class="modal-foot no-print">
            <button onclick="ERPG.copyOrderWA('${o.id}')" class="btn btn-outline">Copy WA Text</button>
            <button onclick="ERPG.sendOrderWA('${o.id}')" class="btn btn-wa">${ICONS.wa} Send WA</button>
            <button onclick="window.print()" class="btn btn-charcoal">${ICONS.print} Print / PDF</button>
          </div>
        `);
      }

      function previewDraftEstimate() {
        const cust = getCustomer(state.cart.customerId);
        if (!cust || !state.cart.items.length) { showToast('Add items to preview estimate.', 'warning'); return; }
        const t = computeCartTotals();
        openModal(`
          <div class="modal-head no-print">
            <h3>Draft Estimate Preview</h3>
            <button onclick="ERPG.closeModal()" style="color:#fff;font-size:18px;">✕</button>
          </div>
          <div id="print-area" class="modal-body stack-sm" style="font-size:12.5px;">
            <div class="flex justify-between" style="padding-bottom:10px;border-bottom:2px solid var(--charcoal);">
              <div>
                <div class="font-heading font-bold" style="font-size:18px;">ERP<span style="color:var(--emerald);">-GO</span> <span class="corebiq-badge">COREBIQ</span></div>
                <div class="text-xs text-secondary">${esc(state.db.company.name)}</div>
              </div>
              <div style="text-align:right;">
                <div class="font-bold">DRAFT ESTIMATE</div>
                <div class="text-xs text-muted">${fmtDate(state.cart.date)}</div>
              </div>
            </div>
            <div style="padding:10px;border-radius:var(--radius-sm);background:var(--bg-surface);border:1px solid var(--border);">
              <div class="font-bold">${esc(cust.name)}</div>
              <div class="text-xs text-secondary">Route: ${esc(cust.route)} • Ph: +91 ${esc(cust.phone)}</div>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
                <tbody>
                  ${state.cart.items.map(i => `<tr><td>${esc(i.name)} (${esc(i.option)})</td><td>${i.qty}</td><td>${fmtINR(i.unitPrice)}</td><td style="font-weight:700;">${fmtINR(i.qty * i.unitPrice)}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
            <div style="margin-left:auto;width:230px;" class="stack-sm">
              <div class="flex justify-between"><span>Subtotal</span><span>${fmtINR(t.subtotal)}</span></div>
              ${t.discountAmt > 0 ? `<div class="flex justify-between"><span>Discount</span><span>- ${fmtINR(t.discountAmt)}</span></div>` : ''}
              <div class="flex justify-between"><span>CGST + SGST</span><span>${fmtINR(t.cgst)} + ${fmtINR(t.sgst)}</span></div>
              <div class="flex justify-between font-heading font-bold" style="font-size:15px;padding-top:6px;border-top:1.5px solid var(--charcoal);"><span>Grand Total</span><span>${fmtINR(t.grandTotal)}</span></div>
            </div>
          </div>
          <div class="modal-foot no-print">
            <button onclick="ERPG.closeModal()" class="btn btn-outline">Close</button>
            <button onclick="window.print()" class="btn btn-charcoal">${ICONS.print} Print</button>
          </div>
        `);
      }

      function openPrintPOModal(poId) {
        const po = state.db.purchaseOrders.find(x => x.id === poId);
        const sup = getSupplier(po ? po.supplierId : '');
        if (!po) return;
        openModal(`
          <div class="modal-head no-print">
            <h3>Purchase Order — ${esc(po.id)}</h3>
            <button onclick="ERPG.closeModal()" style="color:#fff;font-size:18px;">✕</button>
          </div>
          <div id="print-area" class="modal-body stack-sm" style="font-size:12.5px;">
            <div class="flex justify-between" style="padding-bottom:10px;border-bottom:2px solid var(--charcoal);">
              <div>
                <div class="font-heading font-bold" style="font-size:17px;">PURCHASE ORDER</div>
                <div class="text-xs text-secondary">${esc(state.db.company.name)}</div>
              </div>
              <div style="text-align:right;">
                <div class="font-bold">${esc(po.id)}</div>
                <div class="text-xs text-muted">${fmtDate(po.date)}</div>
              </div>
            </div>
            <div style="padding:10px;border-radius:var(--radius-sm);background:var(--bg-surface);border:1px solid var(--border);">
              <div class="text-xs font-bold text-muted">SUPPLIER</div>
              <div class="font-bold">${esc(sup ? sup.name : po.supplierId)}</div>
              <div class="text-xs text-secondary">${esc(sup ? sup.city : '')} • +91 ${esc(sup ? sup.phone : '')} • GSTIN: ${esc(sup ? sup.gstin : '')}</div>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>GST</th><th>Amount</th></tr></thead>
                <tbody>
                  ${po.items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${fmtINR(i.rate)}</td><td>${i.gst}%</td><td style="font-weight:700;">${fmtINR(i.qty * i.rate)}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
            <div style="margin-left:auto;width:220px;" class="stack-sm">
              <div class="flex justify-between"><span>Subtotal</span><span>${fmtINR(po.subtotal)}</span></div>
              <div class="flex justify-between"><span>GST</span><span>${fmtINR(po.tax)}</span></div>
              <div class="flex justify-between font-heading font-bold" style="font-size:15px;padding-top:6px;border-top:1.5px solid var(--charcoal);"><span>PO Total</span><span>${fmtINR(po.total)}</span></div>
            </div>
          </div>
          <div class="modal-foot no-print">
            <button onclick="ERPG.sharePOWA('${po.id}')" class="btn btn-wa">${ICONS.wa} Share WA</button>
            <button onclick="window.print()" class="btn btn-charcoal">${ICONS.print} Print PO</button>
          </div>
        `);
      }

      function openProductModal(productId, defaultCat) {
        const p = productId ? getProduct(productId) : null;
        const cats = getAllCategories();
        const catVal = p ? p.category : (defaultCat || cats[0].name);
        openModal(`
          <div class="modal-head">
            <h3>${p ? 'Edit Stock Item & Photo' : 'Add New Stock Item'}</h3>
            <button onclick="ERPG.closeModal()" style="color:#fff;font-size:18px;">✕</button>
          </div>
          <form onsubmit="ERPG.saveProductForm(event, '${p ? p.id : ''}')" class="modal-body stack-sm">
            <div class="flex items-center gap-3" style="padding:10px;border-radius:var(--radius-md);background:var(--bg-surface);border:1px solid var(--border);">
              <div id="prod-photo-prev" class="photo-box" style="width:68px;height:68px;">
                ${p && p.photo ? `<img src="${esc(p.photo)}" alt="Item" />` : getHouseholdSVG(p ? p.iconKey : 'bucket')}
              </div>
              <div>
                <div class="text-xs font-bold">Item Photo (Auto-Compressed)</div>
                <label class="btn btn-sm btn-primary mt-1" style="cursor:pointer;">
                  ${ICONS.camera} Upload / Capture Photo
                  <input type="file" accept="image/*" style="display:none;" onchange="ERPG.compressPhotoInput(this,'prod-photo-hid','prod-photo-prev')" />
                </label>
                <input type="hidden" id="prod-photo-hid" name="photo" value="${esc(p ? p.photo : '')}" />
              </div>
            </div>
            <div class="grid-2" style="gap:10px;">
              <div><label class="field-label">Item Name *</label><input name="name" required class="input" value="${esc(p ? p.name : '')}" placeholder="e.g. 20L Plastic Bucket" /></div>
              <div><label class="field-label">SKU *</label><input name="sku" required class="input" value="${esc(p ? p.sku : '')}" placeholder="e.g. BKT-20L" /></div>
              <div>
                <label class="field-label">Category *</label>
                <input name="category" list="erpg-cats" required class="input" value="${esc(catVal)}" />
                <datalist id="erpg-cats">${cats.map(c => `<option value="${esc(c.name)}"></option>`).join('')}</datalist>
              </div>
              <div><label class="field-label">Options (comma separated)</label><input name="options" class="input" value="${esc(p ? (p.options || []).join(', ') : 'Regular, Heavy')}" /></div>
              <div><label class="field-label">Purchase Cost (₹) *</label><input name="costPrice" type="number" required class="input" value="${p ? p.costPrice : ''}" /></div>
              <div><label class="field-label">Selling Rate (₹) *</label><input name="sellPrice" type="number" required class="input" value="${p ? p.sellPrice : ''}" /></div>
              <div><label class="field-label">Stock Qty *</label><input name="stock" type="number" required class="input" value="${p ? p.stock : 50}" /></div>
              <div>
                <label class="field-label">GST %</label>
                <select name="gst" class="select">
                  ${[5, 12, 18].map(g => `<option value="${g}" ${(p ? p.gst : 18) === g ? 'selected' : ''}>GST ${g}%</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="modal-foot" style="margin:10px -16px -16px -16px;">
              <button type="button" onclick="ERPG.closeModal()" class="btn btn-outline">Cancel</button>
              <button type="submit" class="btn btn-primary">${p ? 'Update Item' : 'Save Item'}</button>
            </div>
          </form>
        `);
      }

      function openEditCatPhotoModal(catName) {
        const cat = getCategoryMeta(catName);
        openModal(`
          <div class="modal-head">
            <h3>Edit Category Photo — ${esc(catName)}</h3>
            <button onclick="ERPG.closeModal()" style="color:#fff;font-size:18px;">✕</button>
          </div>
          <form onsubmit="ERPG.saveCatPhotoForm(event, '${esc(catName)}')" class="modal-body stack-sm">
            <div class="flex items-center gap-3" style="padding:12px;border-radius:var(--radius-md);background:var(--bg-surface);border:1px solid var(--border);">
              <div id="cat-photo-prev" class="photo-box" style="width:76px;height:76px;">
                ${cat.photo ? `<img src="${esc(cat.photo)}" alt="Cat" />` : getHouseholdSVG(cat.iconKey)}
              </div>
              <div>
                <div class="text-xs font-bold">Upload Category Cover Photo</div>
                <label class="btn btn-sm btn-primary mt-2" style="cursor:pointer;">
                  ${ICONS.camera} Choose / Capture Image
                  <input type="file" accept="image/*" style="display:none;" onchange="ERPG.compressPhotoInput(this,'cat-photo-hid','cat-photo-prev')" />
                </label>
                <input type="hidden" id="cat-photo-hid" name="photo" value="${esc(cat.photo || '')}" />
              </div>
            </div>
            <div class="modal-foot" style="margin:10px -16px -16px -16px;">
              <button type="button" onclick="ERPG.closeModal()" class="btn btn-outline">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Category Photo</button>
            </div>
          </form>
        `);
      }

      function openAddCategoryModal() {
        openModal(`
          <div class="modal-head">
            <h3>Add Stock Category</h3>
            <button onclick="ERPG.closeModal()" style="color:#fff;font-size:18px;">✕</button>
          </div>
          <form onsubmit="ERPG.saveNewCategory(event)" class="modal-body stack-sm">
            <div class="flex items-center gap-3" style="padding:10px;border-radius:var(--radius-md);background:var(--bg-surface);border:1px solid var(--border);">
              <div id="newcat-prev" class="photo-box" style="width:60px;height:60px;">${getHouseholdSVG('bucket')}</div>
              <label class="btn btn-sm btn-primary" style="cursor:pointer;">
                ${ICONS.camera} Upload Photo
                <input type="file" accept="image/*" style="display:none;" onchange="ERPG.compressPhotoInput(this,'newcat-hid','newcat-prev')" />
              </label>
              <input type="hidden" id="newcat-hid" name="photo" value="" />
            </div>
            <div><label class="field-label">Category Name *</label><input name="name" required class="input" placeholder="e.g. Steel Utensils" /></div>
            <div class="modal-foot" style="margin:10px -16px -16px -16px;">
              <button type="button" onclick="ERPG.closeModal()" class="btn btn-outline">Cancel</button>
              <button type="submit" class="btn btn-primary">Add Category</button>
            </div>
          </form>
        `);
      }

      function openAddCustomerModal() {
        openModal(`
          <div class="modal-head">
            <h3>Add New Customer</h3>
            <button onclick="ERPG.closeModal()" style="color:#fff;font-size:18px;">✕</button>
          </div>
          <form onsubmit="ERPG.saveNewCustomer(event)" class="modal-body stack-sm">
            <div class="grid-2" style="gap:10px;">
              <div><label class="field-label">Shop / Business Name *</label><input name="name" required class="input" placeholder="e.g. Kerala Home Mart" /></div>
              <div><label class="field-label">Contact Person *</label><input name="contact" required class="input" placeholder="e.g. Manoj Kumar" /></div>
              <div><label class="field-label">Contact No (10-digit) *</label><input name="phone" required maxlength="10" class="input" placeholder="9847000000" /></div>
              <div>
                <label class="field-label">Route</label>
                <select name="route" class="select">${state.db.routes.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('')}</select>
              </div>
              <div><label class="field-label">Credit Limit (₹)</label><input name="creditLimit" type="number" value="100000" class="input" /></div>
              <div><label class="field-label">Opening Balance (₹)</label><input name="outstanding" type="number" value="0" class="input" /></div>
            </div>
            <div style="padding:10px;border-radius:var(--radius-sm);background:var(--bg-surface);border:1px solid var(--border);" class="stack-sm">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold">GPS Location Coordinates</span>
                <button type="button" onclick="ERPG.captureCustGPS()" class="btn btn-sm btn-soft-emerald">${ICONS.mapPin} Capture GPS Location</button>
              </div>
              <div class="grid-2" style="gap:8px;">
                <input id="cust-lat" name="lat" class="input input-sm" value="11.4429" placeholder="Latitude" />
                <input id="cust-lng" name="lng" class="input input-sm" value="75.6976" placeholder="Longitude" />
              </div>
            </div>
            <div class="modal-foot" style="margin:10px -16px -16px -16px;">
              <button type="button" onclick="ERPG.closeModal()" class="btn btn-outline">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Customer</button>
            </div>
          </form>
        `);
      }

      function openCollectPaymentModal(custId) {
        const c = getCustomer(custId);
        if (!c) return;
        openModal(`
          <div class="modal-head">
            <h3>Collect Payment — ${esc(c.name)}</h3>
            <button onclick="ERPG.closeModal()" style="color:#fff;font-size:18px;">✕</button>
          </div>
          <form onsubmit="ERPG.saveCollection(event, '${c.id}')" class="modal-body stack-sm">
            <div class="text-sm">Current Outstanding: <strong class="text-rose">${fmtINR(c.outstanding)}</strong></div>
            <div><label class="field-label">Amount Received (₹) *</label><input name="amount" type="number" min="1" required class="input" value="${c.outstanding > 0 ? c.outstanding : ''}" /></div>
            <div><label class="field-label">Payment Mode</label><select name="mode" class="select"><option>UPI</option><option>NEFT</option><option>Cash</option><option>Cheque</option></select></div>
            <div class="modal-foot" style="margin:10px -16px -16px -16px;">
              <button type="button" onclick="ERPG.closeModal()" class="btn btn-outline">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Receipt</button>
            </div>
          </form>
        `);
      }

      function openAddExpenseModal() {
        openModal(`
          <div class="modal-head">
            <h3>Add Operating Expense</h3>
            <button onclick="ERPG.closeModal()" style="color:#fff;font-size:18px;">✕</button>
          </div>
          <form onsubmit="ERPG.saveExpense(event)" class="modal-body stack-sm">
            <div><label class="field-label">Category</label><select name="category" class="select"><option>Fuel &amp; Logistics</option><option>Warehouse Rent</option><option>Salaries &amp; Bata</option><option>Utilities &amp; Internet</option><option>Misc Expense</option></select></div>
            <div><label class="field-label">Amount (₹) *</label><input name="amount" type="number" min="1" required class="input" /></div>
            <div><label class="field-label">Payment Mode</label><select name="mode" class="select"><option>UPI</option><option>Cash</option><option>NEFT</option></select></div>
            <div><label class="field-label">Notes</label><input name="notes" class="input" placeholder="Remarks" /></div>
            <div class="modal-foot" style="margin:10px -16px -16px -16px;">
              <button type="button" onclick="ERPG.closeModal()" class="btn btn-outline">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Expense</button>
            </div>
          </form>
        `);
      }

      function openAddReturnModal() {
        openModal(`
          <div class="modal-head">
            <h3>Log Sales Return / Credit Note</h3>
            <button onclick="ERPG.closeModal()" style="color:#fff;font-size:18px;">✕</button>
          </div>
          <form onsubmit="ERPG.saveReturn(event)" class="modal-body stack-sm">
            <div><label class="field-label">Customer</label><select name="customerId" class="select">${state.db.customers.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
            <div><label class="field-label">Returned Item</label><select name="productName" class="select">${state.db.products.map(p => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('')}</select></div>
            <div class="grid-2" style="gap:8px;">
              <div><label class="field-label">Qty *</label><input name="qty" type="number" min="1" value="1" required class="input" /></div>
              <div><label class="field-label">Credit Amount (₹) *</label><input name="amount" type="number" min="1" required class="input" /></div>
            </div>
            <div><label class="field-label">Reason *</label><input name="reason" required class="input" placeholder="e.g. Damaged in transit" /></div>
            <div class="modal-foot" style="margin:10px -16px -16px -16px;">
              <button type="button" onclick="ERPG.closeModal()" class="btn btn-outline">Cancel</button>
              <button type="submit" class="btn btn-primary">Issue Credit Note</button>
            </div>
          </form>
        `);
      }

      function openSettingsModal() {
        if (!signedIn || getActiveUser().role !== 'Admin') { showToast('Settings are restricted to Admin.', 'warning'); return; }
        const kb = SafeStorage.sizeKB(DB_KEY);
        openModal(`
          <div class="modal-head">
            <h3>Settings, RBAC Permissions &amp; Device Sync</h3>
            <button onclick="ERPG.closeModal()" style="color:#fff;font-size:18px;">✕</button>
          </div>
          <div class="modal-body stack">
            <!-- Storage & Backup -->
            <div class="card card-pad stack-sm" style="background:var(--bg-surface);">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div class="font-bold text-sm">Local Device Storage (${kb} KB)</div>
                  <div class="text-xs text-muted">Auto-saves offline &amp; syncs across browser tabs in real time.</div>
                </div>
                <span class="badge badge-emerald">● Synced</span>
              </div>
              <div class="flex flex-wrap gap-2 mt-1">
                <button onclick="ERPG.exportBackupJSON()" class="btn btn-sm btn-charcoal">${ICONS.download} Export Backup (.json)</button>
                <label class="btn btn-sm btn-outline" style="cursor:pointer;">
                  Import Backup (.json)
                  <input type="file" accept=".json" style="display:none;" onchange="ERPG.importBackupJSON(event)" />
                </label>
                <button onclick="ERPG.openResetConfirmModal()" class="btn btn-sm btn-danger">Reset Demo Data</button>
              </div>
            </div>

            <!-- RBAC Permissions Matrix -->
            <div class="stack-sm">
              <h4 style="font-size:14px;">User-Wise Access &amp; Permissions Matrix</h4>
              <div class="table-wrap card">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Dashboard</th>
                      <th>Catalogues</th>
                      <th>Sales App</th>
                      <th>Purchase</th>
                      <th>Reports</th>
                      <th>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${state.db.users.map(u => `
                      <tr>
                        <td><strong>${esc(u.role)}</strong><div style="font-size:10px;" class="text-muted">${esc(u.name)}</div></td>
                        ${['dashboard', 'catalogues', 'salesApp', 'purchase', 'reports', 'viewProfit'].map(pm => `
                          <td style="text-align:center;">
                            <input type="checkbox" ${u.permissions[pm] ? 'checked' : ''} ${u.role === 'Admin' ? 'disabled' : ''} onchange="ERPG.togglePerm('${u.id}','${pm}',this.checked)" style="width:15px;height:15px;accent-color:var(--emerald);cursor:pointer;" />
                          </td>
                        `).join('')}
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button onclick="ERPG.closeModal()" class="btn btn-primary">Done</button>
          </div>
        `);
      }

      function openResetConfirmModal() {
        openModal(`
          <div class="modal-head">
            <h3>Confirm Reset Demo Data</h3>
            <button onclick="ERPG.closeModal()" style="color:#fff;font-size:18px;">✕</button>
          </div>
          <div class="modal-body text-sm">
            Resetting will restore the default Household Items catalogue, sample customers, orders, and reports on this device.
          </div>
          <div class="modal-foot">
            <button onclick="ERPG.closeModal()" class="btn btn-outline">Cancel</button>
            <button onclick="ERPG.confirmResetDB()" class="btn btn-danger-solid">Yes, Reset Data</button>
          </div>
        `);
      }

      /* =======================================================================
         14. PUBLIC API FOR INLINE EVENT HANDLERS (window.ERPG)
         ======================================================================= */
      window.ERPG = {
        navigateTo,
        switchRole,
        triggerManualSync,
        closeModal,
        openSettingsModal,
        openResetConfirmModal,
        compressPhotoInput,
        quickAction,
        exportDashboardSummary,
        cycleOrderStatus,
        sendOrderWA,
        openPrintOrderModal,
        previewDraftEstimate,
        openPrintPOModal,
        openProductModal,
        openEditCatPhotoModal,
        openAddCategoryModal,
        openAddCustomerModal,
        openCollectPaymentModal,
        openAddExpenseModal,
        openAddReturnModal,
        addToCart,
        editCartLine,
        stepCartQty,
        submitOrder,
        checkInGPS,

        setFilter(k, v) { state.filters[k] = v; renderApp(); },
        setSalesSubTab(t) { state.salesSubTab = t; renderApp(); },
        openCatalogueCategory(c) { state.catalogueCategory = c; state.catalogueSearch = ''; renderApp(); },
        setCatSearch(v) { state.catalogueSearch = v; renderApp(); },
        goToOrderWithCat(c) { state.salesOrderCategory = c; state.salesSubTab = 'order'; navigateTo('salesApp'); },
        setSalesOrderCat(c) { state.salesOrderCategory = c; renderApp(); },
        setCustomerSearch(v) { state.customerSearch = v; renderApp(); },
        setActiveReport(r) { state.activeReport = r; renderApp(); },

        setCartField(k, v) { state.cart[k] = v; renderApp(); },
        setCartFieldSilent(k, v) { state.cart[k] = v; },
        removeCartItem(idx) { state.cart.items.splice(idx, 1); renderApp(); },
        clearCart() { state.cart.items = []; renderApp(); },

        copyOrderWA(orderId) {
          const o = state.db.orders.find(x => x.id === orderId);
          if (o) copyToClipboard(formatOrderWA(o), 'WhatsApp Estimate text copied!');
        },

        startOrderForCustomer(custId) {
          state.cart.customerId = custId;
          state.salesSubTab = 'order';
          renderApp();
        },

        captureCustGPS() {
          const setCoords = (lat, lng, msg) => {
            const la = document.getElementById('cust-lat');
            const ln = document.getElementById('cust-lng');
            if (la) la.value = lat.toFixed(4);
            if (ln) ln.value = lng.toFixed(4);
            showToast(msg, 'success');
          };
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              p => setCoords(p.coords.latitude, p.coords.longitude, 'Live GPS captured!'),
              () => setCoords(11.4429, 75.6976, 'Default Koyilandy GPS filled (manual editable).'),
              { timeout: 5000 }
            );
          } else {
            setCoords(11.4429, 75.6976, 'Coordinates populated (manual editable).');
          }
        },

        saveNewCustomer(e) {
          e.preventDefault();
          const fd = new FormData(e.target);
          state.db.customers.unshift({
            id: uid('C'),
            name: fd.get('name').trim(),
            contact: fd.get('contact').trim(),
            phone: fd.get('phone').replace(/\D/g, '').slice(-10),
            route: fd.get('route'),
            gstin: '',
            creditLimit: Number(fd.get('creditLimit')) || 100000,
            outstanding: Number(fd.get('outstanding')) || 0,
            overdueDays: 0,
            lat: parseFloat(fd.get('lat')) || 11.4429,
            lng: parseFloat(fd.get('lng')) || 75.6976
          });
          saveDB(); closeModal(); renderApp();
          showToast('Customer added!', 'success');
        },

        saveCollection(e, custId) {
          e.preventDefault();
          const fd = new FormData(e.target);
          const amt = Number(fd.get('amount')) || 0;
          const c = getCustomer(custId);
          if (!c || amt <= 0) return;
          c.outstanding = Math.max(0, c.outstanding - amt);
          state.db.collections.unshift({ id: uid('RCP'), date: TODAY_ISO, customerId: c.id, amount: amt, mode: fd.get('mode') });
          saveDB(); closeModal(); renderApp();
          showToast(`Payment of ${fmtINR(amt)} logged!`, 'success');
        },

        saveProductForm(e, existingId) {
          e.preventDefault();
          const fd = new FormData(e.target);
          const catName = fd.get('category').trim();
          const opts = (fd.get('options') || 'Standard').split(',').map(s => s.trim()).filter(Boolean);
          const photo = fd.get('photo') || '';
          if (!state.db.categories.some(c => c.name === catName)) {
            state.db.categories.push({ name: catName, iconKey: 'bucket', photo });
          }
          if (existingId) {
            const p = getProduct(existingId);
            if (p) {
              p.name = fd.get('name').trim();
              p.sku = fd.get('sku').trim().toUpperCase();
              p.category = catName;
              p.options = opts.length ? opts : ['Standard'];
              p.costPrice = Number(fd.get('costPrice')) || p.costPrice;
              p.sellPrice = Number(fd.get('sellPrice')) || p.sellPrice;
              p.stock = Math.max(0, Number(fd.get('stock')) || 0);
              p.gst = Number(fd.get('gst')) || 18;
              p.photo = photo;
            }
          } else {
            const stk = Math.max(0, Number(fd.get('stock')) || 0);
            state.db.products.unshift({
              id: uid('P'), sku: fd.get('sku').trim().toUpperCase(), name: fd.get('name').trim(),
              category: catName, iconKey: 'bucket', photo, options: opts.length ? opts : ['Standard'],
              costPrice: Number(fd.get('costPrice')) || 0, sellPrice: Number(fd.get('sellPrice')) || 0,
              gst: Number(fd.get('gst')) || 18, stock: stk, reorderLevel: 15, stockAgeDays: 1,
              lastSoldDaysAgo: 0, openingStock: stk, purchasedQty: 0, soldQty: 0
            });
          }
          saveDB(); closeModal(); renderApp();
          showToast(existingId ? 'Stock item updated!' : 'New stock item added!', 'success');
        },

        saveCatPhotoForm(e, catName) {
          e.preventDefault();
          const photo = new FormData(e.target).get('photo') || '';
          const cat = state.db.categories.find(c => c.name === catName);
          if (cat) cat.photo = photo;
          else state.db.categories.push({ name: catName, iconKey: 'bucket', photo });
          saveDB(); closeModal(); renderApp();
          showToast(`Photo updated for ${catName}`, 'success');
        },

        saveNewCategory(e) {
          e.preventDefault();
          const fd = new FormData(e.target);
          const name = fd.get('name').trim();
          const photo = fd.get('photo') || '';
          if (name && !state.db.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            state.db.categories.push({ name, iconKey: 'bucket', photo });
          }
          saveDB(); closeModal(); renderApp();
          showToast(`Category "${name}" added!`, 'success');
        },

        setPOSupplier(id) { state.poDraft.supplierId = id; },
        setPONotes(v) { state.poDraft.notes = v; },
        addPOItem() {
          const pid = document.getElementById('po-item-sel')?.value;
          const qty = Math.max(1, parseInt(document.getElementById('po-qty-inp')?.value, 10) || 1);
          const customCost = Number(document.getElementById('po-cost-inp')?.value);
          const p = getProduct(pid);
          if (!p) return;
          state.poDraft.items.push({ productId: p.id, name: p.name, qty, rate: customCost > 0 ? customCost : p.costPrice, gst: p.gst });
          renderApp();
        },
        removePOItem(idx) { state.poDraft.items.splice(idx, 1); renderApp(); },
        savePO() {
          if (!state.poDraft.items.length) { showToast('Add items to PO first.', 'warning'); return; }
          const sub = state.poDraft.items.reduce((s, i) => s + (i.qty * i.rate), 0);
          const tax = state.poDraft.items.reduce((s, i) => s + ((i.qty * i.rate * i.gst) / 100), 0);
          const total = Math.round(sub + tax);
          const po = {
            id: `PO-${TODAY.getFullYear()}-${String(state.db.purchaseOrders.length + 1).padStart(2, '0')}`,
            date: TODAY_ISO, supplierId: state.poDraft.supplierId,
            items: JSON.parse(JSON.stringify(state.poDraft.items)),
            subtotal: Math.round(sub), tax: Math.round(tax), total, status: 'Ordered', notes: state.poDraft.notes.trim()
          };
          state.db.purchaseOrders.unshift(po);
          const sup = getSupplier(po.supplierId);
          if (sup) sup.outstanding = (sup.outstanding || 0) + total;
          state.poDraft.items = []; state.poDraft.notes = '';
          saveDB(); renderApp();
          showToast(`Purchase Order ${po.id} created!`, 'success');
        },
        markPOReceived(poId) {
          const po = state.db.purchaseOrders.find(x => x.id === poId);
          if (!po || po.status === 'Received') return;
          po.status = 'Received';
          po.items.forEach(it => {
            const p = getProduct(it.productId);
            if (p) { p.stock += it.qty; p.purchasedQty = (p.purchasedQty || 0) + it.qty; p.stockAgeDays = 1; }
          });
          saveDB(); renderApp();
          showToast(`${po.id} received & inventory incremented!`, 'success');
        },
        sharePOWA(poId) {
          const po = state.db.purchaseOrders.find(x => x.id === poId);
          const sup = getSupplier(po ? po.supplierId : '');
          if (!po || !sup) return;
          const txt = [
            `*PURCHASE ORDER — ${state.db.company.name}*`,
            `PO #: *${po.id}* | Date: ${fmtDate(po.date)}`,
            `Supplier: *${sup.name}*`,
            `──────────────────`,
            ...po.items.map((it, i) => `${i + 1}. ${it.name} — Qty: ${it.qty} @ ${fmtINR(it.rate)}`),
            `──────────────────`,
            `*PO Total: ${fmtINR(po.total)}*`
          ].join('\n');
          window.open(`https://wa.me/91${sup.phone}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
        },

        saveExpense(e) {
          e.preventDefault();
          const fd = new FormData(e.target);
          state.db.expenses.unshift({
            id: uid('EXP'), date: TODAY_ISO, category: fd.get('category'),
            amount: Number(fd.get('amount')) || 0, mode: fd.get('mode'), notes: fd.get('notes') || ''
          });
          saveDB(); closeModal(); renderApp();
          showToast('Expense recorded!', 'success');
        },

        saveReturn(e) {
          e.preventDefault();
          const fd = new FormData(e.target);
          const amt = Number(fd.get('amount')) || 0;
          const cid = fd.get('customerId');
          state.db.returns.unshift({
            id: uid('CN'), date: TODAY_ISO, orderId: 'MANUAL', customerId: cid,
            productName: fd.get('productName'), qty: Number(fd.get('qty')) || 1,
            amount: amt, reason: fd.get('reason').trim()
          });
          const c = getCustomer(cid);
          if (c) c.outstanding = Math.max(0, c.outstanding - amt);
          saveDB(); closeModal(); renderApp();
          showToast('Credit note issued!', 'success');
        },

        exportActiveReport() {
          const rep = buildReportData(state.activeReport);
          exportCSV(`ERP_GO_${state.activeReport}`, rep.headers, rep.rows);
        },

        togglePerm(userId, perm, val) {
          const u = state.db.users.find(x => x.id === userId);
          if (!u) return;
          u.permissions[perm] = val;
          saveDB(); renderApp();
          showToast(`Permission updated for ${u.role}`, 'info');
        },

        exportBackupJSON() {
          const blob = new Blob([JSON.stringify(state.db, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ERP_GO_Backup_${TODAY_ISO}.json`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('Full JSON backup downloaded!', 'success');
        },

        importBackupJSON(ev) {
          const file = ev.target.files && ev.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const parsed = JSON.parse(e.target.result);
              if (!parsed.products || !parsed.customers || !parsed.orders) throw new Error('Invalid backup file.');
              state.db = parsed;
              saveDB(); closeModal(); renderApp();
              showToast('Backup restored successfully!', 'success');
            } catch (err) {
              showToast(err.message, 'error');
            }
          };
          reader.readAsText(file);
        },

        confirmResetDB() {
          state.db = getSeedDB();
          state.cart.items = [];
          state.poDraft.items = [];
          saveDB(); closeModal(); renderApp();
          showToast('Demo data restored!', 'success');
        }
      };

      // Close modal on backdrop click
      document.getElementById('modal-backdrop').addEventListener('click', (e) => {
        if (e.target.id === 'modal-backdrop') closeModal();
      });

      // Expose global helpers referenced in static HTML header
      window.switchRole = switchRole;
      window.triggerManualSync = triggerManualSync;
      window.openSettingsModal = openSettingsModal;

 
      let signedIn = false;
      function demoAccounts() {
        const admin = {dashboard:true,catalogues:true,salesApp:true,purchase:true,reports:true,viewProfit:true};
        return [
          {id:'LOT-ADMIN-1',name:'Shabeer',email:'shabeer@lotus.com',role:'Admin',permissions:{...admin}},
          {id:'LOT-ADMIN-2',name:'Nawas',email:'nawas@lotus.com',role:'Admin',permissions:{...admin}},
          ...(state.db.salesmen||[]).map(s=>({id:'LOT-'+s.id,name:s.name,email:s.name.toLowerCase().replace(/[^a-z0-9]+/g,'.')+'@lotus.com',role:'Salesman',salesmanId:s.id,permissions:{dashboard:false,catalogues:true,salesApp:true,purchase:false,reports:false,viewProfit:false}})),
          {id:'LOT-ACC',name:'Accounts Staff',email:'accounts@lotus.com',role:'Accountant',permissions:{dashboard:true,catalogues:true,salesApp:false,purchase:true,reports:true,viewProfit:true}},
          {id:'LOT-AUD',name:'Auditor',email:'auditor@lotus.com',role:'Auditor',permissions:{dashboard:true,catalogues:false,salesApp:false,purchase:false,reports:false,viewProfit:false}}
        ];
      }
      function loginOptions() {
        const role=document.getElementById('login-role').value;
        const names=document.getElementById('login-name');
        names.innerHTML=demoAccounts().filter(u=>u.role===role).map(u=>'<option value="'+esc(u.id)+'">'+esc(u.name)+'</option>').join('');
        loginEmail();
      }
      function loginEmail() {
        const u=demoAccounts().find(u=>u.id===document.getElementById('login-name').value);
        document.getElementById('login-email').value=u?u.email:'';
        document.getElementById('login-error').textContent='';
      }
      function showLogin() {
        signedIn=false;
        document.body.classList.remove('erp-signed-in');
        document.getElementById('erp-login').hidden=false;
        document.getElementById('erp-splash').hidden=true;
        document.getElementById('login-password').value='123456';
        loginOptions();
      }
      function signIn(e) {
        e.preventDefault();
        const u=demoAccounts().find(u=>u.id===document.getElementById('login-name').value && u.role===document.getElementById('login-role').value);
        if(!u||document.getElementById('login-password').value!=='123456'){document.getElementById('login-error').textContent='Invalid demo credentials.';return;}
        state.db.users=(state.db.users||[]).filter(x=>x.id!==u.id);
        state.db.users.push(u);
        state.activeUserId=u.id;
        state.activeTab=u.role==='Salesman'?'salesApp':'dashboard';
        signedIn=true;
        document.getElementById('erp-login').hidden=true;
        document.getElementById('login-password').value='';
        document.body.classList.add('erp-signed-in');
        renderApp();
      }
      function signOut(){closeModal();state.cart.items=[];showLogin();}
      function bootLogin(){
        document.getElementById('login-role').addEventListener('change',loginOptions);
        document.getElementById('login-name').addEventListener('change',loginEmail);
        document.getElementById('login-form').addEventListener('submit',signIn);
        document.getElementById('erp-signout').addEventListener('click',signOut);
        setTimeout(function(){showLogin();document.querySelector('#login-form button').disabled=false;},600);
      }
      // Boot App
      loadDB();
      bootLogin();
    })();
  