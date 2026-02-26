import { Wrench, Clock, Mail } from 'lucide-react';
import maintenanceImg from '@/assets/maintenance-illustration.png';

interface MaintenancePageProps {
  message?: string;
}

export function MaintenancePage({ message }: MaintenancePageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-background to-purple-50 dark:from-slate-900 dark:via-background dark:to-slate-800 px-4 py-10 overflow-hidden relative">
      {/* Decorative floating circles */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative z-10 text-center max-w-lg w-full space-y-8">
        {/* Illustration */}
        <div className="flex justify-center">
          <img
            src={maintenanceImg}
            alt="Server maintenance illustration"
            className="w-64 h-64 sm:w-80 sm:h-80 object-contain drop-shadow-2xl"
          />
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase">
            <Wrench className="w-3.5 h-3.5" />
            Scheduled Maintenance
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            We'll Be Back Soon
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md mx-auto">
            {message || 'We are currently performing scheduled maintenance to improve your experience. Please check back shortly.'}
          </p>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-4 space-y-1.5">
            <Clock className="w-5 h-5 text-primary mx-auto" />
            <p className="text-xs font-medium text-foreground">Expected Duration</p>
            <p className="text-[11px] text-muted-foreground">A few minutes</p>
          </div>
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-4 space-y-1.5">
            <Mail className="w-5 h-5 text-primary mx-auto" />
            <p className="text-xs font-medium text-foreground">Need Help?</p>
            <p className="text-[11px] text-muted-foreground">support@macsofy.com</p>
          </div>
        </div>

        {/* Progress bar animation */}
        <div className="max-w-xs mx-auto space-y-2">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full animate-[shimmer_2s_ease-in-out_infinite] w-2/3" />
          </div>
          <p className="text-[11px] text-muted-foreground">Working on it...</p>
        </div>
      </div>
    </div>
  );
}
