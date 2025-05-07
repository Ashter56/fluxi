import { createContext, ReactNode, useContext } from 'react';
import { useWebSocket } from './use-websocket';

// Create a context for WebSocket connection status
interface WebSocketContextType {
  connected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  // Initialize the WebSocket connection
  const { connected } = useWebSocket();
  
  return (
    <WebSocketContext.Provider value={{ connected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook to access WebSocket connection status
export function useWebSocketStatus() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketStatus must be used within a WebSocketProvider');
  }
  return context;
}