(() => {
    const nativeAlert = window.alert.bind(window);
    const nativeConfirm = window.confirm.bind(window);
    const queue = [];
    let active;
    let dialog;

    function createDialog() {
        const element = document.createElement('dialog');
        element.className = 'care-dialog';
        element.setAttribute('aria-labelledby', 'care-dialog-title');
        element.setAttribute('aria-describedby', 'care-dialog-message');
        element.innerHTML = `
            <div class="care-dialog-heading">
                <span class="care-dialog-result" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" focusable="false">
                        <path class="care-dialog-tick" pathLength="1" d="m5 12 4 4L19 6"/>
                        <path class="care-dialog-cross" pathLength="1" d="m6 6 12 12"/>
                        <path class="care-dialog-cross" pathLength="1" d="M18 6 6 18"/>
                    </svg>
                </span>
                <header id="care-dialog-title"></header>
            </div>
            <p id="care-dialog-message"></p>
            <div class="care-dialog-actions">
                <button type="button" data-care-cancel>Cancel</button>
                <button type="button" data-care-accept>OK</button>
            </div>`;
        element.querySelector('[data-care-cancel]').addEventListener('click', () => element.close('cancel'));
        element.querySelector('[data-care-accept]').addEventListener('click', () => element.close('accept'));
        element.addEventListener('cancel', event => {
            event.preventDefault();
            element.close('cancel');
        });
        element.addEventListener('close', () => finish(element.returnValue === 'accept'));
        document.body.append(element);
        return element;
    }

    function finish(accepted) {
        const current = active;
        active = null;
        current?.resolve(accepted);
        if (queue.length) {
            showNext();
        } else if (current?.restore?.isConnected && !document.activeElement?.closest('dialog[open]')) {
            current.restore.focus({ preventScroll: true });
        }
    }

    function showNext() {
        if (active || !queue.length) return;
        active = queue.shift();
        try {
            dialog ||= createDialog();
            if (typeof dialog.showModal !== 'function') throw new Error('Dialog unavailable');
            const cancel = dialog.querySelector('[data-care-cancel]');
            const accept = dialog.querySelector('[data-care-accept]');
            dialog.dataset.tone = active.tone;
            dialog.querySelector('#care-dialog-title').textContent = active.title;
            dialog.querySelector('#care-dialog-message').textContent = active.message;
            cancel.hidden = !active.confirm;
            accept.textContent = active.action;
            dialog.returnValue = 'cancel';
            dialog.showModal();
            (active.confirm ? cancel : accept).focus();
        } catch {
            if (active.confirm) finish(nativeConfirm(active.message));
            else {
                nativeAlert(active.message);
                finish(false);
            }
        }
    }

    function enqueue(options) {
        return new Promise(resolve => {
            queue.push({ ...options, resolve, restore: active?.restore ?? document.activeElement });
            showNext();
        });
    }

    window.careNotice = (message, tone) => {
        const text = String(message ?? '');
        const failure = /\b(error|fail(?:ed|ure)?|unable|could not|cannot|denied|unsuccessful|not (?:saved|updated|submitted|added|deleted))\b/i.test(text);
        const warning = /\b(must|required|invalid)\b/i.test(text);
        const success = /\b(saved|updated|submitted|added|successfully|deleted)\b/i.test(text);
        const kind = tone || (failure ? 'error' : warning ? 'warning' : success ? 'success' : 'info');
        return enqueue({
            message: text,
            tone: kind,
            title: { error: 'Action failed', warning: 'Warning', success: 'Success' }[kind] || 'Notice',
            action: 'OK'
        });
    };
    window.careConfirm = (message, options = {}) => {
        const text = String(message ?? '');
        const destructive = /\b(permanently delete|remove this|^delete)\b/i.test(text);
        return enqueue({
            message: text,
            tone: destructive ? 'danger' : 'warning',
            title: options.title || 'Confirm action',
            action: options.action || (destructive ? 'Delete' : 'Continue'),
            confirm: true
        });
    };

    // Preserve the return behavior of legacy alerts. Confirmations opt in and await a choice.
    window.alert = message => { void window.careNotice(message); };
})();
