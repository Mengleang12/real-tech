import { Radio, Wifi } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface WebSocketStatusProps {
  status: 'connecting' | 'connected' | 'disconnected';
}

export const WebSocketStatus = ({ status }: WebSocketStatusProps) => {
  const config = {
    connected: {
      color: "bg-emerald-500",
      pulse: true,
      label: "Live — WebSocket",
      Icon: Wifi,
    },
    connecting: {
      color: "bg-amber-500",
      pulse: true,
      label: "Connecting...",
      Icon: Radio,
    },
    disconnected: {
      color: "bg-red-500",
      pulse: false,
      label: "Disconnected",
      Icon: Radio,
    },
  }[status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <config.Icon className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            {config.pulse && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`} />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color}`} />
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">{config.label}</p>
      </TooltipContent>
    </Tooltip>
  );
};
