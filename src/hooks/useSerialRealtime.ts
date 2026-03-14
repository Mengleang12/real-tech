import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getEcho } from "@/lib/echo";

export interface SerialChangedEvent {
  action: string;
  product_id: number;
  variant_id: number | null;
  serial_ids: number[];
  timestamp: string;
}

/**
 * Listen for serial number changes via Laravel Reverb WebSocket.
 * Falls back to polling if WebSocket is disconnected.
 */
export function useSerialRealtime(onSerialsAdded?: (event: SerialChangedEvent) => void) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const callbackRef = useRef(onSerialsAdded);
  callbackRef.current = onSerialsAdded;

  const invalidateSerials = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-serials"] });
    queryClient.invalidateQueries({ queryKey: ["product-serials"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stock"] });
  }, [queryClient]);

  // WebSocket listener
  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getEcho>['channel']> | null = null;

    try {
      const echo = getEcho();
      channel = echo.channel('serials');

      channel.listen('.serial.changed', (event: SerialChangedEvent) => {
        invalidateSerials();

        if (event.action === 'added' && event.serial_ids?.length > 0 && callbackRef.current) {
          callbackRef.current(event);
        }
      });

      const connector = (echo as any).connector?.pusher;
      if (connector) {
        connector.connection.bind('connected', () => setConnected('connected'));
        connector.connection.bind('disconnected', () => setConnected('disconnected'));
        connector.connection.bind('error', () => setConnected('disconnected'));
        if (connector.connection.state === 'connected') {
          setConnected('connected');
        }
      }
    } catch (e) {
      console.warn('WebSocket connection failed:', e);
      setConnected('disconnected');
    }

    return () => {
      try {
        if (channel) {
          getEcho().leaveChannel('serials');
        }
      } catch {}
    };
  }, [queryClient, invalidateSerials]);

  // Polling fallback: refresh every 5s when disconnected, every 15s when connected
  useEffect(() => {
    const interval = setInterval(() => {
      invalidateSerials();
    }, connected === 'connected' ? 15000 : 5000);

    return () => clearInterval(interval);
  }, [connected, invalidateSerials]);

  return connected;
}
