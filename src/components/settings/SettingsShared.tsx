import { Input } from '@/components/ui/input';

export function GroupCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-[10px] overflow-hidden divide-y divide-border/50 shadow-sm">
      {children}
    </div>
  );
}

export function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1 mb-2">{children}</p>;
}

export function EditableRow({ label, value, onChange, placeholder, type = 'text', disabled = false }: {
  label: string; value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 min-h-[44px]">
      <span className="text-sm text-foreground w-[120px] flex-shrink-0">{label}</span>
      {disabled ? (
        <span className="text-sm text-muted-foreground flex-1 text-right truncate">{value}</span>
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="bg-transparent border-none shadow-none focus-visible:ring-0 h-auto p-0 text-sm text-foreground placeholder:text-muted-foreground/40 text-right flex-1"
        />
      )}
    </div>
  );
}

export function ToggleRow({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 min-h-[44px]">
      <div className="flex-1">
        <p className="text-sm text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-[42px] h-[26px] rounded-full p-0.5 transition-colors duration-200 ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
      >
        <span className={`block w-[22px] h-[22px] rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-[16px]' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 min-h-[44px]">
      <span className="text-sm text-foreground flex-1">{label}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}
