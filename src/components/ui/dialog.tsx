import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
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

// Context to hoist title into the header bar
const DialogTitleContext = React.createContext<{
  title: React.ReactNode;
  setTitle: (t: React.ReactNode) => void;
}>({ title: null, setTitle: () => {} });

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const [title, setTitle] = React.useState<React.ReactNode>(null);

  return (
    <DialogTitleContext.Provider value={{ title, setTitle }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          {...props}
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
          className={cn(
          "fixed z-50 flex flex-col border-0 bg-card overflow-hidden",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "duration-200",
          "top-0 left-0 right-0 bottom-0 rounded-none",
          "sm:top-[50%] sm:left-[50%] sm:right-auto sm:bottom-auto sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-full sm:rounded-xl sm:max-h-[85vh]",
          !className?.includes("max-w-") && "sm:max-w-lg",
          className,
          )}
        >
          {/* Header bar: title left, close right */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/60 border-b border-border/50 shrink-0 min-h-[44px] pt-[max(0.625rem,env(safe-area-inset-top))] sm:pt-2.5">
            <DialogPrimitive.Title asChild>
              <span className="text-sm font-semibold leading-none tracking-tight truncate">
                {title}
              </span>
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <button
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors focus:outline-none shrink-0 ml-2"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </DialogPrimitive.Close>
          </div>
          {/* Content area */}
          <div className={cn("flex flex-col flex-1 min-h-0 overflow-y-auto scrollbar-hide", className?.includes("p-0") ? "p-0" : "p-6")} style={{ WebkitOverflowScrolling: 'touch' }}>
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogTitleContext.Provider>
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

// DialogTitle hoists its children into the header bar and renders nothing in place
const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, children, ...props }, ref) => {
  const { setTitle } = React.useContext(DialogTitleContext);

  React.useEffect(() => {
    setTitle(children);
    return () => setTitle(null);
  }, [children, setTitle]);

  // Render nothing here — title is shown in the header bar
  return null;
});
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
