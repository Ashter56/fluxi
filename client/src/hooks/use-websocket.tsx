import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './auth-provider';
import { queryClient } from '@/lib/queryClient';
import { TaskWithDetails } from '@shared/schema';
import { useToast } from './use-toast';

// Define the same event types as on the server
export enum WebSocketEvent {
  LIKE = 'like',
  NEW_TASK = 'new_task',
  TASK_STATUS_UPDATE = 'task_status_update',
  PING = 'ping'
}

// Interface for WebSocket messages
interface WebSocketMessage {
  type: WebSocketEvent;
  data: any;
}

export function useWebSocket() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Event subscription system
  const eventListeners = useRef<{
    [key in WebSocketEvent]?: Array<(data: any) => void>
  }>({});
  
  // Add a subscription to a specific event type
  const subscribe = useCallback((event: WebSocketEvent, callback: (data: any) => void) => {
    // Initialize listener array if needed
    if (!eventListeners.current[event]) {
      eventListeners.current[event] = [];
    }
    
    // Add the callback to the listeners
    eventListeners.current[event]?.push(callback);
    
    // Return an unsubscribe function
    return () => {
      if (eventListeners.current[event]) {
        eventListeners.current[event] = eventListeners.current[event]?.filter(
          cb => cb !== callback
        );
      }
    };
  }, []);
  
  // Function to call all registered event listeners
  const notifyEventListeners = useCallback((event: WebSocketEvent, data: any) => {
    if (eventListeners.current[event]) {
      eventListeners.current[event]?.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} event listener:`, error);
        }
      });
    }
  }, []);
  
  // Handle like/unlike events from the WebSocket
  const handleLikeEvent = useCallback((data: TaskWithDetails & { action: 'like' | 'unlike' }) => {
    const taskId = data.id;
    
    // Invalidate all task-related queries to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId] });
    
    // Notify subscribers
    notifyEventListeners(WebSocketEvent.LIKE, data);
    
    // Not showing a toast for likes to avoid too many notifications
  }, [notifyEventListeners]);
  
  // Handle new task events from the WebSocket
  const handleNewTaskEvent = useCallback((task: TaskWithDetails) => {
    // Instead of manually updating the cache, invalidate the tasks query
    // This will trigger a refetch
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    
    // Also invalidate the pending count query to update the counter
    queryClient.invalidateQueries({ queryKey: ['/api/tasks/pending-count'] });
    
    // Show a toast notification for new tasks
    if (user && task.userId !== user.id) {
      toast({
        title: "New Task",
        description: `${task.user.displayName} created a new task: ${task.title}`,
      });
    }
    
    // Notify subscribers
    notifyEventListeners(WebSocketEvent.NEW_TASK, task);
  }, [user, toast, notifyEventListeners]);
  
  // Handle task status update events from the WebSocket
  const handleTaskStatusUpdateEvent = useCallback((task: TaskWithDetails) => {
    const taskId = task.id;
    
    // Instead of manually updating caches, invalidate the relevant queries
    // This will trigger refetches that will pull fresh data from the server
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId] });
    
    // Also invalidate the pending count query to update the counter
    queryClient.invalidateQueries({ queryKey: ['/api/tasks/pending-count'] });
    
    // Show a toast notification for task status updates (only for other users' tasks)
    if (user && task.userId !== user.id) {
      let statusText = "";
      switch(task.status) {
        case "pending":
          statusText = "pending";
          break;
        case "in_progress":
          statusText = "in progress";
          break;
        case "done":
          statusText = "completed";
          break;
      }
      
      toast({
        title: "Task Updated",
        description: `${task.user.displayName} marked "${task.title}" as ${statusText}`,
      });
    }
    
    // Notify subscribers
    notifyEventListeners(WebSocketEvent.TASK_STATUS_UPDATE, task);
  }, [user, toast, notifyEventListeners]);

  // Function to connect to the WebSocket server
  const connect = useCallback(() => {
    // Cleanup any existing connection
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    try {
      // Determine the correct WebSocket URL based on the current protocol and host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      // Create a new WebSocket connection
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      // Handle the connection opening
      socket.onopen = () => {
        console.log('WebSocket connection established');
        setConnected(true);
        
        // If the user is logged in, send authentication info
        if (user) {
          socket.send(JSON.stringify({
            type: 'auth',
            userId: user.id
          }));
        }
      };
      
      // Handle incoming messages
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          
          switch (message.type) {
            case WebSocketEvent.LIKE:
              handleLikeEvent(message.data);
              break;
            case WebSocketEvent.NEW_TASK:
              handleNewTaskEvent(message.data);
              break;
            case WebSocketEvent.TASK_STATUS_UPDATE:
              handleTaskStatusUpdateEvent(message.data);
              break;
            case WebSocketEvent.PING:
              // Just a connection test, no action needed
              break;
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      // Handle connection closure
      socket.onclose = (event) => {
        console.log(`WebSocket connection closed. Code: ${event.code}`);
        setConnected(false);
        
        // Attempt to reconnect after a delay
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect WebSocket...');
          connect();
        }, 3000); // Try to reconnect after 3 seconds
      };
      
      // Handle errors
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        // The onclose handler will be called automatically after an error
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      
      // Try again after a delay
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect WebSocket after error...');
        connect();
      }, 5000); // Try to reconnect after 5 seconds
    }
  }, [user, handleLikeEvent, handleNewTaskEvent, handleTaskStatusUpdateEvent]);
  
  // Connect when the component mounts and when user changes
  useEffect(() => {
    connect();
    
    // Cleanup function to close the WebSocket when the component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);
  
  return { connected, subscribe };
}