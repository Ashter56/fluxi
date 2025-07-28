import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
const log = console.log;

// Define event types for the WebSocket messages
export enum WebSocketEvent {
  LIKE = 'like',
  NEW_TASK = 'new_task',
  TASK_STATUS_UPDATE = 'task_status_update',
  PING = 'ping'
}

// Define a type for WebSocket messages
export interface WebSocketMessage {
  type: WebSocketEvent;
  data: any;
}

// WebSocket clients will be stored in this map
let clients = new Map<WebSocket, { userId?: number }>();

export function setupWebSocketServer(server: Server) {
  log('Setting up WebSocket server at /ws path', 'websocket');
  
  // Create a WebSocket server on the same HTTP server but at /ws path
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  wss.on('connection', (ws: WebSocket) => {
    log('WebSocket client connected', 'websocket');
    
    // Store the client in our map without a userId initially
    clients.set(ws, {});
    
    // Handle incoming messages from clients
    ws.on('message', (message: string) => {
      try {
        const parsedMessage = JSON.parse(message) as { type: string; userId?: number; data?: any };
        
        // Handle authentication message to associate user with the connection
        if (parsedMessage.type === 'auth' && parsedMessage.userId) {
          const clientInfo = clients.get(ws);
          if (clientInfo) {
            clientInfo.userId = parsedMessage.userId;
            log(`WebSocket client authenticated with userId: ${parsedMessage.userId}`, 'websocket');
          }
        }
      } catch (error) {
        log(`Error parsing WebSocket message: ${error}`, 'websocket');
      }
    });
    
    // Handle client disconnection
    ws.on('close', () => {
      log('WebSocket client disconnected', 'websocket');
      clients.delete(ws);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      log(`WebSocket error: ${error.message}`, 'websocket');
      clients.delete(ws);
    });
    
    // Send initial ping to confirm connection
    ws.send(JSON.stringify({ type: WebSocketEvent.PING, data: { message: 'Connected to Fluxion WebSocket server' } }));
  });
  
  log('WebSocket server setup complete', 'websocket');
  return wss;
}

// Function to broadcast messages to all connected clients
export function broadcastMessage(event: WebSocketEvent, data: any) {
  const message: WebSocketMessage = { type: event, data };
  const messageStr = JSON.stringify(message);
  
  log(`Broadcasting ${event} event to ${clients.size} clients`, 'websocket');
  
  clients.forEach((clientInfo, client) => {
    // Only send to clients whose WebSocket connection is open
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Utility function to send a message to a specific user
export function sendToUser(userId: number, event: WebSocketEvent, data: any) {
  const message: WebSocketMessage = { type: event, data };
  const messageStr = JSON.stringify(message);
  
  let sentToAny = false;
  
  clients.forEach((clientInfo, client) => {
    if (clientInfo.userId === userId && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
      sentToAny = true;
    }
  });
  
  log(`Sent ${event} event to user ${userId}: ${sentToAny ? 'success' : 'no matching clients'}`, 'websocket');
}
