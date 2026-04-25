import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Linkedin, MessageCircle, Moon, Sun, Youtube } from 'lucide-react';
const logo = "/Logo.jpeg";
import {
  applyTheme,
  getStoredThemePreference,
  persistThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from '../../lib/themePreference';

const LANG_OPTIONS = ['English', 'हिन्दी', 'தமிழ்', 'తెలుగు', 'ಕನ್ನಡ'];

export const Header: React.FC = () => {
  const [activeLang, setActiveLang] = useState('English');
  const [activeTheme, setActiveTheme] = useState<ThemePreference>(() => resolveTheme(getStoredThemePreference()));

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === THEME_STORAGE_KEY) {
        setActiveTheme(resolveTheme(getStoredThemePreference()));
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemePreference = activeTheme === 'dark' ? 'light' : 'dark';
    setActiveTheme(nextTheme);
    persistThemePreference(nextTheme);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50" role="banner">
      <div className="w-full border-b border-charcoal/10 bg-white/98 px-4 py-2.5 shadow-soft-lg backdrop-blur-xl md:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl px-3 py-1.5">
          <Link
            to="/landing"
            className="group inline-flex items-center gap-2 rounded-lg px-1 py-1 text-lg font-light tracking-wide text-charcoal transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gentle-blue/60 focus:ring-offset-2 focus:ring-offset-white md:text-xl lg:text-2xl"
            aria-label="MANAS360 home"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-charcoal/[0.03] p-0.5">
              <img src={logo} alt="MANAS360 logo" className="h-full w-full object-contain" />
            </div>
            <span className="font-serif font-medium">
              MANAS<span className="font-bold">360</span>
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
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-charcoal text-white shadow-soft-md'
                      : 'bg-charcoal/[0.03] text-charcoal/70 hover:bg-charcoal/[0.05] hover:text-charcoal'
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/10 bg-charcoal/[0.03] text-charcoal/70 transition-all duration-300 hover:bg-charcoal/5 hover:text-charcoal"
              aria-label="WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <a
              href="https://instagram.com/manas360"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/10 bg-charcoal/[0.03] text-charcoal/70 transition-all duration-300 hover:bg-charcoal/5 hover:text-charcoal"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://youtube.com/@manas360"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/10 bg-charcoal/[0.03] text-charcoal/70 transition-all duration-300 hover:bg-charcoal/5 hover:text-charcoal"
              aria-label="YouTube"
            >
              <Youtube className="h-4 w-4" />
            </a>
            <a
              href="https://linkedin.com/company/manas360"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/10 bg-charcoal/[0.03] text-charcoal/70 transition-all duration-300 hover:bg-charcoal/5 hover:text-charcoal"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/10 bg-charcoal/[0.03] text-charcoal/70 transition-all duration-300 hover:bg-charcoal/5 hover:text-charcoal"
              aria-label="Toggle theme"
            >
              {activeTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="rounded-full bg-gentle-blue px-4 py-2 text-sm font-medium text-white shadow-soft-md transition-all duration-300 hover:bg-gentle-blue/90"
            >
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
