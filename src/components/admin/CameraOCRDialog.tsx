import { useState, useRef, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Loader2, RotateCcw, Check, SwitchCamera, Focus } from "lucide-react";

interface CameraOCRDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSerialDetected: (serial: string) => void;
}

export const CameraOCRDialog = ({ open, onOpenChange, onSerialDetected }: CameraOCRDialogProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedSerial, setDetectedSerial] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraReady, setCameraReady] = useState(false);

  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (facing: "environment" | "user") => {
      try {
        stopAllTracks();

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        streamRef.current = stream;

        let video = videoRef.current;
        if (!video) {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          video = videoRef.current;
        }

        if (!video) {
          throw new Error("Video element is not ready");
        }

        video.srcObject = stream;

        await new Promise<void>((resolve, reject) => {
          if (video!.readyState >= 1) {
            resolve();
            return;
          }

          const onReady = () => {
            video!.removeEventListener("loadedmetadata", onReady);
            video!.removeEventListener("error", onError);
            resolve();
          };

          const onError = () => {
            video!.removeEventListener("loadedmetadata", onReady);
            video!.removeEventListener("error", onError);
            reject(new Error("Video load error"));
          };

          video!.addEventListener("loadedmetadata", onReady);
          video!.addEventListener("error", onError);
        });

        await video.play();

        setCapturing(true);
        setCameraReady(true);
        setCapturedImage(null);
        setDetectedSerial(null);
      } catch {
        setCapturing(false);
        setCameraReady(false);
        toast.error("Cannot access camera. Please allow camera permission.");
      }
    },
    [stopAllTracks]
  );

  // Cleanup when dialog closes
  useEffect(() => {
    if (!open) {
      stopAllTracks();
      setCapturing(false);
      setCapturedImage(null);
      setDetectedSerial(null);
      setProcessing(false);
      setCameraReady(false);
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [open, stopAllTracks]);

  const stopCamera = useCallback(() => {
    stopAllTracks();
    setCapturing(false);
  }, [stopAllTracks]);

  const toggleCamera = useCallback(() => {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    if (capturing) {
      startCamera(newFacing);
    }
  }, [facingMode, capturing, startCamera]);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
    processOCR(dataUrl);
  }, [stopCamera]);

  const processOCR = async (imageDataUrl: string) => {
    setProcessing(true);
    setDetectedSerial(null);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.realtechcomputer.com";
      const token = localStorage.getItem("admin_api_key") || localStorage.getItem("auth_token") || "";

      const response = await fetch(`${API_BASE_URL}/api/admin/ocr/scan-serial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ image: imageDataUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "OCR processing failed.");
        return;
      }

      const result = data.serial?.trim();

      if (result && result !== "NONE" && result.length > 3) {
        setDetectedSerial(result);
      } else {
        toast.error("Could not detect a serial number. Try again with a clearer photo.");
      }
    } catch {
      toast.error("OCR processing failed. Please try again.");
    }
    setProcessing(false);
  };

  const confirmSerial = () => {
    if (detectedSerial) {
      onSerialDetected(detectedSerial);
      handleClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setDetectedSerial(null);
    setProcessing(false);
    setCameraReady(false);
    onOpenChange(false);
  };

  const retake = () => {
    setCapturedImage(null);
    setDetectedSerial(null);
    startCamera(facingMode);
  };

  // CRITICAL: Called directly from user click — satisfies Safari gesture requirement
  const handleStartCamera = async () => {
    flushSync(() => {
      setFacingMode("environment");
      setCapturing(true);
      setCameraReady(true);
      setCapturedImage(null);
      setDetectedSerial(null);
    });
    await startCamera("environment");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">Scan Serial Number</DialogTitle>
        <DialogDescription className="sr-only">Use your camera to scan a serial number label</DialogDescription>

        <div className="flex flex-col min-h-0">
          {/* Initial state — user must click to start camera (Safari gesture requirement) */}
          {!cameraReady && !capturedImage && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 px-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center">
                <Camera className="w-7 h-7 text-primary/50" strokeWidth={1.5} />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Scan Serial Number</h3>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  Tap below to open the rear camera and scan a serial number
                </p>
              </div>
              <Button onClick={handleStartCamera} className="gap-2 rounded-xl h-11 px-6" size="lg">
                <Camera className="w-4 h-4" />
                Open Camera
              </Button>
            </div>
          )}

          {/* Camera / captured view */}
          {(capturing || capturedImage) && (
            <div className="relative flex-1 flex flex-col min-h-0">
              {/* Camera feed */}
              <div className="relative flex-1 bg-black" style={{ minHeight: "55vh" }}>
                {!capturedImage ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      {...({ "webkit-playsinline": "" } as any)}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ WebkitTransform: "translateZ(0)" }}
                    />
                    {/* Scan overlay with corner brackets */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="relative w-[80%] h-[30%]">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-sm" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-sm" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-sm" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-sm" />
                        <div className="absolute inset-x-2 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-pulse" />
                      </div>
                    </div>
                    {/* Hint text */}
                    <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none">
                      <span className="text-[11px] text-white/80 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <Focus className="w-3 h-3" />
                        Align serial number in the frame
                      </span>
                    </div>
                    {/* Camera toggle */}
                    <button
                      onClick={toggleCamera}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
                )}

                {processing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                    <span className="text-white text-sm font-medium">Detecting serial number...</span>
                  </div>
                )}
              </div>

              {/* Bottom controls */}
              <div className="shrink-0 bg-background p-3 space-y-3">
                {/* Detected serial result */}
                {detectedSerial && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-emerald-500" />
                      </div>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Serial Detected</span>
                    </div>
                    <p className="text-base font-mono font-bold text-foreground tracking-wide text-center bg-muted/50 rounded-lg py-2">
                      {detectedSerial}
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2.5">
                  {capturing && (
                    <Button onClick={capture} className="flex-1 gap-2 h-12 rounded-xl" size="lg">
                      <Camera className="w-4 h-4" />
                      Capture
                    </Button>
                  )}

                  {capturedImage && !processing && (
                    <>
                      <Button onClick={retake} variant="outline" className="flex-1 gap-2 h-11 rounded-xl" size="lg">
                        <RotateCcw className="w-4 h-4" />
                        Retake
                      </Button>
                      {detectedSerial && (
                        <Button onClick={confirmSerial} className="flex-1 gap-2 h-11 rounded-xl" size="lg">
                          <Check className="w-4 h-4" />
                          Use Serial
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>
      </DialogContent>
    </Dialog>
  );
};
