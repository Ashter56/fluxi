import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
const log = console.log;

export enum WebSocketEvent {
  LIKE = 'like',
  NEW_TASK = 'new_task',
  TASK_STATUS_UPDATE = 'task_status_update',
  PING = 'ping'
}

export interface WebSocketMessage {
  type: WebSocketEvent;
  data: any;
}

let clients = new Map<WebSocket, { userId?: number }>();

export function setupWebSocketServer(server: Server) {
  log('Setting up WebSocket server', 'websocket');
  
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    log('WebSocket client connected', 'websocket');
    clients.set(ws, {});
    
    ws.on('message', (message: string) => {
      try {
        const parsedMessage = JSON.parse(message) as { type: string; userId?: number; data?: any };
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
    
    ws.on('close', () => {
      log('WebSocket client disconnected', 'websocket');
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      log(`WebSocket error: ${error.message}`, 'websocket');
      clients.delete(ws);
    });
    
    ws.send(JSON.stringify({ type: WebSocketEvent.PING, data: { message: 'Connected to Fluxion WebSocket server' } }));
  });
  
  log('WebSocket server setup complete', 'websocket');
  return wss;
}

export function broadcastMessage(event: WebSocketEvent, data: any) {
  const message: WebSocketMessage = { type: event, data };
  const messageStr = JSON.stringify(message);
  
  log(`Broadcasting ${event} event to ${clients.size} clients`, 'websocket');
  
  clients.forEach((_, client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

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
