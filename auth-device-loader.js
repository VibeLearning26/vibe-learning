(() => {
  document.documentElement.dataset.authDeviceLoader = 'started';

  let loadStarted = false;

  function loadAuthDevice() {
    if (loadStarted) return;
    loadStarted = true;

    const cacheBuster = Date.now();
    import(`./auth-device-3d.js?v=${cacheBuster}`)
    .then(() => {
      document.documentElement.dataset.authDeviceLoader = 'loaded';
    })
    .catch((error) => {
      const message = error?.message || String(error);
      document.documentElement.dataset.authDeviceLoader = 'error';
      document.documentElement.dataset.authDeviceLoaderError = message;
      window.authDeviceLoaderError = message;
      document.body.classList.add('auth-device-error', 'auth-device-fallback');
      console.error('Authentication device failed to load:', error);
    });
  }

  const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  if (!mobile) {
    loadAuthDevice();
    return;
  }

  window.addEventListener('pointerdown', loadAuthDevice, { once: true, passive: true });
  window.addEventListener('keydown', loadAuthDevice, { once: true });

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadAuthDevice, { timeout: 2200 });
  } else {
    window.setTimeout(loadAuthDevice, 1600);
  }
})();
