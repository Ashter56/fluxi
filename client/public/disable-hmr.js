// Simple solution that just filters out console messages
(function() {
  // Only need to filter the console messages to hide them
  const originalConsoleLog = console.log;
  console.log = function(...args) {
    // If the message includes server connection lost or polling, filter it
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('server connection lost') || 
         args[0].includes('Polling for restart'))) {
      return; // Don't log these messages
    }
    return originalConsoleLog.apply(this, args);
  };
  
  console.log("HMR messages are now hidden");
})();