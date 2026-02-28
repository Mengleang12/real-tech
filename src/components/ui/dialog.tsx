import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Maximize, PanelLeft, PanelRight, Minimize2 } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, onClick, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type WindowMode = 'normal' | 'fullscreen';

// Green button - toggles fullscreen directly
const GreenButton = ({
  mode,
  onToggle,
}: {
  mode: WindowMode;
  onToggle: () => void;
}) => {
  const isFullscreen = mode === 'fullscreen';

  return (
    <button
      onClick={onToggle}
      className="w-4 h-4 rounded-full bg-[#28C840] hover:brightness-90 transition-all group relative focus:outline-none"
      aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
    >
      <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#006500]" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        {isFullscreen ? (
          <>
            <path d="M4 8L2 10M8 4l2-2" />
            <path d="M2 7v3h3M10 5V2H7" />
          </>
        ) : (
          <>
            <path d="M3.5 2v3.5H2M8.5 10V6.5H10" />
            <path d="M2 5.5L5.5 2M10 6.5L6.5 10" />
          </>
        )}
      </svg>
    </button>
  );
};

// macOS traffic light dots
const TrafficLights = ({ mode, onModeChange }: { mode: WindowMode; onModeChange: (mode: WindowMode) => void }) => (
  <div className="flex items-center gap-2">
    <DialogPrimitive.Close asChild>
      <button
        className="w-4 h-4 rounded-full bg-[#FF5F57] hover:brightness-90 transition-all group relative focus:outline-none"
        aria-label="Close"
      >
        <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#4a0002]" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" />
        </svg>
      </button>
    </DialogPrimitive.Close>
    <GreenButton mode={mode} onToggle={() => onModeChange(mode === 'fullscreen' ? 'normal' : 'fullscreen')} />
  </div>
);

const getWindowStyles = (mode: WindowMode): React.CSSProperties => {
  const transition = 'width 0.3s ease, height 0.3s ease, max-width 0.3s ease, max-height 0.3s ease, border-radius 0.3s ease, box-shadow 0.3s ease, left 0.3s ease, top 0.3s ease, transform 0.3s ease';

  switch (mode) {
    case 'fullscreen':
      return {
        width: '100vw',
        height: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        borderRadius: 0,
        boxShadow: 'none',
        transform: 'translate(-50%, -50%)',
        transition,
      };
    default:
      return {
        maxHeight: '85vh',
        borderRadius: '0.75rem',
        boxShadow: 'var(--shadow-window)',
        transform: 'translate(-50%, -50%)',
        transition,
      };
  }
};

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const [mode, setMode] = React.useState<WindowMode>('normal');

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        {...props}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
        className={cn(
          "fixed z-50 flex flex-col w-full max-w-lg border-0 bg-card overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 left-[50%] top-[50%]",
          mode === 'normal' && "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          className,
        )}
        style={getWindowStyles(mode)}
      >
        {/* macOS title bar */}
        <div className="flex items-center px-4 py-2.5 bg-muted/60 border-b border-border/50 shrink-0">
          <TrafficLights mode={mode} onModeChange={setMode} />
        </div>
        {/* Content area */}
        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
