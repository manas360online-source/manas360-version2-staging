import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowLeft } from 'lucide-react';
import { useEnrollmentStore } from '../store/CertificationEnrollmentStore';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { enrollments } = useEnrollmentStore();

  const navLinks = [
    { name: 'Journey', path: '/' },
    { name: 'My Certifications', path: '/my-certifications' },
    { name: 'Lead Boost', path: '/dashboard' },
    { name: 'Admin', path: '/admin' },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50">
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 transition-all">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex justify-between h-16 md:h-24 items-center">
            
            {/* Left Side: Back Button (Always Visible) */}
            <div className="flex items-center">
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center gap-2 md:gap-3 text-slate-700 hover:text-slate-900 transition-colors group"
                >
                    <div className="bg-slate-100 p-2 md:p-3 rounded-full group-hover:bg-slate-200 transition-colors">
                        <ArrowLeft size={20} className="md:w-8 md:h-8" />
                    </div>
                    <span className="text-lg md:text-xl font-bold font-serif">Back</span>
                </button>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-base font-bold transition-colors duration-200 flex items-center gap-2 ${
                    location.pathname === link.path
                      ? 'text-purple-600 bg-purple-50 px-5 py-2.5 rounded-full'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {link.name}
                  {link.name === 'My Certifications' && enrollments.length > 0 && (
                    <span className="bg-purple-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
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
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
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
                  className={`block px-4 py-3 rounded-xl text-base font-bold flex justify-between items-center ${
                    location.pathname === link.path
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {link.name}
                  {link.name === 'My Certifications' && enrollments.length > 0 && (
                    <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
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
        {children}
      </main>

      <footer className="bg-white border-t border-slate-100 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="font-serif text-xl mb-2 text-slate-800 font-bold">MANAS360</p>
          <p className="text-sm text-slate-400">© 2024 Certification Platform. Professional Demo.</p>
        </div>
      </footer>
    </div>
  );
};
