export default {
  server: {
    hmr: {
      clientPort: 443, // Required for Replit's proxy
      protocol: "wss", // Force secure connection
      path: "/hmr",    // Custom HMR path
    },
    watch: {
      usePolling: true, // Use polling instead of WebSockets
      interval: 3000,   // Check every 3 seconds
    },
  },
};