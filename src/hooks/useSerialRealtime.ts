import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CHANNEL_NAME = "serial-updates";

/**
 * Hook that listens for serial number changes via Supabase Realtime broadcast.
 * When any client adds/deletes/updates serials, all other clients get notified
 * and automatically refetch their serial data.
 */
export function useSerialRealtime() {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(CHANNEL_NAME)
      .on("broadcast", { event: "serial_changed" }, () => {
        // Invalidate all serial-related queries so they refetch
        queryClient.invalidateQueries({ queryKey: ["admin-serials"] });
        queryClient.invalidateQueries({ queryKey: ["product-serials"] });
        queryClient.invalidateQueries({ queryKey: ["admin-stock"] });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return channelRef;
}

/**
 * Broadcast a serial change event to all connected clients.
 */
export async function broadcastSerialChange() {
  const channel = supabase.channel(CHANNEL_NAME);
  
  // Subscribe first, then broadcast, then unsubscribe
  await channel.subscribe();
  await channel.send({
    type: "broadcast",
    event: "serial_changed",
    payload: { ts: Date.now() },
  });
  
  // Small delay before cleanup to ensure message is sent
  setTimeout(() => {
    supabase.removeChannel(channel);
  }, 500);
}
