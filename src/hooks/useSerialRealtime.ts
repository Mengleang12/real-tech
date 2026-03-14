import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getEcho } from "@/lib/echo";

/**
 * Listen for serial number changes via Laravel Reverb WebSocket.
 * When any client adds/deletes/updates serials, all other clients
 * get notified and automatically refetch their serial data.
 */
export function useSerialRealtime() {
  const queryClient = useQueryClient();

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
    } catch (e) {
      console.warn('WebSocket connection failed, falling back to polling:', e);
    }

    return () => {
      try {
        if (channel) {
          getEcho().leaveChannel('serials');
        }
      } catch {}
    };
  }, [queryClient]);
}
