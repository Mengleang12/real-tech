import { useLanguage } from '@/contexts/LanguageContext';
import { GroupCard } from './SettingsShared';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

export function AppearancePanel() {
  const { language, setLanguage } = useLanguage();

  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      localStorage.removeItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      localStorage.setItem('theme', theme);
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  const themes: { value: ThemeMode; icon: React.ElementType; label: string; labelKm: string }[] = [
    { value: 'light', icon: Sun, label: 'Light', labelKm: 'ភ្លឺ' },
    { value: 'dark', icon: Moon, label: 'Dark', labelKm: 'ងងឹត' },
    { value: 'system', icon: Monitor, label: 'Auto', labelKm: 'ស្វ័យប្រវត្តិ' },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-foreground">
        {language === 'km' ? 'រូបរាង' : 'Appearance'}
      </h2>

      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1">
        {language === 'km' ? 'រចនាប័ទ្ម' : 'Theme'}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {themes.map(({ value, icon: Icon, label, labelKm }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`flex flex-col items-center gap-2 p-4 rounded-[10px] border transition-all ${
              theme === value
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border/50 bg-card hover:bg-accent/30'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              theme === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className={`text-xs font-medium ${theme === value ? 'text-primary' : 'text-muted-foreground'}`}>
              {language === 'km' ? labelKm : label}
            </span>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1 mt-6">
        {language === 'km' ? 'ភាសា' : 'Language'}
      </p>
      <GroupCard>
        <button
          onClick={() => setLanguage('en')}
          className={`w-full flex items-center gap-3 px-4 py-3 min-h-[44px] transition-colors ${language === 'en' ? '' : 'hover:bg-accent/40'}`}
        >
          <span className="text-lg">🇺🇸</span>
          <span className="text-sm text-foreground flex-1 text-left">English</span>
          {language === 'en' && <span className="text-primary text-sm">✓</span>}
        </button>
        <button
          onClick={() => setLanguage('km')}
          className={`w-full flex items-center gap-3 px-4 py-3 min-h-[44px] transition-colors ${language === 'km' ? '' : 'hover:bg-accent/40'}`}
        >
          <span className="text-lg">🇰🇭</span>
          <span className="text-sm text-foreground flex-1 text-left">ភាសាខ្មែរ</span>
          {language === 'km' && <span className="text-primary text-sm">✓</span>}
        </button>
      </GroupCard>
    </div>
  );
}
