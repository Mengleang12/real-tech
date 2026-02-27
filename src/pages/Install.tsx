import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Share, Check, Smartphone, Monitor, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // Listen for install prompt (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Store
        </Button>

        <div className="text-center space-y-3">
          <img src="/pwa-192x192.png" alt="Realtech" className="w-20 h-20 mx-auto rounded-2xl shadow-lg" />
          <h1 className="text-2xl font-bold">Install Realtech</h1>
          <p className="text-muted-foreground">
            Install our app on your device for quick access, offline support, and a native app experience.
          </p>
        </div>

        {isInstalled ? (
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <Check className="w-12 h-12 mx-auto text-green-500" />
              <h2 className="text-lg font-semibold">Already Installed!</h2>
              <p className="text-sm text-muted-foreground">
                Realtech is already installed on your device. Open it from your home screen.
              </p>
            </CardContent>
          </Card>
        ) : isIOS ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Smartphone className="w-5 h-5" /> Install on iPhone / iPad
              </h2>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Tap the <Share className="w-4 h-4 inline-block mx-1" /> <strong>Share</strong> button in Safari</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Tap <strong>"Add"</strong> to confirm</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        ) : deferredPrompt ? (
          <Card>
            <CardContent className="p-6 space-y-4 text-center">
              <Smartphone className="w-12 h-12 mx-auto text-primary" />
              <h2 className="text-lg font-semibold">Ready to Install</h2>
              <p className="text-sm text-muted-foreground">
                Tap the button below to install Realtech on your device.
              </p>
              <Button onClick={handleInstall} size="lg" className="w-full gap-2">
                <Download className="w-5 h-5" /> Install App
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Monitor className="w-5 h-5" /> How to Install
              </h2>
              <div className="space-y-3 text-sm">
                <p><strong>On Android Chrome:</strong></p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Tap the menu (⋮) in Chrome</li>
                  <li>Select "Install app" or "Add to Home screen"</li>
                  <li>Tap "Install" to confirm</li>
                </ol>
                <p className="pt-2"><strong>On Desktop Chrome:</strong></p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Click the install icon in the address bar</li>
                  <li>Click "Install" to confirm</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "⚡", label: "Fast" },
            { icon: "📱", label: "Native Feel" },
            { icon: "🔔", label: "Offline" },
          ].map((f) => (
            <div key={f.label} className="p-3 rounded-lg bg-muted/50">
              <span className="text-2xl">{f.icon}</span>
              <p className="text-xs text-muted-foreground mt-1">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Install;
