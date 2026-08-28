import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Bug, 
  LayoutDashboard, 
  ScanSearch, 
  History, 
  BookOpen, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X,
  Cpu
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Detect Pest', path: '/detect', icon: ScanSearch },
    { label: 'History', path: '/history', icon: History },
    { label: 'Pest Library', path: '/pests', icon: BookOpen },
  ];

  if (isAdmin) {
    navItems.push({ label: 'Admin Portal', path: '/admin', icon: ShieldAlert });
  }

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-40 glass-panel border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-950/40 group-hover:scale-105 transition-transform">
              <Bug className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-heading text-lg font-extrabold bg-gradient-to-r from-emerald-400 to-green-200 bg-clip-text text-transparent">
                AgriPest AI
              </span>
              <span className="block text-[10px] text-slate-400 font-mono tracking-wide uppercase">
                Pest Detection System
              </span>
            </div>
          </Link>

          {/* Development Mode Badge & Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-amber-400">
              <Cpu className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              <span>MODE: MOCK ENGINE</span>
            </div>

            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                      active
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Profile & Logout */}
          <div className="hidden md:flex items-center gap-4 border-l border-slate-800 pl-6">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-200">{user?.full_name}</p>
              <Badge variant={isAdmin ? 'danger' : 'success'} className="mt-0.5 text-[10px] py-0 px-2">
                {user?.role?.name || 'Farmer'}
              </Badge>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl border border-transparent hover:border-red-900/40 transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-3">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-amber-400">
              <Cpu className="w-3 h-3 text-amber-400" />
              <span>MOCK</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:bg-slate-800 rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-b border-slate-800 px-4 pt-2 pb-4 space-y-2">
          <div className="p-3 bg-slate-900/60 rounded-xl mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-100">{user?.full_name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <Badge variant={isAdmin ? 'danger' : 'success'} className="text-[10px]">
              {user?.role?.name || 'Farmer'}
            </Badge>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                  active
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-950/40 rounded-xl font-medium"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};
