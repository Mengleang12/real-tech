import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export const EmptyState = ({ icon: Icon, title, description, action, compact = false }: EmptyStateProps) => (
  <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-10' : 'py-16'}`}>
    {/* Decorative icon container */}
    <div className="relative mb-5">
      <div className="absolute inset-0 rounded-full bg-primary/5 blur-xl scale-150" />
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center shadow-sm">
        <Icon className="w-7 h-7 text-primary/40" strokeWidth={1.5} />
      </div>
    </div>

    {/* Text */}
    <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
    {description && (
      <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">{description}</p>
    )}

    {/* Action */}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
