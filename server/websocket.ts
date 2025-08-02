import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "http";
import { storage } from "./storage";

export enum WebSocketEvent {
  NEW_TASK = "NEW_TASK",
  TASK_STATUS_UPDATE = "TASK_STATUS_UPDATE",
  LIKE = "LIKE"
}

let wss: WebSocketServer;

export function setupWebSocketServer(server: Server) {
  console.log('Setting up WebSocket server');
  wss = new WebSocketServer({ server }); // REMOVED PATH PARAMETER
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  console.log('WebSocket server setup complete');
  return wss;
}

export function broadcastMessage(event: WebSocketEvent, data: any) {
  if (!wss) return;
  
  const message = JSON.stringify({ event, data });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
