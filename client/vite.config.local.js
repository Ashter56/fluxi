// This file will not be used directly but documents the settings we're configuring
// in .env.local for future reference

export default {
  server: {
    hmr: {
      clientPort: 443, // Required for Replit's proxy
      protocol: 'wss', // Force secure WebSocket
      timeout: 30000,  // Retry every 30 seconds
    },
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
};