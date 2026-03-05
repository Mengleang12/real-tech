import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { slidersApi, type Slider } from "@/lib/api";

const fallbackSlides = [
  {
    id: 1, badge: "NEW ARRIVAL", badge_km: "មកដល់ថ្មី",
    title: "MacBook Pro M4", title_km: "MacBook Pro M4",
    subtitle: "The most powerful MacBook ever. Up to 24-core GPU & 128GB unified memory.",
    subtitle_km: "MacBook ដែលមានថាមពលខ្លាំងបំផុត។ GPU រហូតដល់ 24-core និង 128GB unified memory។",
    image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1400&h=500&fit=crop&q=90",
    gradient: "from-slate-950/90 via-slate-900/60 to-transparent",
    accent_color: "#007AFF", link_url: "",
  },
];

const INTERVAL = 5000;

export const HeroSlider = () => {
  const [slides, setSlides] = useState<typeof fallbackSlides>(fallbackSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [prevSlide, setPrevSlide] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [progress, setProgress] = useState(0);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch sliders from API
  useEffect(() => {
    slidersApi.getActive()
      .then(res => {
        if (res.sliders && res.sliders.length > 0) {
          setSlides(res.sliders.map(s => ({
            id: s.id,
            title: s.title || "",
            title_km: s.title_km || "",
            subtitle: s.subtitle || "",
            subtitle_km: s.subtitle_km || "",
            badge: s.badge || "",
            badge_km: s.badge_km || "",
            image_url: s.image_url,
            gradient: s.gradient || "from-slate-950/90 via-slate-900/60 to-transparent",
            accent_color: s.accent_color || "#007AFF",
            link_url: s.link_url || "",
          })));
        }
      })
      .catch(() => {/* use fallback */});
  }, []);

  const goToSlide = (index: number) => {
    if (animating || index === currentSlide) return;
    setPrevSlide(currentSlide);
    setAnimating(true);
    setCurrentSlide(index);
    setProgress(0);
    setTimeout(() => setAnimating(false), 600);
  };

  const nextSlide = () => goToSlide((currentSlide + 1) % slides.length);
  const prevSlideBtn = () => goToSlide((currentSlide - 1 + slides.length) % slides.length);

  const handleSlideClick = () => {
    const slide = slides[currentSlide];
    if (slide.link_url) {
      if (slide.link_url.startsWith("http")) {
        window.open(slide.link_url, "_blank");
      } else {
        navigate(slide.link_url);
      }
    }
  };

  // Progress bar + auto-advance
  useEffect(() => {
    if (slides.length <= 1) return;
    setProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    const step = 100 / (INTERVAL / 50);
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + step, 100));
    }, 50);

    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => {
        setPrevSlide(prev);
        setAnimating(true);
        setTimeout(() => setAnimating(false), 600);
        setProgress(0);
        return (prev + 1) % slides.length;
      });
    }, INTERVAL);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentSlide, slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[currentSlide];
  const prev = prevSlide !== null ? slides[prevSlide] : null;

  return (
    <div
      className={`relative mt-4 group overflow-hidden border border-border shadow-md ${slide.link_url ? 'cursor-pointer' : ''}`}
      style={{ borderRadius: "var(--radius)" }}
      onClick={handleSlideClick}
    >
      <div className="relative h-52 sm:h-64 md:h-80">
        {/* Previous slide (fades out) */}
        {prev && animating && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${prev.image_url})`,
              animation: "hero-fade-out 0.6s ease forwards",
            }}
          />
        )}

        {/* Current slide image (fades in) */}
        <div
          key={currentSlide}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${slide.image_url})`,
            animation: "hero-fade-in 0.7s ease forwards",
          }}
        />

        {/* Gradient overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`}
          style={{ transition: "opacity 0.6s ease" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Content */}
        <div
          key={`content-${currentSlide}`}
          className="absolute inset-0 flex flex-col justify-end p-5 sm:p-7 z-10"
          style={{ animation: "hero-content-up 0.6s ease forwards" }}
        >
          {(slide.badge || slide.badge_km) && (
            <span
              className="inline-flex items-center self-start text-[10px] font-bold px-2.5 py-1 rounded-full mb-3 uppercase tracking-widest text-white"
              style={{ backgroundColor: slide.accent_color, boxShadow: `0 0 12px ${slide.accent_color}60` }}
            >
              {language === "km" ? (slide.badge_km || slide.badge) : slide.badge}
            </span>
          )}

          {(slide.title || slide.title_km) && (
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1.5 leading-tight drop-shadow-sm">
              {language === "km" ? (slide.title_km || slide.title) : slide.title}
            </h2>
          )}
          {(slide.subtitle || slide.subtitle_km) && (
            <p className="text-sm sm:text-base text-white/75 mb-4 max-w-md leading-relaxed">
              {language === "km" ? (slide.subtitle_km || slide.subtitle) : slide.subtitle}
            </p>
          )}
          {slide.link_url && (
            <span
              className="self-start text-sm font-semibold text-white px-4 py-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: slide.accent_color,
                boxShadow: `0 4px 14px ${slide.accent_color}50`,
              }}
            >
              {language === "km" ? "មើលបន្ថែម" : "Learn More"}
            </span>
          )}
        </div>

        {/* Arrow buttons */}
        {slides.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevSlideBtn(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/25 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 border border-white/20 hover:scale-110 z-20"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextSlide(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/25 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 border border-white/20 hover:scale-110 z-20"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Slide counter */}
        {slides.length > 1 && (
          <div className="absolute top-3 right-4 text-[11px] font-medium text-white/60 z-20 tabular-nums">
            {currentSlide + 1} / {slides.length}
          </div>
        )}
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={(e) => { e.stopPropagation(); goToSlide(index); }}
                className="transition-all duration-300"
                style={{
                  height: "6px",
                  borderRadius: "3px",
                  width: index === currentSlide ? "20px" : "6px",
                  backgroundColor: index === currentSlide ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes hero-fade-in {
          from { opacity: 0; transform: scale(1.04); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes hero-fade-out {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.97); }
        }
        @keyframes hero-content-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
