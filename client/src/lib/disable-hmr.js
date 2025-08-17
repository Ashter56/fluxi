// This module forcibly disables Vite's HMR functionality
export function disableHMR() {
  if (typeof window !== 'undefined') {
    console.log('[Production] Disabling HMR completely');
    
    // Disable HMR via import.meta.hot
    if (import.meta.hot) {
      try {
        import.meta.hot.dispose(() => {});
        import.meta.hot.accept(() => {});
        import.meta.hot.decline();
      } catch (e) {
        console.log('[Production] Could not disable HMR');
      }
    }
    
    // Block WebSocket connections safely without replacing the constructor
    const originalWebSocket = window.WebSocket;
    
    window.WebSocket = function(...args) {
      const url = args[0];
      if (url && typeof url === 'string' && 
          (url.includes('vite') || url.includes('hmr'))) {
        console.log('[Production] Blocking WebSocket to:', url);
        return {
          addEventListener: () => {},
          removeEventListener: () => {},
          send: () => {},
          close: () => {},
          readyState: 3 // CLOSED
        };
      }
      return new originalWebSocket(...args);
    };
  }
}

export default function stabilizeApp() {
  if (process.env.NODE_ENV === 'production') {
    disableHMR();
    console.log('[Production] App stabilized by disabling HMR');
  }
}
