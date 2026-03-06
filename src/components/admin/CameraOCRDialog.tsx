import { useState, useRef, useCallback, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Loader2, RotateCcw, Check, SwitchCamera, X } from "lucide-react";
import { cn } from "@/lib/utils";
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

  const startCamera = useCallback(async (facing: "environment" | "user" = facingMode) => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCapturing(true);
      setCapturedImage(null);
      setDetectedSerial(null);
    } catch (err) {
      toast.error("Cannot access camera. Please allow camera permission.");
    }
  }, [facingMode]);

  // Auto-start camera when dialog opens
  useEffect(() => {
    if (open && !capturing && !capturedImage) {
      startCamera();
    }
  }, [open]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCapturing(false);
  }, []);

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
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';
      const token = localStorage.getItem('admin_api_key') || localStorage.getItem('auth_token') || '';
      
      const response = await fetch(`${API_BASE_URL}/api/admin/ocr/scan-serial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
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
    onOpenChange(false);
  };

  const retake = () => {
    setCapturedImage(null);
    setDetectedSerial(null);
    startCamera();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onInteractOutside={(e) => e.preventDefault()}
          className={cn(
            "fixed z-50 flex flex-col bg-card overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            // Mobile: fullscreen
            "inset-0 rounded-none",
            // Desktop: centered dialog
            "sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-md sm:w-full sm:rounded-xl sm:max-h-[85vh]",
          )}
        >
          {/* Title bar with close on the right */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/60 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Camera className="w-4 h-4" />
              Scan Serial Number
            </div>
            <DialogPrimitive.Close asChild>
              <button className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors focus:outline-none" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </DialogPrimitive.Close>
          </div>

        <div className="px-4 pb-4 space-y-3">
          {/* Camera view or captured image */}
          <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Overlay guide */}
                {capturing && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-dashed border-white/50 rounded-lg w-[80%] h-[40%]" />
                  </div>
                )}
              </>
            ) : (
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            )}

            {processing && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
                <span className="text-white text-sm">Detecting serial number...</span>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Detected serial */}
          {detectedSerial && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Detected Serial Number</p>
              <p className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">{detectedSerial}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!capturing && !capturedImage && (
              <Button onClick={() => startCamera()} className="flex-1 gap-2" disabled>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting Camera...
              </Button>
            )}

            {capturing && (
              <>
                <Button onClick={toggleCamera} variant="outline" size="icon">
                  <SwitchCamera className="w-4 h-4" />
                </Button>
                <Button onClick={capture} className="flex-1 gap-2">
                  <Camera className="w-4 h-4" />
                  Capture
                </Button>
              </>
            )}

            {capturedImage && !processing && (
              <>
                <Button onClick={retake} variant="outline" className="flex-1 gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Retake
                </Button>
                {detectedSerial && (
                  <Button onClick={confirmSerial} className="flex-1 gap-2">
                    <Check className="w-4 h-4" />
                    Use Serial
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
