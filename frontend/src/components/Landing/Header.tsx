import React, { useState } from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Linkedin, MessageCircle, Youtube } from 'lucide-react';
import { MegaNav } from './MegaNav';
import { theme } from '../../theme/theme';

const LANG_OPTIONS = ['English', 'हिन्दी', 'தமிழ்', 'తెలుగు', 'ಕನ್ನಡ'];

export const Header: React.FC = () => {
  const [activeLang, setActiveLang] = useState('English');
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      if (scrollHeight <= 0) {
        setScrollProgress(0);
        return;
      }

      const progress = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
      setScrollProgress(progress);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50" role="banner">
      <div
        className="w-full border-b border-calm-sage/20 px-4 py-2.5 shadow-soft-md backdrop-blur-md transition-all duration-500 md:px-6 lg:px-10"
        style={{ backgroundColor: theme.colors.brandTopbarOverlay }}
      >
        {/* Top row: brand + actions */}
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl px-3 py-1.5">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 rounded-lg px-1 py-1 text-lg font-light tracking-wide text-cream transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gentle-blue/60 focus:ring-offset-2 focus:ring-offset-charcoal md:text-xl lg:text-2xl"
            aria-label="MANAS360 home"
          >
            <img
              src="/Untitled.png"
              alt="MANAS360 logo"
              className="h-6 w-6 rounded-md object-cover"
            />
            <span className="font-serif">
              MANAS<span className="font-semibold">360</span>
            </span>
          </Link>

          <div className="hidden flex-wrap items-center justify-center gap-1.5 lg:flex">
            {LANG_OPTIONS.map((lang) => {
              const isActive = activeLang === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLang(lang)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                    isActive
                      ? 'border-calm-sage bg-calm-sage text-charcoal'
                      : 'border-white/25 bg-white/10 text-cream hover:border-white/40 hover:bg-white/20'
                  }`}
                  aria-label={`Select language ${lang}`}
                >
                  {lang}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/patient/pricing"
              className="hidden rounded-full px-4 py-2 text-xs font-medium tracking-wide text-cream/75 transition-all duration-300 hover:text-cream sm:inline-flex md:text-sm"
            >
              Subscribe
            </Link>

            <Link
              to="/auth/login"
              className="inline-flex min-h-[36px] items-center justify-center rounded-full bg-cream px-4 py-1.5 text-xs font-semibold tracking-wide text-charcoal transition-all duration-300 hover:bg-white md:min-h-[40px] md:px-5 md:text-sm"
            >
              Login / Signup
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-cream/75 transition hover:bg-white/15 hover:text-white"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com/manas360"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-cream/75 transition hover:bg-white/15 hover:text-white"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://youtube.com/@manas360"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-cream/75 transition hover:bg-white/15 hover:text-white"
                aria-label="YouTube"
              >
                <Youtube className="h-4 w-4" />
              </a>
              <a
                href="https://linkedin.com/company/manas360"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-cream/75 transition hover:bg-white/15 hover:text-white"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <MegaNav tone="dark" />

        <div className="mt-2 h-[2px] w-full rounded-full bg-white/10" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gentle-blue/90 transition-[width] duration-150 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
