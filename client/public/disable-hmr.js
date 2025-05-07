// This script will be injected into the page to completely disable Vite's HMR
console.log('[Custom] Disabling Vite HMR refresh cycles');

// Override window.location.reload to prevent automatic page refreshes
const originalReload = window.location.reload;
window.location.reload = function() {
  console.log('[Custom] Blocked automatic page reload');
  return false;
};

// Block WebSocket connections that match Vite's HMR pattern
const originalWebSocket = window.WebSocket;
window.WebSocket = function(url, protocols) {
  if (url && (url.includes('hmr') || url.includes('vite'))) {
    console.log('[Custom] Blocked HMR WebSocket connection to:', url);
    // Return a fake WebSocket that does nothing
    return {
      addEventListener: () => {},
      removeEventListener: () => {},
      send: () => {},
      close: () => {},
      dispatchEvent: () => {},
    };
  }
  return new originalWebSocket(url, protocols);
};

console.log('[Custom] HMR blocking initialized');