import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, Calendar, Settings, MessageSquare, CreditCard, LogOut, ClipboardCheck, Star, Radio, GraduationCap, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ProviderSidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const role = String(user?.role || 'THERAPIST').toUpperCase();

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/auth/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getMenuConfig = (_providerRole: string) => {
    const isLearner = _providerRole === 'LEARNER';

    if (isLearner) {
      return [
        {
          category: 'LEARNER',
          items: [
            { label: 'Dashboard', path: '/provider/dashboard', icon: <Home size={18} /> },
            { label: 'Certifications', path: '/provider/certifications', icon: <Award size={18} /> },
            { label: 'My Certifications', path: '/provider/my-certifications', icon: <ClipboardCheck size={18} /> },
            { label: 'Complete Onboarding', path: '/onboarding/provider-setup', icon: <Star size={18} /> },
            { label: 'Messages', path: '/provider/messages', icon: <MessageSquare size={18} /> },
            { label: 'Settings', path: '/provider/settings', icon: <Settings size={18} /> },
          ],
        },
      ];
    }

    const baseMenu = [
      {
        category: 'MAIN',
        items: [
          { label: 'Dashboard', path: '/provider/dashboard', icon: <Home size={18} /> },
          { label: 'My Patients', path: '/provider/patients', icon: <Users size={18} /> },
          { label: 'Calendar', path: '/provider/calendar', icon: <Calendar size={18} /> },
          { label: 'Appointments', path: '/provider/appointments', icon: <ClipboardCheck size={18} /> },
          { label: 'Group Therapy', path: '/provider/portal', icon: <Radio size={18} /> },
        ]
      }
    ];

    const bottomMenu = [
      {
        category: 'PRACTICE & SUPPORT',
        items: [
          { label: 'Earnings', path: '/provider/earnings', icon: <CreditCard size={18} /> },
          { label: 'Premium Plan', path: '/provider/subscription', icon: <Star size={18} /> },
          { label: 'Certifications', path: '/provider/certifications', icon: <Award size={18} /> },
          { label: 'Messages', path: '/provider/messages', icon: <MessageSquare size={18} /> },
          { label: 'Settings', path: '/provider/settings', icon: <Settings size={18} /> },
        ]
      }
    ];

    return [...baseMenu, ...bottomMenu];
  };

  const menuConfig = getMenuConfig(role);

  return (
    <aside className="w-64 h-screen bg-[#F5F3F0] border-r border-gray-200 flex flex-col fixed left-0 top-0">
      <div className="h-16 px-5 flex items-center gap-3 border-b border-gray-200 shrink-0">
        <div className="w-8 h-8 bg-[#4A6741] rounded-lg flex items-center justify-center text-white font-bold text-sm">
          M
        </div>
        <span className="font-bold text-lg text-[#2D4128]">MANAS360</span>
        <span className="ml-auto text-[10px] font-medium bg-[#E8EFE6] text-[#4A6741] px-2 py-0.5 rounded-full">
          Provider
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
        {menuConfig.map((section, idx) => (
          <div key={idx}>
            <div className="px-3 mb-2">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                {section.category}
              </span>
            </div>
            <div className="space-y-1">
              {section.items.map((item, itemIdx) => (
                <NavLink
                  key={itemIdx}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-[#E8EFE6] text-[#2D4128] font-semibold'
                        : 'text-gray-600 hover:bg-[#EFEDE9]'
                    }`
                  }
                >
                  <span className="text-gray-500">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer — Profile Card */}
      <div className="border-t border-gray-200 p-4 shrink-0 mt-auto bg-[#F5F3F0]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#E8EFE6] flex items-center justify-center text-[#4A6741] font-bold text-sm">
            {user?.firstName ? user.firstName.charAt(0) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">Dr. {user?.firstName || 'Provider'}</p>
            <p className="text-[11px] text-gray-500 capitalize">{role.toLowerCase()}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </aside>
  );
};

export default ProviderSidebar;
