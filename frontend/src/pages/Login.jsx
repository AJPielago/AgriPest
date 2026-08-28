import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Alert } from '../components/ui/Alert';

export const Login = () => {
  const { t, lang } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || (lang === 'tl' ? 'Nabigo ang pag-login. Maling email o password.' : 'Authentication failed. Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-8">
          <h1 className="font-headline-lg-mobile md:font-display-lg text-headline-lg-mobile md:text-display-lg text-primary dark:text-primary-fixed mb-2 leading-tight font-bold">
            {t('appTitle')}
          </h1>
          <p className="font-body-lg text-sm md:text-base text-on-surface-variant max-w-sm">
            {t('appSubtitle')}
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-xl border border-outline-variant dark:border-outline shadow-sm p-6 sm:p-8">
          
          {error && (
            <div className="mb-4">
              <Alert type="danger">
                {error}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Email Field */}
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-xs font-semibold text-on-surface-variant" htmlFor="email">
                {t('emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@pestdetect.com"
                className="block w-full px-3.5 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant dark:border-outline rounded-lg text-on-surface dark:text-inverse-on-surface font-body-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="font-label-md text-xs font-semibold text-on-surface-variant" htmlFor="password">
                  {t('passwordLabel')}
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-3.5 pr-10 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant dark:border-outline rounded-lg text-on-surface dark:text-inverse-on-surface font-body-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-primary transition-colors focus:outline-none cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 px-4 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-label-md text-sm font-bold transition-all shadow-sm active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? (lang === 'tl' ? 'Pumapasok...' : 'Signing in...') : t('login')}</span>
            </button>

          </form>

          {/* Quick-Fill Demo Workstation Panel */}
          <div className="mt-6 pt-4 border-t border-outline-variant dark:border-outline space-y-2">
            <p className="text-[11px] font-bold text-outline uppercase tracking-wider text-center">
              {lang === 'tl' ? 'Mabilisang Pag-access sa Demo:' : 'Quick Demo Access Credentials:'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('farmer@pestdetect.com', 'farmer123')}
                className="p-2.5 rounded-lg bg-surface-container-low dark:bg-surface-container hover:bg-surface-variant text-primary dark:text-primary-fixed border border-outline-variant dark:border-outline text-xs font-bold transition-colors shadow-xs cursor-pointer text-center"
              >
                <span>{lang === 'tl' ? 'Magsasaka Demo' : 'Farmer Demo'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('admin@pestdetect.com', 'admin123')}
                className="p-2.5 rounded-lg bg-surface-container-low dark:bg-surface-container hover:bg-surface-variant text-primary dark:text-primary-fixed border border-outline-variant dark:border-outline text-xs font-bold transition-colors shadow-xs cursor-pointer text-center"
              >
                <span>{lang === 'tl' ? 'Admin Demo' : 'Admin Demo'}</span>
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-on-surface-variant pt-4">
            {t('dontHaveAccount')}{' '}
            <Link to="/register" className="text-primary dark:text-primary-fixed hover:underline font-bold transition-colors">
              {t('registerHere')}
            </Link>
          </p>

        </div>

      </div>
    </div>
  );
};
