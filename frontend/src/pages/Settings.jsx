import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';

export const Settings = () => {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [offlineSync, setOfflineSync] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-2xl sm:text-3xl font-bold text-primary dark:text-primary-fixed">
            {t('settings')}
          </h1>
          <p className="font-body-lg text-sm sm:text-base text-on-surface-variant mt-1">
            {t('settingsSubtitle')}
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-all shadow-sm active:scale-[0.99] cursor-pointer"
        >
          <span>{t('saveChanges')}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-lg bg-secondary-container/40 border border-secondary/30 text-secondary dark:text-secondary-fixed text-xs font-bold">
          <span>{lang === 'tl' ? 'Matagumpay na na-update ang mga kagustuhan.' : 'Preferences updated successfully.'}</span>
        </div>
      )}

      {/* Settings Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Account Settings Card */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-outline-variant/60 pb-3">
            <h2 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
              {t('accountProfile')}
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-outline uppercase text-[10px] font-bold block">{t('fullName')}</span>
              <p className="font-bold text-on-surface dark:text-inverse-on-surface text-sm mt-0.5">{user?.full_name || (lang === 'tl' ? 'Magsasaka' : 'Alex Rivers')}</p>
              <p className="text-on-surface-variant">{user?.email || 'manager@agrimonitor.local'}</p>
            </div>

            <div>
              <span className="text-outline uppercase text-[10px] font-bold block">{t('roleDesignation')}</span>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-bold text-[11px]">
                {user?.role ? user.role.toUpperCase() : (lang === 'tl' ? 'TAGAPAMAHALA NG BUKID' : 'FARM MANAGER')}
              </span>
            </div>

            <div className="pt-2 border-t border-outline-variant/60">
              <button
                onClick={logout}
                className="text-error hover:underline font-bold cursor-pointer"
              >
                <span>{lang === 'tl' ? 'Lumabas sa Aparato' : 'Sign Out from Device'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Farm & Workspace Card */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-outline-variant/60 pb-3">
            <h2 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
              {lang === 'tl' ? 'Mga Sona at Pananim sa Bukid' : 'Farm & Sector Setup'}
            </h2>
          </div>

          <ul className="space-y-1 text-xs">
            <li>
              <Link
                to="/crops"
                className="w-full flex items-center justify-between p-2.5 hover:bg-surface-container rounded-lg transition-colors group"
              >
                <span className="font-semibold text-on-surface dark:text-inverse-on-surface">
                  {lang === 'tl' ? 'Mga Nakarehistrong Pananim' : 'Registered Crop Types'}
                </span>
                <span className="text-outline font-bold">→</span>
              </Link>
            </li>
            <li>
              <Link
                to="/monitoring"
                className="w-full flex items-center justify-between p-2.5 hover:bg-surface-container rounded-lg transition-colors group"
              >
                <span className="font-semibold text-on-surface dark:text-inverse-on-surface">
                  {lang === 'tl' ? 'Pamahalaan ang mga Sona (A, B, C)' : 'Manage Field Zones (A, B, C)'}
                </span>
                <span className="text-outline font-bold">→</span>
              </Link>
            </li>
            <li>
              <Link
                to="/pests"
                className="w-full flex items-center justify-between p-2.5 hover:bg-surface-container rounded-lg transition-colors group"
              >
                <span className="font-semibold text-on-surface dark:text-inverse-on-surface">
                  {t('pestCatalog')}
                </span>
                <span className="text-outline font-bold">→</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* App Preferences Card */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-outline-variant/60 pb-3">
            <h2 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
              {lang === 'tl' ? 'Wika at Display' : 'Interface & Localization'}
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface dark:bg-surface-container">
              <div>
                <span className="font-bold text-on-surface dark:text-inverse-on-surface block">
                  {lang === 'tl' ? 'Wika (Language)' : 'Language / Wika'}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {lang === 'tl' ? 'Palitan ang wika ng interface' : 'Switch UI locale'}
                </span>
              </div>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant rounded-lg px-2.5 py-1 text-xs font-bold text-on-surface outline-none"
              >
                <option value="en">English</option>
                <option value="tl">Tagalog (Filipino)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-surface dark:bg-surface-container">
              <div>
                <span className="font-bold text-on-surface dark:text-inverse-on-surface block">
                  {lang === 'tl' ? 'Tema ng Itsura (Theme)' : 'Visual Theme'}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {lang === 'tl' ? `Kasalukuyan: ${theme === 'dark' ? 'Madilim' : 'Maliwanag'}` : `Current: ${theme === 'dark' ? 'Dark Mode' : 'Light Mode'}`}
                </span>
              </div>
              <button
                onClick={toggleTheme}
                className="px-3 py-1 bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant rounded-lg text-xs font-bold text-on-surface cursor-pointer"
              >
                <span>{lang === 'tl' ? 'Ilipat' : 'Toggle'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-surface dark:bg-surface-container">
              <div>
                <span className="font-bold text-on-surface dark:text-inverse-on-surface block">
                  {lang === 'tl' ? 'Offline Background Sync' : 'Offline Background Sync'}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {lang === 'tl' ? 'I-queue ang pagsusuri kapag offline' : 'Queue field scans when offline'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={offlineSync}
                onChange={(e) => setOfflineSync(e.target.checked)}
                className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Support & Diagnostics Card */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-outline-variant/60 pb-3">
            <h2 className="font-title-lg text-sm sm:text-base font-bold text-on-surface dark:text-inverse-on-surface">
              {lang === 'tl' ? 'Modelo ng AI at Suporta' : 'Engine & Support'}
            </h2>
          </div>

          <div className="space-y-2.5 text-xs text-on-surface-variant">
            <div className="flex justify-between items-center py-1">
              <span>{lang === 'tl' ? 'YOLO Pest Classifier' : 'YOLO Pest Classifier'}</span>
              <span className="font-bold text-secondary dark:text-secondary-fixed">v8.2-AgriReady</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span>{lang === 'tl' ? 'Offline Database' : 'Offline Database'}</span>
              <span className="font-bold text-on-surface dark:text-inverse-on-surface">IndexedDB Active</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span>{lang === 'tl' ? 'Speech Narration Engine' : 'Speech Narration Engine'}</span>
              <span className="font-bold text-primary dark:text-primary-fixed">Web Speech API</span>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <a
                href="https://drive.google.com/drive/folders/1yNTXrAt92d6L1nB0SQVe8zG-OukoPrbH"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-fixed text-center font-bold flex items-center justify-center gap-2 border border-primary/30 transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">install_mobile</span>
                <span>{lang === 'tl' ? 'I-install ang Mobile App (Google Drive APK)' : 'Install Mobile App (Google Drive APK)'}</span>
              </a>
              <Link
                to="/history"
                className="w-full py-2 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface text-center font-bold block border border-outline-variant transition-colors"
              >
                {t('detectionRecords')}
              </Link>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
