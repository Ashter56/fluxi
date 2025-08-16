// This module forcibly disables Vite's HMR functionality
export function disableHMR() {
  if (typeof window !== 'undefined') {
    console.log('[Production] Disabling WebSocket and HMR completely');
    
    // Completely disable WebSocket in production
    window.WebSocket = class BlockedWebSocket {
      constructor() {
        console.error('[Production] WebSocket is disabled in production');
        throw new Error('WebSocket is disabled in production');
      }
    };

    // Disable HMR
    if (import.meta.hot) {
      try {
        import.meta.hot.dispose(() => {});
        import.meta.hot.accept(() => {});
        import.meta.hot.decline();
      } catch (e) {
        console.log('[Production] Could not disable HMR');
      }
    }
  }
}

export default function stabilizeApp() {
  if (process.env.NODE_ENV === 'production') {
    disableHMR();
    console.log('[Production] App stabilized by disabling HMR and WebSocket');
  }
}
