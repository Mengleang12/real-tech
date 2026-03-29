import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { serialsApi } from "@/lib/api";

export interface SerialChangedEvent {
  action: string;
  product_id: number;
  variant_id: number | null;
  serial_ids: number[];
  timestamp: string;
  /** Full serial objects when available — avoids a second fetch */
  serials?: any[];
}

/**
 * Listens for new serials via WebSocket and triggers a callback when new ones appear.
 */
export function useSerialRealtime(onSerialsAdded?: (event: SerialChangedEvent) => void) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const callbackRef = useRef(onSerialsAdded);
  callbackRef.current = onSerialsAdded;

  // Track the latest known serial ID for new-serial detection
  const latestKnownIdRef = useRef<number>(0);
  const initializedRef = useRef(false);
  const printedIdsRef = useRef<Set<number>>(new Set());

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

  // Try WebSocket (best-effort, non-blocking)
  useEffect(() => {
    let channel: any = null;

    const connectWs = async () => {
      try {
        const { getEcho } = await import("@/lib/echo");
        const echo = getEcho();
        channel = echo.channel('serials');

        channel.listen('.serial.changed', (event: SerialChangedEvent) => {
          invalidateSerials();

          if (event.serial_ids?.length > 0) {
            const maxId = Math.max(...event.serial_ids);
            if (maxId > latestKnownIdRef.current) {
              latestKnownIdRef.current = maxId;
            }
            // Mark as printed via WS to avoid duplicate prints from polling
            event.serial_ids.forEach(id => printedIdsRef.current.add(id));
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
        console.warn('WebSocket unavailable, using polling only');
        setConnected('disconnected');
      }
    };

    connectWs();

    return () => {
      try {
        if (channel) {
          import("@/lib/echo").then(({ getEcho }) => {
            getEcho().leaveChannel('serials');
          }).catch(() => {});
        }
      } catch {}
    };
  }, [invalidateSerials]);

  // Clean up printed IDs set periodically to avoid memory leak
  useEffect(() => {
    const interval = setInterval(() => {
      if (printedIdsRef.current.size > 500) {
        printedIdsRef.current.clear();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return connected;
}
