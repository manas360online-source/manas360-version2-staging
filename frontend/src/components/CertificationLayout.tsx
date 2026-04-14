import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Menu, X, ArrowLeft } from 'lucide-react';
// @ts-ignore
import useEnrollmentStore from '../store/CertificationEnrollmentStore';

export const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();

  const { enrollments } = useEnrollmentStore();

  const handleBack = () => {
    // Get language from current hash e.g. #/en/certification-platform -> 'en'
    const hash = window.location.hash;
    const langMatch = hash.match(/^#\/([a-z]{2})\//);
    const lang = langMatch ? langMatch[1] : 'en';
    window.location.hash = `#/${lang}/home`;
  };

  const navLinks = [
    { name: 'Journey', path: '/certifications' },
    { name: 'My Certifications', path: '/my-certifications' },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50">
      <nav className="no-print bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 transition-all">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex justify-between h-14 md:h-20 items-center">

            {/* Left Side: Back Button (Always Visible) */}
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors group"
              >
                <div className="bg-slate-100 p-2 rounded-full group-hover:bg-slate-200 transition-colors">
                  <ArrowLeft size={18} className="md:w-5 md:h-5" />
                </div>
                <span className="text-base md:text-lg font-bold font-serif">Back</span>
              </button>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-bold transition-colors duration-200 flex items-center gap-2 ${location.pathname === link.path
                    ? 'text-purple-600 bg-purple-50 px-4 py-2 rounded-full'
                    : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                  {link.name}
                  {link.name === 'My Certifications' && enrollments.length > 0 && (
                    <span className="bg-purple-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                      {enrollments.length}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-slate-500 hover:text-slate-900 focus:outline-none p-2"
              >
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-100 absolute w-full shadow-xl animate-fade-in-up">
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-sm font-bold flex justify-between items-center ${location.pathname === link.path
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  {link.name}
                  {link.name === 'My Certifications' && enrollments.length > 0 && (
                    <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {enrollments.length}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow">
        {children || <Outlet />}
      </main>

      <footer className="no-print bg-white border-t border-slate-100 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="font-serif text-lg mb-1 text-slate-800 font-bold">MANAS360</p>
          <p className="text-xs text-slate-400">© 2024 Certification Platform. Professional Demo.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
