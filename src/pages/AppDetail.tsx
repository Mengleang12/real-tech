import { useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import realtechLogo from "@/assets/realtech-logo.png";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import {
  Download, Calendar, HardDrive, ExternalLink, Package, ChevronLeft, 
  ChevronRight, X, Shield, ArrowLeft, Home, Search,
  Box, Gamepad2, Puzzle, LayoutGrid, ChevronDown, ShoppingCart, Lock, AlertTriangle,
  ShoppingBag, Tag, Boxes, Play
} from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { appsApi, activityLogsApi, type ApplicableCoupon } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PaymentDialog } from "@/components/PaymentDialog";
import { CouponSuggestion } from "@/components/CouponSuggestion";
import { useHasPurchased } from "@/hooks/useOrders";
import { RichContent } from "@/components/RichTextEditor";
import { useCart } from "@/contexts/CartContext";
import { FloatingCartButton } from "@/components/FloatingCartButton";
const getGradientFromName = (name: string | undefined): string => {
  const gradients = [
    "bg-gradient-to-br from-blue-500 to-cyan-500",
    "bg-gradient-to-br from-purple-500 to-pink-500",
    "bg-gradient-to-br from-green-500 to-emerald-600",
    "bg-gradient-to-br from-orange-500 to-red-500",
    "bg-gradient-to-br from-indigo-500 to-purple-600",
    "bg-gradient-to-br from-amber-500 to-yellow-600",
  ];
  if (!name) return gradients[0];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
};

// Extract YouTube video ID from various URL formats
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Screenshot Gallery Component with Lightbox
const ScreenshotGallery = ({ 
  screenshots, 
  selectedIndex, 
  setSelectedIndex 
}: { 
  screenshots: { image_url: string; sort_order: number }[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  if (!screenshots || screenshots.length === 0) return null;

  const sortedScreenshots = [...screenshots].sort((a, b) => a.sort_order - b.sort_order);

  const handlePrev = () => {
    setSelectedIndex(selectedIndex === 0 ? sortedScreenshots.length - 1 : selectedIndex - 1);
  };

  const handleNext = () => {
    setSelectedIndex(selectedIndex === sortedScreenshots.length - 1 ? 0 : selectedIndex + 1);
  };

  return (
    <>
      {/* Main Screenshot Display */}
      <div 
        className="relative aspect-video bg-muted rounded-xl overflow-hidden cursor-pointer group"
        onClick={() => setLightboxOpen(true)}
      >
        <img
          src={sortedScreenshots[selectedIndex]?.image_url}
          alt={`Screenshot ${selectedIndex + 1}`}
          className="w-full h-full object-contain"
        />
        
        {/* Navigation arrows */}
        {sortedScreenshots.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
        
        {/* Counter */}
        {sortedScreenshots.length > 1 && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded-md text-white text-xs">
            {selectedIndex + 1} / {sortedScreenshots.length}
          </div>
        )}
      </div>

      {/* Horizontal thumbnail strip below main image */}
      {sortedScreenshots.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {sortedScreenshots.map((screenshot, index) => (
            <button
              key={screenshot.image_url}
              onClick={() => setSelectedIndex(index)}
              className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                index === selectedIndex 
                  ? 'border-primary ring-2 ring-primary/30' 
                  : 'border-transparent hover:border-muted-foreground/30'
              }`}
            >
              <img
                src={screenshot.image_url}
                alt={`Thumbnail ${index + 1}`}
                className="w-16 h-12 object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          
          {sortedScreenshots.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-4 p-2 text-white/70 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          
          <img
            src={sortedScreenshots[selectedIndex].image_url}
            alt={`Screenshot ${selectedIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          
          {sortedScreenshots.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-4 p-2 text-white/70 hover:text-white transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
          
          {sortedScreenshots.length > 1 && (
            <div className="absolute bottom-4 text-white/70 text-sm">
              {selectedIndex + 1} / {sortedScreenshots.length}
            </div>
          )}
        </div>
      )}
    </>
  );
};

// Metadata Item Component
const MetadataItem = ({ 
  label, 
  value, 
  expandable 
}: { 
  label: string; 
  value: string | undefined; 
  expandable?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!value) return null;
  
  const isLongValue = value.length > 30;
  const displayValue = expandable && isLongValue && !expanded 
    ? value.substring(0, 30) + '...' 
    : value;
  
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm text-foreground flex items-center gap-1">
        {displayValue}
        {expandable && isLongValue && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-primary hover:text-primary/80 text-xs"
          >
            {expanded ? '▲' : '▼'}
          </button>
        )}
      </div>
    </div>
  );
};

// Loading Skeleton
const AppDetailSkeleton = () => (
  <div className="p-6">
    <div className="flex items-center gap-4 mb-6">
      <Skeleton className="w-16 h-16 rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Skeleton className="aspect-video w-full rounded-xl" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  </div>
);

const AppDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const translations = useTranslations();
  const { user } = useAuth();
  const { addToCart, items } = useCart();
  const [selectedScreenshot, setSelectedScreenshot] = useState(0);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<ApplicableCoupon | null>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number | null>(null);
  const { language, setLanguage } = useLanguage();
  
  // Get the previous location from state or default to home
  const fromPath = (location.state as { from?: string })?.from || '/';
  
  const handleBack = () => {
    // Navigate to the stored path which includes search params (e.g. /?appPage=2)
    if (fromPath) {
      const url = new URL(fromPath, window.location.origin);
      navigate({ pathname: url.pathname, search: url.search });
    } else {
      navigate('/');
    }
  };
  
  const languages = [
    { code: "km" as const, name: "ខ្មែរ", flag: "🇰🇭" },
    { code: "en" as const, name: "EN", flag: "🇬🇧" },
  ];
  const currentLang = languages.find(l => l.code === language) || languages[0];
  const [searchQuery, setSearchQuery] = useState("");
  
  // Extract app ID from URL
  const appId = id ? parseInt(id) : null;
  
  // Check if user has purchased this app
  const { data: hasPurchased, isLoading: purchaseLoading } = useHasPurchased(appId || 0);
  
  // Fetch app details
  const { data: appData, isLoading: appLoading, error: appError } = useQuery({
    queryKey: ["app", appId],
    queryFn: () => appsApi.getById(appId!),
    enabled: !!appId,
  });


  if (!appId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{translations.invalidApp}</h1>
          <Link to="/" className="text-primary hover:underline">{translations.goBackHome}</Link>
        </div>
      </div>
    );
  }

  const displayName = appData ? t(appData.name_km, appData.name) : '';
  const displayDescription = appData ? t(appData.description_km, appData.description) : '';
  
  const categoryLabels: Record<string, string> = {
    programs: translations.programs,
    games: translations.games,
    extensions: translations.extensions,
    os: translations.os
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-background/95 backdrop-blur-xl py-6 px-4 flex-col z-50 border-r border-border/50 hidden lg:flex">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 px-4 mb-8">
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
            <img src={realtechLogo} alt="Realtech Computer" className="w-full h-full object-contain" />
          </div>
          <span className="text-lg font-bold text-foreground">Realtech Computer</span>
        </Link>

        <nav className="flex-1 space-y-1">
          {[
            { id: "all", label: translations.all, icon: LayoutGrid },
            { id: "programs", label: translations.programs, icon: Box },
            { id: "games", label: translations.games, icon: Gamepad2 },
            { id: "extensions", label: translations.extensions, icon: Puzzle },
          ].map((item) => (
            <Link
              key={item.id}
              to={item.id === "all" ? "/" : `/?category=${item.id}`}
              className="sidebar-nav-item w-full group"
            >
              <div className="p-2 rounded-lg transition-all duration-300 bg-accent/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                <item.icon className="w-4 h-4" />
              </div>
              <span className="flex-1 text-left font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 glass py-3 sm:py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Back button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            {/* Search */}
            <div className="flex-1 relative group">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                type="text"
                placeholder={translations.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-sm sm:text-base w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
              />
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Language selector */}
            <div className="relative">
              <button 
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-muted-foreground hover:text-foreground transition-all duration-300 rounded-xl hover:bg-accent"
              >
                <span className="text-base sm:text-lg">{currentLang.flag}</span>
                <span className="text-xs sm:text-sm hidden xs:inline">{currentLang.name}</span>
                <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-300 ${showLangMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showLangMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                  <div className="absolute top-full right-0 mt-2 bg-card rounded-xl border border-border shadow-xl overflow-hidden min-w-[100px] sm:min-w-[120px] z-50 animate-fade-in">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setShowLangMenu(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-accent transition-all duration-300 ${
                          language === lang.code ? 'bg-primary/10 text-primary' : ''
                        }`}
                      >
                        <span className="text-base sm:text-lg">{lang.flag}</span>
                        <span className="text-xs sm:text-sm">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* User actions */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/my-purchases">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {language === 'km' ? 'កម្មវិធីដែលបានទិញ' : 'My Purchases'}
                    </span>
                  </Button>
                </Link>
              </div>
            ) : (
              <Link to="/auth" className="btn-primary text-xs sm:text-sm px-3 sm:px-6 py-2 sm:py-2.5">
                {translations.login}
              </Link>
            )}
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 overflow-x-auto whitespace-nowrap pb-1">
            <Link to="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Home className="w-4 h-4" />
              <span>{translations.home}</span>
            </Link>
            <span>/</span>
            {appData && (
              <>
                <Link 
                  to={`/?category=${appData.category}`} 
                  className="hover:text-foreground transition-colors"
                >
                  {categoryLabels[appData.category] || appData.category}
                </Link>
                <span>/</span>
                <span className="text-foreground">{displayName}</span>
              </>
            )}
          </div>

          {appLoading ? (
            <AppDetailSkeleton />
          ) : appError ? (
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-2">{translations.appNotFound}</h1>
              <p className="text-muted-foreground mb-4">{translations.appNotFound}</p>
              <Button onClick={() => navigate('/')} variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                {translations.backToHome}
              </Button>
            </div>
          ) : appData && (
            <div className="space-y-6">
              {/* ── Hero Section ── */}
              <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start gap-5">
                  {/* App Icon */}
                  {appData.icon_url ? (
                    <img
                      src={appData.icon_url}
                      alt={displayName}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-[1.25rem] shadow-[var(--shadow-window)] object-cover shrink-0 ring-1 ring-border/30"
                    />
                  ) : (
                    <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-[1.25rem] ${getGradientFromName(appData.name)} flex items-center justify-center shadow-[var(--shadow-window)] shrink-0`}>
                      <Package className="w-12 h-12 text-white/80" />
                    </div>
                  )}

                  {/* App Info */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">{displayName}</h1>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                        {appData.developer && (
                          <span className="text-sm font-medium text-primary">{appData.developer}</span>
                        )}
                        <Link
                          to={`/?category=${appData.category}`}
                          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {categoryLabels[appData.category] || appData.category}
                        </Link>
                      </div>
                    </div>

                    {/* Quick stats row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {appData.latest_version && (
                        <span className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-full">
                          <Package className="w-3 h-3" /> v{appData.latest_version}
                        </span>
                      )}
                      {appData.download_count > 0 && (
                        <span className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-full">
                          <Download className="w-3 h-3" /> {appData.download_count.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Main Content Grid ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left — Screenshots + Description */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Screenshots */}
                  <div className="bg-card rounded-2xl border border-border/50 p-4 sm:p-5">
                    {appData.screenshots && appData.screenshots.length > 0 ? (
                      <ScreenshotGallery
                        screenshots={appData.screenshots}
                        selectedIndex={selectedScreenshot}
                        setSelectedIndex={setSelectedScreenshot}
                      />
                    ) : (
                      <div className="aspect-video bg-muted/50 rounded-xl flex items-center justify-center">
                        <Package className="w-16 h-16 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {displayDescription && (
                    <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8">
                      <h2 className="text-lg font-semibold mb-1">{translations.description}</h2>
                      <div className="w-10 h-0.5 bg-primary rounded-full mb-5" />
                      <RichContent html={displayDescription} className="text-sm text-muted-foreground leading-relaxed" />
                    </div>
                  )}

                  {/* YouTube Tutorial Videos */}
                  {(() => {
                    const priceNum = typeof appData.price === 'string' ? parseFloat(appData.price) : (appData.price || 0);
                    const isPaidApp = priceNum > 0;
                    const canViewVideos = !isPaidApp || hasPurchased === true;
                    const videos = appData.videos || [];

                    if (videos.length === 0) return null;

                    if (!canViewVideos) {
                      return (
                        <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8">
                          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                            <Play className="w-5 h-5 text-destructive" />
                            {language === 'km' ? 'វីដេអូលក្ខណៈពិសេស' : 'Feature Video'}
                          </h2>
                          <div className="w-10 h-0.5 bg-destructive rounded-full mb-5" />
                          <div className="py-8 text-center">
                            <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground font-medium">
                              {language === 'km' ? 'ទិញកម្មវិធីដើម្បីមើលវីដេអូ' : 'Purchase this app to view feature videos'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {videos.length} {language === 'km' ? 'វីដេអូ' : videos.length === 1 ? 'video' : 'videos'} {language === 'km' ? 'មាន' : 'available'}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8">
                        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                          <Play className="w-5 h-5 text-destructive" />
                          {language === 'km' ? 'វីដេអូលក្ខណៈពិសេស' : 'Feature Video'}
                          <Badge variant="secondary" className="text-xs">{videos.length}</Badge>
                        </h2>
                        <div className="w-10 h-0.5 bg-destructive rounded-full mb-5" />
                        <div className="space-y-6">
                          {videos.map((video) => {
                            const videoId = getYouTubeVideoId(video.youtube_url);
                            if (!videoId) return null;
                            return (
                              <div key={video.id}>
                                <h3 className="text-sm font-medium mb-2">{video.title}</h3>
                                <div className="aspect-video rounded-xl overflow-hidden bg-muted border border-border/50">
                                  <iframe
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    title={video.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                </div>

                {/* Right Sidebar — Download + Metadata */}
                <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
                  {/* Download / Purchase CTA */}
                  <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                    {/* Variant selector */}
                    {(() => {
                      const priceNum = typeof appData.price === 'string' ? parseFloat(appData.price) : (appData.price || 0);
                      const isPaidApp = priceNum > 0;
                      const inCart = items.some(i => i.app.id === appData.id);
                      const hasVariants = appData.variants && appData.variants.length > 0;
                      const activeVariants = hasVariants ? appData.variants!.filter(v => v.is_active) : [];
                      const selectedVariant = selectedVariantIdx !== null ? activeVariants[selectedVariantIdx] : null;
                      const variantAdj = Number(selectedVariant?.price_adjustment) || 0;
                      const finalPrice = priceNum + variantAdj;
                      const priceDisplay = finalPrice > 0 ? `$${finalPrice.toFixed(2)}` : '';

                      // Stock calculation
                      const totalStock = hasVariants
                        ? activeVariants.reduce((s, v) => s + v.stock_quantity, 0)
                        : (appData.stock_quantity ?? 0);
                      const selectedStock = selectedVariant ? selectedVariant.stock_quantity : totalStock;
                      const isOOS = selectedStock <= 0;
                      const isLowStock = selectedStock > 0 && selectedStock <= (appData.low_stock_threshold ?? 5);

                      return (
                        <div className="space-y-3">
                          {/* Variant picker */}
                          {hasVariants && activeVariants.length > 0 && (
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                {language === 'km' ? 'ជ្រើសរើសប្រភេទ' : 'Select variant'}
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                {activeVariants.map((v, idx) => {
                                  const label = Object.values(v.combination).join(' / ');
                                  const vOOS = v.stock_quantity <= 0;
                                  const selected = selectedVariantIdx === idx;
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setSelectedVariantIdx(selected ? null : idx)}
                                      disabled={vOOS}
                                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                                        vOOS
                                          ? 'border-border/30 text-muted-foreground/40 line-through cursor-not-allowed'
                                          : selected
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-border hover:border-primary/50 text-foreground'
                                      }`}
                                    >
                                      {label}
                                      {Number(v.price_adjustment) > 0 && !vOOS && (
                                        <span className="ml-1 text-[10px] opacity-70">+${Number(v.price_adjustment).toFixed(0)}</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Stock indicator */}
                          {isOOS ? (
                            <div className="text-center py-2 bg-destructive/10 rounded-lg">
                              <span className="text-sm font-semibold text-destructive">
                                {language === 'km' ? 'អស់ស្តុក' : 'Out of Stock'}
                              </span>
                            </div>
                          ) : isLowStock ? (
                            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {selectedStock} {language === 'km' ? 'នៅសល់' : 'left in stock'}
                            </div>
                          ) : null}

                          {/* Price display */}
                          <div className="flex items-baseline gap-2">
                            {finalPrice > 0 ? (
                              <>
                                <span className="text-2xl font-bold text-destructive">${finalPrice.toFixed(2)}</span>
                                {variantAdj > 0 && (
                                  <span className="text-xs text-muted-foreground line-through">${priceNum.toFixed(2)}</span>
                                )}
                              </>
                            ) : (
                              <span className="text-xl font-bold text-primary">
                                {language === 'km' ? 'ឥតគិតថ្លៃ' : 'Free'}
                              </span>
                            )}
                          </div>

                          {isPaidApp && user && purchaseLoading ? (
                            <Button className="w-full h-12 text-sm font-semibold gap-2" disabled>
                              <ShoppingCart className="w-4 h-4 animate-pulse" />
                              {language === 'km' ? 'កំពុងពិនិត្យ...' : 'Checking...'}
                            </Button>
                          ) : (
                            <>
                              {/* Direct Buy button */}
                              <Button
                                className="w-full h-12 text-sm font-semibold gap-2 bg-green-600 hover:bg-green-700 text-white"
                                disabled={isOOS || (hasVariants && !selectedVariant)}
                                onClick={() => {
                                  if (!user) { navigate('/auth'); return; }
                                  if (isPaidApp && !hasPurchased) {
                                    setShowPaymentDialog(true);
                                  } else {
                                    addToCart(appData, null, selectedVariant);
                                    navigate('/checkout');
                                  }
                                }}
                              >
                                <ShoppingCart className="w-4 h-4" />
                                {isOOS
                                  ? (language === 'km' ? 'អស់ស្តុក' : 'Out of Stock')
                                  : hasVariants && !selectedVariant
                                    ? (language === 'km' ? 'សូមជ្រើសរើសប្រភេទ' : 'Select a variant')
                                    : isPaidApp && !hasPurchased
                                      ? (language === 'km' ? 'ទិញឥឡូវ' : 'Buy Now') + (priceDisplay ? ` — ${priceDisplay}` : '')
                                      : (language === 'km' ? 'ទទួលបានឥឡូវ' : 'Get Now')
                                }
                              </Button>
                              {/* Add to Cart button */}
                              <Button
                                variant="outline"
                                className="w-full h-10 text-sm font-medium gap-2"
                                disabled={inCart || isOOS || (hasVariants && !selectedVariant)}
                                onClick={() => {
                                  addToCart(appData, null, selectedVariant);
                                  toast.success(language === 'km' ? 'បានបន្ថែមទៅកន្ត្រក' : 'Added to cart');
                                }}
                              >
                                <ShoppingBag className="w-4 h-4" />
                                {inCart
                                  ? (language === 'km' ? 'មានក្នុងកន្ត្រក' : 'In Cart')
                                  : (language === 'km' ? 'បន្ថែមទៅកន្ត្រក' : 'Add to Cart')}
                              </Button>
                            </>
                          )}

                          {isPaidApp && !hasPurchased && (
                            <CouponSuggestion
                              price={finalPrice}
                              onSelectCoupon={setSelectedCoupon}
                              selectedCoupon={selectedCoupon}
                            />
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Metadata Card */}

                  {/* Product Attributes */}
                  {appData.attribute_values && appData.attribute_values.length > 0 && (
                    <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50">
                      <h3 className="text-sm font-semibold px-5 py-3.5 text-foreground flex items-center gap-2">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        {language === 'km' ? 'លក្ខណៈពិសេស' : 'Specifications'}
                      </h3>
                      {appData.attribute_values
                        .filter(av => av.attribute && av.value)
                        .sort((a, b) => (a.attribute?.sort_order || 0) - (b.attribute?.sort_order || 0))
                        .map((av) => {
                          const iconName = av.attribute?.icon as keyof typeof dynamicIconImports | undefined;
                          const LazyAttrIcon = iconName && dynamicIconImports[iconName]
                            ? lazy(dynamicIconImports[iconName])
                            : null;
                          const displayValue = av.attribute?.type === 'boolean'
                            ? (av.value === 'true' || av.value === '1' ? (language === 'km' ? 'មាន' : 'Yes') : (language === 'km' ? 'គ្មាន' : 'No'))
                            : av.value;

                          return (
                            <div key={av.id} className="flex items-center justify-between px-5 py-3">
                              <span className="text-xs text-muted-foreground flex items-center gap-2">
                                {LazyAttrIcon ? (
                                  <Suspense fallback={<div className="w-3.5 h-3.5" />}>
                                    <LazyAttrIcon className="w-3.5 h-3.5" />
                                  </Suspense>
                                ) : (
                                  <Tag className="w-3.5 h-3.5" />
                                )}
                                {language === 'km' && av.attribute?.name_km ? av.attribute.name_km : av.attribute?.name}
                              </span>
                              <span className="text-xs font-medium text-foreground">{displayValue}</span>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Variant Stock */}
                  {appData.variants && appData.variants.length > 0 && (
                    <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50">
                      <h3 className="text-sm font-semibold px-5 py-3.5 text-foreground flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-muted-foreground" />
                        {language === 'km' ? 'ស្តុកតាមប្រភេទ' : 'Stock Availability'}
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border/50 bg-muted/30">
                              {(() => {
                                const firstCombo = appData.variants[0]?.combination || {};
                                return Object.keys(firstCombo).map(attrId => {
                                  const attr = appData.attribute_values?.find(av => av.attribute_id === parseInt(attrId))?.attribute;
                                  return <th key={attrId} className="text-left px-4 py-2 font-medium text-muted-foreground">{language === 'km' && attr?.name_km ? attr.name_km : attr?.name || attrId}</th>;
                                });
                              })()}
                              <th className="text-right px-4 py-2 font-medium text-muted-foreground">{language === 'km' ? 'ស្តុក' : 'Stock'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {appData.variants.filter(v => v.is_active).map((variant, idx) => (
                              <tr key={idx}>
                                {Object.entries(variant.combination).map(([attrId, val]) => {
                                  const attr = appData.attribute_values?.find(av => av.attribute_id === parseInt(attrId))?.attribute;
                                  const display = attr?.type === 'boolean' ? (val === 'true' ? (language === 'km' ? 'មាន' : 'Yes') : (language === 'km' ? 'គ្មាន' : 'No')) : val;
                                  return <td key={attrId} className="px-4 py-2.5">{display}</td>;
                                })}
                                <td className="px-4 py-2.5 text-right">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${variant.stock_quantity > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'}`}>
                                    {variant.stock_quantity > 0 ? `${variant.stock_quantity} ${language === 'km' ? 'នៅក្នុងស្តុក' : 'in stock'}` : (language === 'km' ? 'អស់ស្តុក' : 'Out of stock')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Payment Dialog */}
      {appData && appData.price && appData.price > 0 && (
        <PaymentDialog
          open={showPaymentDialog}
          onOpenChange={(open) => {
            setShowPaymentDialog(open);
            if (!open) setSelectedCoupon(null); // Reset coupon when closing
          }}
          appId={appData.id}
          appName={displayName}
          price={appData.price}
          downloadUrl={undefined}
          coupon={selectedCoupon}
          onPaymentSuccess={() => {
            // Refresh purchase status - dialog stays open to show success
            setSelectedCoupon(null);
          }}
        />
      )}

      <FloatingCartButton />
    </div>
  );
};

export default AppDetail;
