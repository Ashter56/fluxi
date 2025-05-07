// This module forcibly disables Vite's HMR functionality

export function disableHMR() {
  if (typeof window !== 'undefined') {
    console.log('[Custom] Disabling Vite HMR completely');
    
    // @ts-ignore - Forcibly disable HMR
    if (import.meta.hot) {
      // @ts-ignore
      import.meta.hot = null;
    }
    
    // Block location.reload
    const originalReload = window.location.reload;
    window.location.reload = function() {
      console.log('[Custom] Blocked page reload attempt');
      return false;
    };
    
    // Block WebSockets
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      if (url && typeof url === 'string' && 
          (url.includes('vite') || url.includes('hmr'))) {
        console.log('[Custom] Blocked WebSocket connection to:', url);
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
    
    // Block polling messages
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('server connection lost') || 
           args[0].includes('Polling for restart'))) {
        return;
      }
      return originalConsoleLog.apply(this, args);
    };
  }
}

export function reduceHMRFrequency() {
  if (typeof window !== 'undefined' && import.meta.hot) {
    // Only ping the server at 10-minute intervals
    // @ts-ignore
    import.meta.hot.reconnect = true;
    // @ts-ignore
    import.meta.hot.timeout = 600000; // 10 minutes in milliseconds
  }
}

export function stabilizeWebsocket() {
  if (typeof window !== 'undefined') {
    // Capture any HMR-related errors and prevent them from crashing the app
    window.addEventListener('error', function(event) {
      if (event.message && (
          event.message.includes('WebSocket') || 
          event.message.includes('vite') || 
          event.message.includes('hmr'))) {
        event.preventDefault();
        event.stopPropagation();
        console.log('[Custom] Suppressed WebSocket error:', event.message);
        return true;
      }
    }, true);
  }
}

export default function stabilizeApp() {
  disableHMR();
  reduceHMRFrequency();
  stabilizeWebsocket();
  console.log('[Custom] App stabilized by disabling HMR and WebSocket refreshing');
}