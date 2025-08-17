// Production-only WebSocket blocking
(function() {
  // Only run in production environment
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.log("[Production] Blocking HMR WebSocket connections");
    
    // Save the original WebSocket implementation
    const originalWebSocket = window.WebSocket;
    
    // Create a wrapper function for WebSocket
    window.WebSocket = function(...args) {
      const url = args[0];
      
      // Block only Vite/HMR-related WebSocket connections
      if (url && typeof url === 'string' && 
          (url.includes('vite') || url.includes('hmr'))) {
        console.log("[Production] Blocked WebSocket to:", url);
        return {
          addEventListener: () => {},
          removeEventListener: () => {},
          send: () => {},
          close: () => {},
          readyState: 3 // CLOSED
        };
      }
      
      // Allow other WebSocket connections
      return new originalWebSocket(...args);
    };
  }
})();
