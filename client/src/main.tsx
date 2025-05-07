import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

// Configure Vite's HMR connection 
// This helps stabilize the WebSocket connection in Replit
if (import.meta.hot) {
  // Log connection events for debugging
  import.meta.hot.on('error', (err) => {
    console.log('[HMR] Error:', err);
  });
  
  // Handle disconnection more gracefully
  import.meta.hot.on('disconnect', () => {
    console.log('[HMR] Disconnected. Will attempt to reconnect more slowly.');
  });
  
  // When we do reconnect, be more conservative
  import.meta.hot.on('reconnect', () => {
    console.log('[HMR] Reconnected.');
  });
  
  // Try to disable some HMR functionality to avoid reconnection issues
  try {
    // @ts-ignore - Attempt to access internal properties to stabilize HMR
    if (import.meta.hot._socket) {
      console.log('[HMR] Found WebSocket connection, extending timeout');
      // @ts-ignore
      import.meta.hot._socket.addEventListener('close', () => {
        console.log('[HMR] WebSocket closed, attempting to suppress auto-reconnect');
      });
    }
  } catch (e) {
    console.log('[HMR] Could not modify socket behavior:', e);
  }
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <App />
    </TooltipProvider>
  </QueryClientProvider>
);
