// This file will not be used directly but documents the settings we're configuring
// in .env.local for future reference

export default {
  server: {
    hmr: false, // Completely disable HMR to prevent connection issues
    watch: {
      usePolling: false, // Disable file polling 
    },
  },
};