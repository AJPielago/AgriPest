import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Link, useLocation } from 'react-router-dom';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, isAdmin } = useAuth();
  const { lang, t } = useLanguage();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { label: t('dashboardOverview'), path: '/dashboard', icon: 'dashboard' },
    { label: t('pestDetection'), path: '/detect', icon: 'bug_report' },
    { label: t('detectionRecords'), path: '/history', icon: 'manage_search' },
    { label: t('farmMonitoring'), path: '/monitoring', icon: 'sensors' },
    { label: t('crops'), path: '/crops', icon: 'downloading' },
    { label: t('pestCatalog'), path: '/pests', icon: 'menu_book' },
    { label: t('reports'), path: '/reports', icon: 'assessment' },
    { label: t('notifications'), path: '/notifications', icon: 'notifications' },
    { label: t('settings'), path: '/settings', icon: 'settings' },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* Compact Stitch Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 bg-surface dark:bg-surface-container-low text-on-surface dark:text-inverse-on-surface border-r border-outline-variant dark:border-outline flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-60 pt-16 pb-4 px-3`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          
          {/* User Profile Header Layout */}
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-outline-variant bg-surface-variant flex items-center justify-center">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-primary">{user?.full_name?.charAt(0) || 'A'}</span>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-sm font-bold text-primary dark:text-primary-fixed truncate">
                {user?.full_name || (lang === 'tl' ? 'Magsasaka' : 'Alex Rivers')}
              </span>
              <span className="font-body-md text-xs text-on-surface-variant truncate">
                {user?.role?.name || (isAdmin ? t('admin') : t('farmManager'))}
              </span>
              <span className="font-label-sm text-[10px] text-outline truncate">{t('northSector')}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                      active
                        ? 'bg-secondary-container text-on-secondary-container dark:bg-secondary dark:text-on-secondary font-bold shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}

            {/* Admin Overview Link if Admin */}
            {isAdmin && (
              <li>
                <Link
                  to="/admin"
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                    isActive('/admin')
                      ? 'bg-secondary-container text-on-secondary-container dark:bg-secondary dark:text-on-secondary font-bold shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                  <span className="truncate">{t('systemAdmin')}</span>
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* Footer Logout Button */}
        <div className="pt-3 border-t border-outline-variant/60">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-full text-xs font-semibold text-error hover:bg-error-container/20 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
