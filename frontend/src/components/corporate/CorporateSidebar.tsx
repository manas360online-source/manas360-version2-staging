import { Link, useLocation } from 'react-router-dom';
import { corporateNavSections, isCorporateNavActive } from './corporateNav';

type CorporateSidebarProps = {
  variant: 'drawer' | 'full' | 'collapsed';
  isOpen?: boolean;
  onClose?: () => void;
};

export default function CorporateSidebar({ variant, isOpen = false, onClose }: CorporateSidebarProps) {
  const location = useLocation();
  const navItems = corporateNavSections.flatMap((section) => section.items);

  if (variant === 'collapsed') {
    return (
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-16 border-r border-ink-100 bg-surface-sidebar md:flex lg:hidden">
        <div className="flex h-full w-full flex-col items-center py-3">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-sage-500 text-sm font-bold text-white">M</div>
          <nav className="flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto px-1 py-2">
            {navItems.map((item) => {
              const active = isCorporateNavActive(location.pathname, item.to);
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  title={item.label}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                    active ? 'bg-sage-100 text-sage-700' : 'text-ink-500 hover:bg-surface-hover'
                  }`}
                >
                  {item.icon}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    );
  }

  if (variant === 'full') {
    return (
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-ink-100 bg-surface-sidebar lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-ink-100 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-500 text-sm font-bold text-white">M</div>
          <div>
            <p className="font-display text-sm font-bold text-sage-800">MANAS360 Enterprise</p>
            <p className="text-[10px] text-ink-500">Corporate Member</p>
          </div>
        </div>

        <nav className="h-[calc(100%-4rem)] overflow-y-auto px-3 py-4">
          {corporateNavSections.map((section) => (
            <div key={section.title} className="mb-5">
              <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.12em] text-ink-400">{section.title}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isCorporateNavActive(location.pathname, item.to);
                  return (
                    <Link
                      key={item.key}
                      to={item.to}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition ${
                        active ? 'bg-sage-100 font-semibold text-sage-700' : 'text-ink-600 hover:bg-surface-hover'
                      }`}
                    >
                      <span className={active ? 'text-sage-600' : 'text-ink-500'}>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity md:hidden ${isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose || (() => {})}
      />
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-72 border-r border-ink-100 bg-surface-sidebar transition-transform duration-300 md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-ink-100 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-500 text-sm font-bold text-white">M</div>
          <div>
            <p className="font-display text-sm font-bold text-sage-800">MANAS360 Enterprise</p>
            <p className="text-[10px] text-ink-500">Corporate Member</p>
          </div>
        </div>

        <nav className="h-[calc(100%-4rem)] overflow-y-auto px-3 py-4">
          {corporateNavSections.map((section) => (
            <div key={section.title} className="mb-5">
              <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.12em] text-ink-400">{section.title}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isCorporateNavActive(location.pathname, item.to);
                  return (
                    <Link
                      key={item.key}
                      to={item.to}
                      onClick={onClose || (() => {})}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition ${
                        active ? 'bg-sage-100 font-semibold text-sage-700' : 'text-ink-600 hover:bg-surface-hover'
                      }`}
                    >
                      <span className={active ? 'text-sage-600' : 'text-ink-500'}>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
