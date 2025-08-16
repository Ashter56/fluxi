// Production-only WebSocket blocking
(function() {
  // Only run in production environment
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.log("[Production] Disabling WebSocket connections");

    // Block WebSocket initialization
    window.WebSocket = function() {
      throw new Error('WebSocket is disabled in production');
    };
    
    // Block any existing WebSocket instances
    Object.defineProperty(window, 'WebSocket', {
      value: function() {
        throw new Error('WebSocket is disabled in production');
      },
      writable: false,
      configurable: false
    });

    // Block HMR polling messages
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
})();
