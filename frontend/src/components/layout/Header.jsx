import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const GDRIVE_APK_URL = "https://drive.google.com/drive/folders/1yNTXrAt92d6L1nB0SQVe8zG-OukoPrbH";

export const Header = ({ onOpenSidebar }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLanguage, t } = useLanguage();
  const location = useLocation();

  const handleInstallClick = (e) => {
    // Direct redirect to the official Google Drive APK distribution folder
    window.open(GDRIVE_APK_URL, '_blank', 'noopener,noreferrer');
  };

  const getBreadcrumbTitle = (path) => {
    if (path.startsWith('/crops/')) return { category: lang === 'tl' ? 'Pananim' : 'Crops', title: lang === 'tl' ? 'Detalye ng Pananim' : 'Crop Details' };
    switch (path) {
      case '/dashboard': return { category: t('system') || 'System', title: t('dashboardOverview') || 'Dashboard' };
      case '/detect': return { category: t('inspection') || 'Diagnostics', title: t('pestDetection') || 'Pest Detection' };
      case '/history': return { category: t('inspection') || 'Diagnostics', title: lang === 'tl' ? 'Kasaysayan' : 'Detection History' };
      case '/monitoring': return { category: lang === 'tl' ? 'Operasyon' : 'Operations', title: lang === 'tl' ? 'Pagmamanman sa Bukid' : 'Farm Monitoring' };
      case '/crops': return { category: lang === 'tl' ? 'Operasyon' : 'Operations', title: lang === 'tl' ? 'Pamamahala ng Pananim' : 'Crops' };
      case '/reports': return { category: lang === 'tl' ? 'Analytics' : 'Analytics', title: lang === 'tl' ? 'Mga Ulat' : 'Reports' };
      case '/notifications': return { category: lang === 'tl' ? 'Alerto' : 'Alerts', title: lang === 'tl' ? 'Mga Abiso' : 'Notifications' };
      case '/pests': return { category: t('reference') || 'Reference', title: t('pestCatalog') || 'Pest Catalog' };
      case '/settings': return { category: t('system') || 'System', title: lang === 'tl' ? 'Mga Setting' : 'Settings' };
      case '/admin': return { category: t('systemAdmin') || 'Admin', title: t('dashboardOverview') || 'Admin Overview' };
      case '/admin/users': return { category: t('systemAdmin') || 'Admin', title: t('userDirectory') || 'User Directory' };
      case '/admin/crops': return { category: t('systemAdmin') || 'Admin', title: t('cropManagement') || 'Crop Management' };
      case '/admin/pests': return { category: t('systemAdmin') || 'Admin', title: t('pestRulesEditor') || 'Pest Rules' };
      case '/admin/audit': return { category: t('systemAdmin') || 'Admin', title: t('systemAuditLogs') || 'Audit Trail' };
      default: return { category: 'AgriMonitor', title: 'Management System' };
    }
  };

  const breadcrumb = getBreadcrumbTitle(location.pathname);

  return (
    <header className="h-14 bg-surface dark:bg-surface-container border-b border-outline-variant dark:border-outline sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between transition-colors shadow-xs">
      
      {/* Brand & Menu Triggers */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Drawer Trigger (Mobile Only) */}
        <button
          onClick={onOpenSidebar}
          aria-label="Open navigation sidebar"
          className="p-2 text-primary dark:text-primary-fixed hover:bg-surface-container-low dark:hover:bg-surface-container-high rounded-full md:hidden transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        {/* Brand Title & Breadcrumb */}
        <div className="flex items-center gap-2">
          <span className="text-title-lg font-title-lg font-bold text-primary dark:text-primary-fixed tracking-tight">
            AgriMonitor
          </span>
          <span className="text-outline text-xs hidden sm:inline">•</span>
          <span className="text-xs font-semibold text-on-surface-variant hidden sm:inline truncate">
            {breadcrumb.title}
          </span>
        </div>
      </div>

      {/* Action Controls & User Status */}
      <div className="flex items-center gap-2">
        
        {/* Install / Download Mobile App Button (Redirects to Google Drive) */}
        <a
          href={GDRIVE_APK_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Install App"
          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-outline-variant bg-surface-container-lowest dark:bg-surface-container-high hover:bg-surface-container-low text-primary dark:text-primary-fixed transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          title={lang === 'tl' ? 'I-install ang App mula sa Google Drive' : 'Install App from Google Drive'}
        >
          <span className="material-symbols-outlined text-[16px]">install_mobile</span>
          <span className="hidden md:inline">{lang === 'tl' ? 'I-install App' : 'Install App'}</span>
        </a>

        {/* Language Toggle (English / Tagalog) */}
        <button
          onClick={toggleLanguage}
          aria-label="Toggle language"
          className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-full transition-colors flex items-center justify-center cursor-pointer"
          title={lang === 'tl' ? 'Switch to English' : 'Lumipat sa Tagalog'}
        >
          <span className="material-symbols-outlined text-[20px]">translate</span>
        </button>

        {/* Dark / Light Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme mode"
          className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-full transition-colors flex items-center justify-center cursor-pointer"
          title={theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* Notifications Icon with Badge */}
        <Link
          to="/notifications"
          aria-label="View notifications"
          className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-full transition-colors relative flex items-center justify-center cursor-pointer"
          title="Notifications"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full ring-2 ring-surface"></span>
        </Link>

        {/* User Mini Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container font-bold text-xs flex items-center justify-center overflow-hidden border border-outline-variant ml-1">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span>{user?.full_name?.charAt(0) || 'A'}</span>
          )}
        </div>

      </div>

    </header>
  );
};
