import { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Re-export primitives for complex/custom dialog layouts
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };

type DialogSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "full";

const sizeClasses: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl w-[95vw]",
  full: "max-w-[95vw] w-[95vw]",
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
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
        {footer && <DialogFooter className="shrink-0 border-t border-border pt-4 px-0">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
};
