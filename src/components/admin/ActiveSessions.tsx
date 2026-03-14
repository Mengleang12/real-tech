import { useState, useEffect } from "react";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Monitor, Smartphone, Tablet, Globe, Clock, LogOut, Loader2, ShieldX } from "lucide-react";

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  logged_in_at: string | null;
  last_active: string | null;
  is_current: boolean;
}

const DeviceIcon = ({ device }: { device: string }) => {
  switch (device) {
    case "Mobile": return <Smartphone className="w-5 h-5" />;
    case "Tablet": return <Tablet className="w-5 h-5" />;
    default: return <Monitor className="w-5 h-5" />;
  }
};

const formatTime = (iso: string | null) => {
  if (!iso) return "Unknown";
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

export const ActiveSessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  const fetchSessions = async () => {
    try {
      const data = await authApi.getSessions();
      setSessions(data.sessions || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      await authApi.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success("Session revoked");
    } catch {
      toast.error("Failed to revoke session");
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    setRevokingAll(true);
    try {
      await authApi.revokeAllSessions();
      setSessions(prev => prev.filter(s => s.is_current));
      toast.success("All other sessions revoked");
    } catch {
      toast.error("Failed to revoke sessions");
    } finally {
      setRevokingAll(false);
      setConfirmRevokeAll(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  const otherSessions = sessions.filter(s => !s.is_current);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Active Sessions</h3>
          <p className="text-xs text-muted-foreground">{sessions.length} active session{sessions.length !== 1 ? "s" : ""}</p>
        </div>
        {otherSessions.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmRevokeAll(true)}
            className="text-destructive hover:text-destructive text-xs h-8"
          >
            <ShieldX className="w-3.5 h-3.5 mr-1.5" />
            Revoke All Others
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {sessions.map((session) => (
          <Card key={session.id} className={session.is_current ? "border-primary/40 bg-primary/5" : ""}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${session.is_current ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                <DeviceIcon device={session.device} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {session.browser} on {session.os}
                  </p>
                  {session.is_current && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                      This device
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {session.ip}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(session.last_active)}
                  </span>
                </div>
              </div>

              {!session.is_current && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevoke(session.id)}
                  disabled={revoking === session.id}
                  className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                  title="Revoke session"
                >
                  {revoking === session.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {sessions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No active sessions</p>
        )}
      </div>

      <AlertDialog open={confirmRevokeAll} onOpenChange={setConfirmRevokeAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke all other sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will log out all other devices. Only your current session will remain active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeAll} disabled={revokingAll} className="bg-destructive hover:bg-destructive/90">
              {revokingAll && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Revoke All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
