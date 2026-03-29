import { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Facebook, Send, Instagram, ChevronRight, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import realtechLogo from '@/assets/realtech-logo.png';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

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
  youtube_video_url: string;
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
  youtube_video_url: '',
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

  const quickLinks = [
    { label: language === 'km' ? 'អំពីយើង' : 'About Us', href: '#' },
    { label: language === 'km' ? 'គោលការណ៍ឯកជនភាព' : 'Privacy Policy', href: '#' },
    { label: language === 'km' ? 'លក្ខខណ្ឌសេវាកម្ម' : 'Terms of Service', href: '#' },
    { label: 'FAQ', href: '#' },
  ];

  const hasContact = branding.support_phone || branding.support_email || branding.site_address;
  const hasMap = !!branding.google_maps_api_key;
  const hasVideo = !!branding.youtube_video_url;
  const currentYear = new Date().getFullYear();

  // Extract YouTube embed URL
  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };
  const youtubeEmbedUrl = hasVideo ? getYouTubeEmbedUrl(branding.youtube_video_url) : null;

  return (
    <footer className="relative mt-16">
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="bg-card/50 backdrop-blur-xl border-t border-border/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          
          {/* Top: Brand + Map side by side on large screens */}
          <div className={`grid grid-cols-1 ${hasMap ? 'lg:grid-cols-3' : ''} gap-8 mb-8`}>
            
            {/* Brand info */}
            <div className={hasMap ? 'lg:col-span-2' : ''}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-background shadow-sm border border-border/40 flex items-center justify-center shrink-0">
                  <img
                    src={branding.site_logo_url || realtechLogo}
                    alt={branding.site_name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = realtechLogo; }}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">{branding.site_name}</h3>
                  {branding.site_tagline && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{branding.site_tagline}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground/80 leading-relaxed max-w-md mb-5">
                {language === 'km'
                  ? 'យើងផ្តល់ដំណោះស្រាយបច្ចេកវិទ្យា និងសេវាកម្មដំឡើងកម្មវិធីដែលអ្នកអាចទុកចិត្តបាន។'
                  : 'Your trusted partner for tech solutions, software installation services, and digital products.'}
              </p>

              {/* Contact + Social + Links in a row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* Contact */}
                {hasContact && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-foreground/70 uppercase tracking-widest mb-3">
                      {language === 'km' ? 'ទំនាក់ទំនង' : 'Contact'}
                    </h4>
                    <ul className="space-y-2">
                      {branding.support_phone && (
                        <li>
                          <a href={`tel:${branding.support_phone}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group">
                            <Phone className="w-3.5 h-3.5 text-primary/60 group-hover:text-primary" />
                            <span>{branding.support_phone}</span>
                          </a>
                        </li>
                      )}
                      {branding.support_email && (
                        <li>
                          <a href={`mailto:${branding.support_email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group">
                            <Mail className="w-3.5 h-3.5 text-primary/60 group-hover:text-primary" />
                            <span className="break-all">{branding.support_email}</span>
                          </a>
                        </li>
                      )}
                      {branding.site_address && (
                        <li className="flex items-start gap-2 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 text-primary/60 mt-0.5 shrink-0" />
                          <span className="leading-relaxed">{branding.site_address}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Quick Links */}
                <div>
                  <h4 className="text-[11px] font-semibold text-foreground/70 uppercase tracking-widest mb-3">
                    {language === 'km' ? 'តំណភ្ជាប់រហ័ស' : 'Quick Links'}
                  </h4>
                  <ul className="space-y-1.5">
                    {quickLinks.map((link) => (
                      <li key={link.label}>
                        <a href={link.href} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group">
                          <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Social */}
                {socialLinks.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-foreground/70 uppercase tracking-widest mb-3">
                      {language === 'km' ? 'បណ្ដាញសង្គម' : 'Follow Us'}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {socialLinks.map((s) => {
                        const Icon = s.icon;
                        return (
                          <a
                            key={s.label}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={s.label}
                            className={`w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground transition-all duration-200 ${s.color} hover:text-white hover:shadow-md hover:scale-105`}
                          >
                            <Icon className="w-4 h-4" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Map & Video Row */}
          {(hasMap || youtubeEmbedUrl) && (
            <div className={`grid grid-cols-1 ${hasMap && youtubeEmbedUrl ? 'sm:grid-cols-2' : ''} gap-4 mb-8`}>
              {hasMap && (
                <div>
                  <h4 className="text-[11px] font-semibold text-foreground/70 uppercase tracking-widest mb-2.5">
                    <MapPin className="w-3 h-3 inline mr-1 -mt-0.5" />
                    {language === 'km' ? 'ទីតាំងហាង' : 'Store Location'}
                  </h4>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branding.site_address || branding.site_name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl overflow-hidden border border-border/40 group relative"
                  >
                    <iframe
                      title="Store Location"
                      src={`https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(branding.google_maps_api_key)}&q=${encodeURIComponent(branding.site_address || branding.site_name)}`}
                      className="w-full h-[200px] pointer-events-none"
                      loading="lazy"
                      style={{ border: 0 }}
                      allowFullScreen
                    />
                    <div className="absolute inset-0 bg-transparent group-hover:bg-primary/5 transition-colors flex items-end justify-center pb-2">
                      <span className="text-[10px] bg-background/80 backdrop-blur-sm px-2.5 py-1 rounded-full text-muted-foreground group-hover:text-primary transition-colors font-medium shadow-sm">
                        <MapPin className="w-3 h-3 inline mr-1 -mt-0.5" />
                        {language === 'km' ? 'បើកក្នុង Google Maps' : 'Open in Google Maps'}
                      </span>
                    </div>
                  </a>
                </div>
              )}

              {youtubeEmbedUrl && (
                <div>
                  <h4 className="text-[11px] font-semibold text-foreground/70 uppercase tracking-widest mb-2.5">
                    <Play className="w-3 h-3 inline mr-1 -mt-0.5" />
                    {language === 'km' ? 'វីដេអូទីតាំង' : 'Video Location'}
                  </h4>
                  <div className="rounded-xl overflow-hidden border border-border/40">
                    <iframe
                      title="Store Video"
                      src={youtubeEmbedUrl}
                      className="w-full h-[200px]"
                      loading="lazy"
                      style={{ border: 0 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-1.5">
            <p className="text-[11px] text-muted-foreground/70">
              © {currentYear} {branding.site_name}. {language === 'km' ? 'រក្សាសិទ្ធិគ្រប់យ៉ាង។' : 'All rights reserved.'}
            </p>
            <p className="text-[10px] text-muted-foreground/40">
              {language === 'km' ? 'ដំណើរការដោយ' : 'Powered by'} {branding.site_name}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
