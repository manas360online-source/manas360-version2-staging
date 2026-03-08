import { Link, useLocation } from 'react-router-dom';
import { corporateMobileShortcuts, isCorporateNavActive } from './corporateNav';

export default function CorporateBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink-100 bg-white md:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-5">
        {corporateMobileShortcuts.map((item) => {
          const active = isCorporateNavActive(location.pathname, item.to);
          return (
            <Link
              key={item.key}
              to={item.to}
              className={`flex flex-col items-center gap-1 px-2 py-2 text-[11px] ${active ? 'text-sage-700' : 'text-ink-500'}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
