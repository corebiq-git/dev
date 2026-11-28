if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', {updateViaCache:'none'}).then(reg => reg.update()).catch(error => console.warn('ERP-GO offline setup failed:', error));
  });
}
