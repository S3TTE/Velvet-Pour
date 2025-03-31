import { useState, useCallback, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketIOServiceOptions {
  url: string;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  autoConnect?: boolean;
  query?: Record<string, string>;
  extraHeaders?: Record<string, string>;
}

export class SocketIOService {
  private socket: Socket | null = null;
  private url: string;
  private options: Partial<SocketIOServiceOptions>;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(options: SocketIOServiceOptions) {
    this.url = options.url;
    
    // Remove the url from options to avoid duplication
    const { url, ...restOptions } = options;
    this.options = restOptions;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Close existing connection if any
      this.disconnect();

      try {
        this.socket = io(this.url, {
          reconnectionAttempts: this.options.reconnectionAttempts || 5,
          reconnectionDelay: this.options.reconnectionDelay || 3000,
          autoConnect: this.options.autoConnect !== false,
          extraHeaders: this.options.extraHeaders,
          query: this.options.query
        });

        this.socket.on('connect', () => {
          console.log('Socket.IO connection established');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket.IO connection error:', error);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Socket.IO disconnected:', reason);
        });

        // Set up message listeners
        this.setupMessageListeners();
      } catch (error) {
        console.error('Failed to establish Socket.IO connection:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupMessageListeners(): void {
    if (!this.socket) return;

    // Standard Socket.IO events
    this.socket.on('status_update', (data) => {
      this.notifyListeners('status_update', data);
    });

    this.socket.on('operation_started', (data) => {
      this.notifyListeners('operation_started', data);
    });

    this.socket.on('operation_completed', (data) => {
      this.notifyListeners('operation_completed', data);
    });

    this.socket.on('operation_failed', (data) => {
      this.notifyListeners('operation_failed', data);
    });

    this.socket.on('message', (data) => {
      this.notifyListeners('message', data);
    });

    this.socket.on('pong_client', (data) => {
      this.notifyListeners('pong_client', data);
    });
  }

  emit(event: string, data?: any): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket.IO is not connected');
      return;
    }

    this.socket.emit(event, data);
  }

  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    const eventListeners = this.listeners.get(event)!;
    eventListeners.add(callback);

    // If we already have a socket, add the event listener directly
    if (this.socket) {
      this.socket.on(event, callback);
    }

    // Return unsubscribe function
    return () => {
      eventListeners.delete(callback);
      if (this.socket) {
        this.socket.off(event, callback);
      }
    };
  }

  private notifyListeners(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in listener for event ${event}:`, error);
        }
      });
    }
  }

  // Convenience methods for the VelvetPour application
  pingServer(): void {
    this.emit('ping_server', { time: new Date().toISOString() });
  }

  prepareDrink(drinkId: number): Promise<Response> {
    return fetch(`${this.url.replace(/^(ws|wss):\/\//, 'http://')}/prepCocktail/${drinkId}`, {
      method: 'POST'
    });
  }
}

// React Hook for easy Socket.IO management
export function useSocketIO(url: string, options: Omit<SocketIOServiceOptions, 'url'> = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [socketService] = useState(() => new SocketIOService({ url, ...options }));

  const connect = useCallback(async () => {
    try {
      await socketService.connect();
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err : new Error('Connection failed'));
    }
  }, [socketService]);

  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
  }, [socketService]);

  useEffect(() => {
    // Setup connection status tracking
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleError = (err: Error) => setError(err);

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('connect_error', handleError);

    // Connect on component mount
    connect();

    // Cleanup on component unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect, socketService]);

  return {
    socketService,
    isConnected,
    error,
    connect,
    disconnect
  };
}

// Example usage in a React or React Native component
/*
import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import { useSocketIO } from './socketIOService';

function VelvetPourApp() {
  const { socketService, isConnected } = useSocketIO('http://172.16.1.154:5000');
  const [status, setStatus] = useState('Unknown');
  const [operation, setOperation] = useState('None');

  useEffect(() => {
    // Subscribe to machine status updates
    const statusSub = socketService.on('status_update', (data) => {
      setStatus(data.status);
    });

    // Subscribe to operation events
    const startedSub = socketService.on('operation_started', (data) => {
      setStatus('busy');
      setOperation(data.operation);
    });

    const completedSub = socketService.on('operation_completed', (data) => {
      setStatus('available');
      setOperation('None');
    });

    // Send a ping when connected
    if (isConnected) {
      socketService.pingServer();
    }

    // Cleanup subscriptions
    return () => {
      statusSub();
      startedSub();
      completedSub();
    };
  }, [socketService, isConnected]);

  const prepareDrink = async (drinkId) => {
    try {
      const response = await socketService.prepareDrink(drinkId);
      const data = await response.json();
      console.log('Preparing drink:', data);
    } catch (error) {
      console.error('Error preparing drink:', error);
    }
  };

  return (
    <View>
      <Text>Connection: {isConnected ? 'Connected' : 'Disconnected'}</Text>
      <Text>Machine Status: {status}</Text>
      <Text>Current Operation: {operation}</Text>
      <Button title="Prepare Drink #1" onPress={() => prepareDrink(1)} />
    </View>
  );
}
*/