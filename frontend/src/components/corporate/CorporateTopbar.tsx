import { Bell, ChevronDown, LogOut, Menu, Settings, Shield, User } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

type CorporateTopbarProps = {
  title: string;
  companyName: string;
  locationLabel?: string;
  onMenuToggle: () => void;
};

export default function CorporateTopbar({ title, companyName, locationLabel = 'Bengaluru, India', onMenuToggle }: CorporateTopbarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div className="flex h-full items-center px-4 lg:px-6">
        <button type="button" className="mr-2 rounded-lg p-2 hover:bg-ink-50 md:hidden" onClick={onMenuToggle}>
          <Menu className="h-5 w-5 text-ink-700" />
        </button>
        <div>
          <p className="font-display text-sm font-bold text-ink-800">MANAS360 Enterprise</p>
          <p className="text-xs text-ink-500">{title} · {companyName}</p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden rounded-full bg-ink-50 px-2.5 py-1 text-xs text-ink-600 md:inline">{locationLabel}</span>
          <button type="button" className="rounded-lg p-2 hover:bg-ink-50" aria-label="Notifications">
            <Bell className="h-4 w-4 text-ink-600" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-2 py-1.5 hover:bg-ink-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sage-100 text-xs font-semibold text-sage-700">HR</span>
              <ChevronDown className="h-4 w-4 text-ink-500" />
            </button>

            {open ? (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-ink-100 bg-white p-1 shadow-soft-sm">
                <Link to="/corporate/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <Link to="/corporate/account/help" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">
                  <Settings className="h-4 w-4" />
                  Company Settings
                </Link>
                <Link to="/corporate/sso" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">
                  <Shield className="h-4 w-4" />
                  SSO Settings
                </Link>
                <Link to="/corporate/billing/invoices" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">
                  <Settings className="h-4 w-4" />
                  Billing
                </Link>
                <Link to="/corporate/account/help" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">
                  <Settings className="h-4 w-4" />
                  Help
                </Link>
                <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50">
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
