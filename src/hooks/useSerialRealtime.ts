import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getEcho } from "@/lib/echo";
import { serialsApi } from "@/lib/api";

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
 * Polling also detects NEW serials and triggers auto-print callback.
 */
export function useSerialRealtime(onSerialsAdded?: (event: SerialChangedEvent) => void) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const callbackRef = useRef(onSerialsAdded);
  callbackRef.current = onSerialsAdded;

  // Track the latest known serial ID for polling-based new serial detection
  const latestKnownIdRef = useRef<number>(0);
  const initializedRef = useRef(false);

  const invalidateSerials = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-serials"] });
    queryClient.invalidateQueries({ queryKey: ["product-serials"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stock"] });
  }, [queryClient]);

  // Initialize latest known ID on mount
  useEffect(() => {
    serialsApi.getLatestId()
      .then(({ latest_id }) => {
        latestKnownIdRef.current = latest_id;
        initializedRef.current = true;
      })
      .catch(() => {
        initializedRef.current = true;
      });
  }, []);

  // WebSocket listener
  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getEcho>['channel']> | null = null;

    try {
      const echo = getEcho();
      channel = echo.channel('serials');

      channel.listen('.serial.changed', (event: SerialChangedEvent) => {
        invalidateSerials();

        // Update latest known ID from WebSocket events
        if (event.serial_ids?.length > 0) {
          const maxId = Math.max(...event.serial_ids);
          if (maxId > latestKnownIdRef.current) {
            latestKnownIdRef.current = maxId;
          }
        }

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

  // Polling fallback: check for new serials and auto-print
  useEffect(() => {
    const pollInterval = connected === 'connected' ? 3000 : 1000;

    const poll = async () => {
      // Always invalidate queries for UI freshness
      invalidateSerials();

      // Check for new serials added since last known ID (for auto-print)
      if (!initializedRef.current || !callbackRef.current) return;

      try {
        const { serials: newSerials } = await serialsApi.getSince(latestKnownIdRef.current);
        if (newSerials && newSerials.length > 0) {
          // Update latest known ID
          const maxId = Math.max(...newSerials.map(s => s.id));
          latestKnownIdRef.current = maxId;

          // Trigger auto-print callback with synthetic event
          const event: SerialChangedEvent = {
            action: 'added',
            product_id: newSerials[0].product_id,
            variant_id: newSerials[0].variant_id ?? null,
            serial_ids: newSerials.map(s => s.id),
            timestamp: new Date().toISOString(),
          };
          callbackRef.current(event);
        }
      } catch {
        // Silently fail polling check
      }
    };

    const interval = setInterval(poll, pollInterval);
    return () => clearInterval(interval);
  }, [connected, invalidateSerials]);

  return connected;
}
