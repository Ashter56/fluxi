// This script completely disables Vite's HMR and WebSocket connections
(function() {
  console.log('[ViteFix] Applying aggressive WebSocket and HMR fixes');
  
  try {
    // Block all WebSocket connections from Vite
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      if (url && typeof url === 'string') {
        // If it's a Vite connection attempt, return a dummy WebSocket
        if (url.includes('vite') || url.includes('hmr') || url.includes('ws') || url.includes('localhost')) {
          console.log('[ViteFix] Blocked WebSocket connection:', url);
          return {
            url,
            CONNECTING: 0,
            OPEN: 1,
            CLOSING: 2,
            CLOSED: 3,
            readyState: 3,
            onopen: null,
            onclose: null,
            onmessage: null,
            onerror: null,
            addEventListener: function() {},
            removeEventListener: function() {},
            dispatchEvent: function() { return true; },
            send: function() {},
            close: function() {}
          };
        }
      }
      
      // Allow non-Vite WebSockets to proceed normally
      return new originalWebSocket(url, protocols);
    };
  } catch (e) {
    console.log('[ViteFix] Could not override WebSocket constructor');
  }
  
  // Intercept history changes instead of trying to override location.reload
  try {
    // Monitor navigation changes
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      console.log('[ViteFix] Intercepted history change');
      return originalPushState.apply(this, args);
    };
  } catch (e) {
    console.log('[ViteFix] Could not intercept history API');
  }
  
  // Prevent console.log from showing the connection lost message
  const originalConsoleLog = console.log;
  console.log = function(...args) {
    if (args[0] && typeof args[0] === 'string') {
      if (args[0].includes('server connection lost') || args[0].includes('Polling for restart')) {
        return;
      }
    }
    return originalConsoleLog.apply(this, args);
  };
  
  // Create a MutationObserver to remove any dynamically added Vite-related scripts
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'SCRIPT') {
            const scriptSrc = node.src || '';
            if (scriptSrc.includes('vite') || scriptSrc.includes('hmr')) {
              console.log('[ViteFix] Removing Vite script:', scriptSrc);
              node.parentNode.removeChild(node);
            }
          }
        });
      }
    });
  });
  
  // Start observing the document
  observer.observe(document, { childList: true, subtree: true });
  
  console.log('[ViteFix] All Vite HMR fixes applied successfully');
})();