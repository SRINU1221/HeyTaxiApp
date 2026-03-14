import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';

const navItems = {
  RIDER: [
    { to: '/rider', label: 'Dashboard', icon: '🏠', end: true },
    { to: '/rider/book', label: 'Book Ride', icon: '🚖' },
    { to: '/rider/history', label: 'My Rides', icon: '📋' },
    { to: '/rider/payments', label: 'Payments', icon: '💳' },
    { to: '/rider/profile', label: 'Profile', icon: '👤' },
  ],
  DRIVER: [
    { to: '/driver', label: 'Dashboard', icon: '🏠', end: true },
    { to: '/driver/history', label: 'My Rides', icon: '📋' },
    { to: '/driver/payments', label: 'Earnings', icon: '💰' },
    { to: '/driver/profile', label: 'Profile', icon: '👤' },
  ],
  ADMIN: [
    { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  ],
};

const roleMeta = {
  RIDER: { label: 'Rider', color: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400' },
  DRIVER: { label: 'Driver', color: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400' },
  ADMIN: { label: 'Admin', color: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400' },
};

export default function AppLayout({ role }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Pull name/email from Redux user or localStorage fallback
  const name = user?.name || localStorage.getItem('name') || 'User';
  const email = user?.email || localStorage.getItem('email') || '';
  const meta = roleMeta[role] || roleMeta.RIDER;

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/auth');
  };

  const items = navItems[role] || [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#111] border-r border-white/10 flex flex-col transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>

        {/* Logo + Role Badge */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-xl">🚖</div>
            <div>
              <span className="text-white font-bold text-lg">HeyTaxi</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>
                  {meta.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {items.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'}`
              }>
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-2">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{name}</p>
              <p className="text-gray-500 text-xs truncate">{email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#111]">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-white font-semibold">HeyTaxi</span>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${meta.badge}`}>
            {meta.label}
          </span>
        </div>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
