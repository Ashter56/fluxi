// This script can be imported to disable HMR (Hot Module Replacement) on specific pages
// This can help reduce WebSocket reconnection issues in environments with unstable connections

// Function to disable HMR for the current module
export function disableHMR() {
  // Access the import.meta.hot object which is provided by Vite
  if (import.meta.hot) {
    // Disable HMR for this module
    import.meta.hot.decline();
    
    // Log that HMR is disabled
    console.log('[HMR] Hot Module Replacement disabled for this module');
  }
}

// Function to reduce HMR refresh frequency
export function reduceHMRFrequency() {
  if (import.meta.hot) {
    // Set a very long timeout for accepting updates
    const originalAccept = import.meta.hot.accept;
    import.meta.hot.accept = (...args) => {
      // Delay the acceptance of updates by 5 seconds
      setTimeout(() => {
        originalAccept.apply(import.meta.hot, args);
      }, 5000);
    };
    
    console.log('[HMR] Hot Module Replacement frequency reduced');
  }
}

// Function to force a WebSocket disconnection to prevent issues
export function stabilizeWebsocket() {
  // Get all WebSocket connections related to Vite
  const viteWebsockets = Array.from(document.querySelectorAll('script'))
    .filter(script => script.src && script.src.includes('vite'))
    .map(() => {
      // This is a heuristic - we can't directly access Vite's WebSocket
      return window.__vite_ws;
    })
    .filter(Boolean);
    
  // Close any active WebSockets to prevent continual reconnection attempts
  viteWebsockets.forEach(ws => {
    if (ws && ws.close) {
      ws.close();
      console.log('[HMR] WebSocket connection closed to stabilize app');
    }
  });
}

// Export a default function that applies all stabilization techniques
export default function stabilizeApp() {
  disableHMR();
  reduceHMRFrequency();
  stabilizeWebsocket();
}