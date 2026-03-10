import { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Re-export primitives for complex/custom dialog layouts
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };

type DialogSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "full";

const sizeClasses: Record<DialogSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
  "5xl": "sm:max-w-5xl",
  "6xl": "sm:max-w-6xl sm:w-[95vw]",
  full: "sm:max-w-[95vw] sm:w-[95vw]",
};

interface AdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  size?: DialogSize;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const AdminDialog = ({
  open,
  onOpenChange,
  title,
  description,
  size = "lg",
  footer,
  children,
  className,
}: AdminDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sizeClasses[size], className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {children}
        </div>
        {footer && <DialogFooter className="shrink-0 border-t border-border pt-4 px-0">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
};
