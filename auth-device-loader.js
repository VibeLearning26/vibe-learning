(() => {
  document.documentElement.dataset.authDeviceLoader = 'started';

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
})();
