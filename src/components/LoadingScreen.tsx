import logoImg from '@/assets/realtech-logo.png';

interface LoadingScreenProps {
  minimal?: boolean;
}

export function LoadingScreen({ minimal = false }: LoadingScreenProps) {
  if (minimal) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-b-primary/40 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo with pulse ring */}
        <div className="relative">
          {/* Outer ring animation */}
          <div className="absolute -inset-4 rounded-full border border-primary/10 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30" />
          <div className="absolute -inset-2 rounded-full border border-primary/5 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s] opacity-20" />
          
          {/* Logo container */}
          <div className="w-16 h-16 rounded-2xl bg-card border border-border/60 shadow-lg flex items-center justify-center overflow-hidden">
            <img 
              src={logoImg} 
              alt="Loading" 
              className="w-10 h-10 object-contain animate-fade-in"
            />
          </div>
        </div>

        {/* Loading bar */}
        <div className="w-48 space-y-3">
          <div className="h-[3px] bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-full"
              style={{
                width: '40%',
                animation: 'loading-bar 1.4s ease-in-out infinite',
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center tracking-wide">Loading…</p>
        </div>
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
