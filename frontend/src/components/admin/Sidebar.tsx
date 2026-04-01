import { NavLink } from 'react-router-dom';

type MenuItem = {
  label: string;
  path: string;
};

export default function Sidebar({ menuItems }: { menuItems: MenuItem[] }) {
  return (
    <aside className="w-64 min-h-screen bg-[#1A1A1A] text-white p-4">
      <div className="mb-4 text-lg font-bold">MANAS360</div>
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              [
                'block rounded-lg px-3 py-2 text-sm transition',
                isActive ? 'bg-sage-600 text-white font-semibold' : 'text-white/75 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
