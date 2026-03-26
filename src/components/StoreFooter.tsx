import { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Facebook, Send, Instagram, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import realtechLogo from '@/assets/realtech-logo.png';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

// TikTok icon (not in lucide)
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.4a8.16 8.16 0 004.76 1.52V7.48a4.85 4.85 0 01-1-.79z" />
  </svg>
);

interface BrandingData {
  site_name: string;
  site_tagline: string;
  site_logo_url: string;
  support_email: string;
  support_phone: string;
  site_address: string;
  facebook_url: string;
  telegram_url: string;
  instagram_url: string;
  tiktok_url: string;
  google_maps_api_key: string;
}

const defaults: BrandingData = {
  site_name: 'Realtech Computer',
  site_tagline: 'Your Trusted Tech Partner',
  site_logo_url: '',
  support_email: '',
  support_phone: '',
  site_address: '',
  facebook_url: '',
  telegram_url: '',
  instagram_url: '',
  tiktok_url: '',
  google_maps_api_key: '',
};

export function StoreFooter() {
  const { language } = useLanguage();
  const [branding, setBranding] = useState<BrandingData>(defaults);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/settings/branding`)
      .then(r => r.ok ? r.json() : defaults)
      .then(d => setBranding({ ...defaults, ...d }))
      .catch(() => {});
  }, []);

  const socialLinks = [
    { url: branding.facebook_url, icon: Facebook, label: 'Facebook', color: 'hover:bg-blue-600' },
    { url: branding.telegram_url, icon: Send, label: 'Telegram', color: 'hover:bg-sky-500' },
    { url: branding.instagram_url, icon: Instagram, label: 'Instagram', color: 'hover:bg-pink-600' },
    { url: branding.tiktok_url, icon: TikTokIcon, label: 'TikTok', color: 'hover:bg-gray-900 dark:hover:bg-white dark:hover:text-black' },
  ].filter(s => s.url);

  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-16 overflow-hidden">
      {/* Gradient divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      
      <div className="bg-card/60 backdrop-blur-xl border-t border-border/30">
        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
            
            {/* Brand column */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-background shadow-sm border border-border/50 flex items-center justify-center">
                  <img
                    src={branding.site_logo_url || realtechLogo}
                    alt={branding.site_name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = realtechLogo; }}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm leading-tight">{branding.site_name}</h3>
                  {branding.site_tagline && (
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{branding.site_tagline}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px]">
                {language === 'km'
                  ? 'យើងផ្តល់ដំណោះស្រាយបច្ចេកវិទ្យា និងសេវាកម្មដំឡើងកម្មវិធីដែលអ្នកអាចទុកចិត្តបាន។'
                  : 'Your trusted partner for tech solutions, software installation services, and digital products.'}
              </p>
            </div>

            {/* Social Media */}
            {socialLinks.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
                  {language === 'km' ? 'បណ្ដាញសង្គម' : 'Follow Us'}
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  {socialLinks.map((s) => {
                    const Icon = s.icon;
                    return (
                      <a
                        key={s.label}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s.label}
                        className={`w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground transition-all duration-200 ${s.color} hover:text-white hover:shadow-lg hover:scale-105`}
                      >
                        <Icon className="w-4 h-4" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
                {language === 'km' ? 'ទំនាក់ទំនង' : 'Contact Us'}
              </h4>
              <ul className="space-y-3">
                {branding.support_phone && (
                  <li>
                    <a href={`tel:${branding.support_phone}`} className="flex items-start gap-2.5 group">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Phone className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">{language === 'km' ? 'ទូរសព្ទ' : 'Phone'}</p>
                        <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{branding.support_phone}</p>
                      </div>
                    </a>
                  </li>
                )}
                {branding.support_email && (
                  <li>
                    <a href={`mailto:${branding.support_email}`} className="flex items-start gap-2.5 group">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Mail className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">{language === 'km' ? 'អ៊ីមែល' : 'Email'}</p>
                        <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors break-all">{branding.support_email}</p>
                      </div>
                    </a>
                  </li>
                )}
                {branding.site_address && (
                  <li className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">{language === 'km' ? 'អាសយដ្ឋាន' : 'Address'}</p>
                      <p className="text-xs font-medium text-foreground leading-relaxed">{branding.site_address}</p>
                    </div>
                  </li>
                )}
              </ul>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
                {language === 'km' ? 'តំណភ្ជាប់រហ័ស' : 'Quick Links'}
              </h4>
              <ul className="space-y-2.5">
                {[
                  { label: language === 'km' ? 'អំពីយើង' : 'About Us', href: '#' },
                  { label: language === 'km' ? 'គោលការណ៍ឯកជនភាព' : 'Privacy Policy', href: '#' },
                  { label: language === 'km' ? 'លក្ខខណ្ឌសេវាកម្ម' : 'Terms of Service', href: '#' },
                  { label: 'FAQ', href: '#' },
                ].map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group">
                      <ExternalLink className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      <span>{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Map */}
            {branding.site_address && (
              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
                  {language === 'km' ? 'ទីតាំង' : 'Location'}
                </h4>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branding.site_address || branding.site_name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden border border-border/50 group relative"
                >
                  {branding.google_maps_api_key ? (
                    <iframe
                      title="Store Location"
                      src={`https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(branding.google_maps_api_key)}&q=${encodeURIComponent(branding.site_address)}`}
                      className="w-full h-[150px] pointer-events-none"
                      loading="lazy"
                      style={{ border: 0 }}
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-[150px] bg-muted/30 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">{branding.site_address}</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-transparent group-hover:bg-primary/5 transition-colors flex items-end justify-center pb-2">
                    <span className="text-[10px] bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full text-muted-foreground group-hover:text-primary transition-colors font-medium shadow-sm">
                      <MapPin className="w-3 h-3 inline mr-1 -mt-0.5" />
                      {language === 'km' ? 'បើកក្នុង Google Maps' : 'Open in Google Maps'}
                    </span>
                  </div>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              © {currentYear} {branding.site_name}. {language === 'km' ? 'រក្សាសិទ្ធិគ្រប់យ៉ាង។' : 'All rights reserved.'}
            </p>
            <p className="text-[10px] text-muted-foreground/50">
              {language === 'km' ? 'ដំណើរការដោយ' : 'Powered by'} {branding.site_name}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
