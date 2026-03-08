import { useState, useEffect } from 'react';
import { SEOHead } from '@/components/SEOHead';
import { ArrowLeft, Heart, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWishlist } from '@/hooks/useWishlist';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { appsApi, type App } from '@/lib/api';
import { PageTransition } from '@/components/PageTransition';
import { EmptyState } from '@/components/EmptyState';

const Wishlist = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { wishlist, toggle } = useWishlist();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApps = async () => {
      if (wishlist.length === 0) {
        setApps([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Fetch all apps and filter by wishlist
        const response = await appsApi.getAll({ limit: 200 });
        const wishlisted = response.data.filter(app => wishlist.includes(app.id));
        setApps(wishlisted);
      } catch {
        setApps([]);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, [wishlist]);

  return (
    <>
    <SEOHead title="Wishlist" noindex />
    <div className={`min-h-screen bg-background ${language === 'km' ? 'font-khmer' : ''}`}>
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Heart className="w-4 h-4 text-destructive" />
          <h1 className="text-base font-semibold">
            {language === 'km' ? 'បញ្ជីសំណព្វ' : 'My Wishlist'}
          </h1>
          <span className="text-xs text-muted-foreground">({wishlist.length})</span>
        </div>
      </div>

      {/* Content */}
      <PageTransition transitionKey="wishlist">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : apps.length === 0 ? (
            <EmptyState
              icon={Heart}
              title={language === 'km' ? 'បញ្ជីសំណព្វរបស់អ្នកទទេ' : 'Your wishlist is empty'}
              description={language === 'km' ? 'រកផលិតផលដែលអ្នកចូលចិត្ត' : 'Save your favorite products here'}
              action={
                <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                  {language === 'km' ? 'រកកម្មវិធី' : 'Browse Apps'}
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {apps.map(app => (
                <div key={app.id} className="relative">
                  <ProductCard app={app} />
                  <button
                    onClick={(e) => { e.stopPropagation(); toggle(app.id); }}
                    className="absolute top-1 left-1 z-10 p-1 rounded-full bg-background/80 backdrop-blur hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageTransition>
    </div>
    </>
  );
};

export default Wishlist;
