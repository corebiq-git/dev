(() => {
    const loaderUrl = new URL('../assets/trefoil-loader.svg', document.currentScript.src).href;

    window.createCareLoader = function(label = 'Loading', variant = 'module') {
        const loader = document.createElement('div');
        loader.className = 'care-loading';
        loader.dataset.variant = variant;
        loader.setAttribute('role', 'status');
        const icon = document.createElement('img');
        icon.className = 'care-loading-icon';
        icon.src = loaderUrl;
        icon.alt = '';
        const sweep = document.createElement('span');
        sweep.className = 'care-loading-sweep';
        sweep.setAttribute('aria-hidden', 'true');
        const message = document.createElement('span');
        message.className = 'care-loading-label';
        message.textContent = label;
        loader.append(icon, sweep, message);
        return loader;
    };

    const startup = document.getElementById('care-startup');
    if (!startup) return;
    const timeout = window.setTimeout(() => {
        startup.querySelector('.care-loading').hidden = true;
        startup.querySelector('.care-startup-retry').hidden = false;
    }, 15000);
    window.finishCareStartup = () => {
        window.clearTimeout(timeout);
        startup.remove();
    };
})();
