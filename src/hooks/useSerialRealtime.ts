import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getEcho } from "@/lib/echo";

/**
 * Listen for serial number changes via Laravel Reverb WebSocket.
 * Returns connection status for UI indicator.
 */
export function useSerialRealtime() {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getEcho>['channel']> | null = null;

    try {
      const echo = getEcho();
      channel = echo.channel('serials');

      channel.listen('.serial.changed', () => {
        queryClient.invalidateQueries({ queryKey: ["admin-serials"] });
        queryClient.invalidateQueries({ queryKey: ["product-serials"] });
        queryClient.invalidateQueries({ queryKey: ["admin-stock"] });
      });

      // Monitor connection state via the underlying Pusher connector
      const connector = (echo as any).connector?.pusher;
      if (connector) {
        connector.connection.bind('connected', () => setConnected('connected'));
        connector.connection.bind('disconnected', () => setConnected('disconnected'));
        connector.connection.bind('error', () => setConnected('disconnected'));
        // Check if already connected
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
  }, [queryClient]);

  return connected;
}
