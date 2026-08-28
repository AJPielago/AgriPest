import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Alert } from '../components/ui/Alert';

export const Register = () => {
  const { t, lang } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(lang === 'tl' ? 'Hindi nagtutugma ang mga password.' : 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({ full_name: fullName, email, password });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || (lang === 'tl' ? 'Nabigo ang pagpaparehistro. Maaaring mayroon nang gumagamit ng email na ito.' : 'Registration failed. Email may already exist.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-8">
          <h1 className="font-headline-lg-mobile md:font-display-lg text-headline-lg-mobile md:text-display-lg text-primary dark:text-primary-fixed mb-2 leading-tight font-bold">
            {t('register')}
          </h1>
          <p className="font-body-lg text-sm md:text-base text-on-surface-variant max-w-sm">
            {lang === 'tl'
              ? 'Magrehistro upang makapagsimula sa pagmamanman ng pananim at peste.'
              : 'Join the intelligent farm & pest monitoring platform.'}
          </p>
        </div>

        {/* Register Form Card */}
        <div className="bg-surface-container-lowest dark:bg-surface-container-low rounded-xl border border-outline-variant dark:border-outline shadow-sm p-6 sm:p-8">
          
          {error && (
            <div className="mb-4">
              <Alert type="danger">
                {error}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Full Name */}
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-xs font-semibold text-on-surface-variant" htmlFor="fullName">
                {t('fullNameLabel')}
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Dela Cruz"
                className="block w-full px-3.5 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant dark:border-outline rounded-lg text-on-surface dark:text-inverse-on-surface font-body-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
              />
            </div>

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
                placeholder="farmer@domain.com"
                className="block w-full px-3.5 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant dark:border-outline rounded-lg text-on-surface dark:text-inverse-on-surface font-body-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-xs font-semibold text-on-surface-variant" htmlFor="password">
                {t('passwordLabel')}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3.5 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant dark:border-outline rounded-lg text-on-surface dark:text-inverse-on-surface font-body-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
              />
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-xs font-semibold text-on-surface-variant" htmlFor="confirmPassword">
                {t('confirmPasswordLabel')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3.5 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant dark:border-outline rounded-lg text-on-surface dark:text-inverse-on-surface font-body-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 px-4 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-label-md text-sm font-bold transition-all shadow-sm active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? (lang === 'tl' ? 'Nagpaparehistro...' : 'Registering...') : t('register')}</span>
            </button>

          </form>

          <p className="text-center text-xs text-on-surface-variant pt-4">
            {t('alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-primary dark:text-primary-fixed hover:underline font-bold transition-colors">
              {t('signInHere')}
            </Link>
          </p>

        </div>

      </div>
    </div>
  );
};
