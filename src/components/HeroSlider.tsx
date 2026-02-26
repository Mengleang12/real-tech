import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const slides = [
  {
    id: 1,
    badge: "NEW ARRIVAL",
    badge_km: "មកដល់ថ្មី",
    title: "MacBook Pro M4",
    title_km: "MacBook Pro M4",
    subtitle: "The most powerful MacBook ever. Up to 24-core GPU & 128GB unified memory.",
    subtitle_km: "MacBook ដែលមានថាមពលខ្លាំងបំផុត។ GPU រហូតដល់ 24-core និង 128GB unified memory។",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1400&h=500&fit=crop&q=90",
    gradient: "from-slate-950/90 via-slate-900/60 to-transparent",
    accent: "#007AFF",
  },
  {
    id: 2,
    badge: "BEST SELLER",
    badge_km: "លក់ដាច់បំផុត",
    title: "Portable Monitor 16\" 2.5K",
    title_km: "ម៉ូនីទ័រចល័ត 16\" 2.5K",
    subtitle: "120Hz refresh rate, 100% sRGB, USB-C & HDMI. Perfect for on-the-go productivity.",
    subtitle_km: "120Hz, 100% sRGB, USB-C & HDMI។ ល្អឥតខ្ចោះសម្រាប់ការងារគ្រប់ទីកន្លែង។",
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1400&h=500&fit=crop&q=90",
    gradient: "from-blue-950/90 via-indigo-900/60 to-transparent",
    accent: "#E40046",
  },
  {
    id: 3,
    badge: "PROMOTION",
    badge_km: "ប្រូម៉ូសិន",
    title: "MacBook Air M3",
    title_km: "MacBook Air M3",
    subtitle: "Supercharged by M3 chip. Stunningly thin, up to 18 hours of battery life.",
    subtitle_km: "ថាមពល M3 chip។ ស្តើងអស្ចារ្យ ថ្មប្រើបានរហូតដល់ 18 ម៉ោង។",
    image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=1400&h=500&fit=crop&q=90",
    gradient: "from-gray-950/90 via-gray-800/60 to-transparent",
    accent: "#34C759",
  },
  {
    id: 4,
    badge: "FREE DELIVERY",
    badge_km: "ដឹកជញ្ជូនឥតគិតថ្លៃ",
    title: "4K Portable Monitor 13.4\"",
    title_km: "ម៉ូនីទ័រចល័ត 4K 13.4\"",
    subtitle: "IGZO panel, 338ppi, 100% sRGB, 500 Nits brightness. Ultra-sharp display anywhere.",
    subtitle_km: "អេក្រង់ IGZO, 338ppi, 100% sRGB, ពន្លឺ 500 Nits។ អេក្រង់ច្បាស់គ្រប់ទីកន្លែង។",
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=1400&h=500&fit=crop&q=90",
    gradient: "from-indigo-950/90 via-blue-900/60 to-transparent",
    accent: "#FF9500",
  },
];

const INTERVAL = 5000;

export const HeroSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [prevSlide, setPrevSlide] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [progress, setProgress] = useState(0);
  const { language } = useLanguage();
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Progress bar + auto-advance
  useEffect(() => {
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
  }, [currentSlide]);

  const slide = slides[currentSlide];
  const prev = prevSlide !== null ? slides[prevSlide] : null;

  return (
    <div
      className="relative mt-4 mb-8 group overflow-hidden border border-border shadow-md"
      style={{ borderRadius: "var(--radius)" }}
    >
      <div className="relative h-52 sm:h-64 md:h-80">

        {/* Previous slide (fades out) */}
        {prev && animating && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${prev.image})`,
              animation: "hero-fade-out 0.6s ease forwards",
            }}
          />
        )}

        {/* Current slide image (fades in) */}
        <div
          key={currentSlide}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${slide.image})`,
            animation: "hero-fade-in 0.7s ease forwards",
          }}
        />

        {/* Gradient overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`}
          style={{ transition: "opacity 0.6s ease" }}
        />
        {/* Bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Content */}
        <div
          key={`content-${currentSlide}`}
          className="absolute inset-0 flex flex-col justify-end p-5 sm:p-7 z-10"
          style={{ animation: "hero-content-up 0.6s ease forwards" }}
        >
          {/* Badge */}
          <span
            className="inline-flex items-center self-start text-[10px] font-bold px-2.5 py-1 rounded-full mb-3 uppercase tracking-widest text-white"
            style={{ backgroundColor: slide.accent, boxShadow: `0 0 12px ${slide.accent}60` }}
          >
            {language === "km" ? slide.badge_km : slide.badge}
          </span>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1.5 leading-tight drop-shadow-sm">
            {language === "km" ? slide.title_km : slide.title}
          </h2>
          <p className="text-sm sm:text-base text-white/75 mb-4 max-w-md leading-relaxed">
            {language === "km" ? slide.subtitle_km : slide.subtitle}
          </p>
          <button
            className="self-start text-sm font-semibold text-white px-4 py-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: slide.accent,
              boxShadow: `0 4px 14px ${slide.accent}50`,
            }}
          >
            {language === "km" ? "មើលបន្ថែម" : "Learn More"}
          </button>
        </div>

        {/* Arrow buttons */}
        <button
          onClick={prevSlideBtn}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/25 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 border border-white/20 hover:scale-110 z-20"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/25 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 border border-white/20 hover:scale-110 z-20"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Slide counter */}
        <div className="absolute top-3 right-4 text-[11px] font-medium text-white/60 z-20 tabular-nums">
          {currentSlide + 1} / {slides.length}
        </div>
      </div>

      {/* Progress bar + dot indicators */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {/* Dot indicators */}
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
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
