import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const DownloadReportDropdown = ({
  onDownloadPdf,
  onDownloadCsv,
  label,
  variant = 'primary', // 'primary' | 'secondary' | 'compact'
  align = 'right', // 'right' | 'left'
  className = ''
}) => {
  const { lang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handlePdfClick = () => {
    setIsOpen(false);
    if (onDownloadPdf) onDownloadPdf();
  };

  const handleCsvClick = () => {
    setIsOpen(false);
    if (onDownloadCsv) onDownloadCsv();
  };

  const getButtonStyles = () => {
    if (variant === 'compact') {
      return "px-3 py-1.5 border border-outline-variant hover:bg-surface-container-low text-on-surface dark:text-inverse-on-surface rounded-lg font-label-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer";
    }
    if (variant === 'secondary') {
      return "flex items-center gap-1.5 px-4 py-2 bg-surface-container-lowest dark:bg-surface-container-high border border-outline-variant hover:bg-surface-container-low text-on-surface dark:text-inverse-on-surface rounded-full font-label-md text-xs font-semibold transition-colors shadow-xs cursor-pointer";
    }
    // Default primary variant
    return "flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-full font-label-md text-xs font-bold transition-all shadow-sm active:scale-[0.99] cursor-pointer";
  };

  return (
    <div className={`relative inline-block text-left print:hidden ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={getButtonStyles()}
      >
        <span className="material-symbols-outlined text-[16px]">download</span>
        <span>{label || t('downloadReport')}</span>
        <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-1.5 w-48 sm:w-56 rounded-xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant dark:border-outline shadow-lg ring-1 ring-black/5 z-50 py-1.5 focus:outline-none transition-all duration-150 transform origin-top`}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Download as PDF Option */}
          <button
            type="button"
            onClick={handlePdfClick}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-on-surface dark:text-inverse-on-surface hover:bg-surface-variant/60 dark:hover:bg-surface-container transition-colors text-left font-medium cursor-pointer"
            role="menuitem"
          >
            <span className="material-symbols-outlined text-error text-[18px]">
              picture_as_pdf
            </span>
            <span className="flex-1">{t('downloadAsPdf')}</span>
          </button>

          {/* Download as CSV Option */}
          <button
            type="button"
            onClick={handleCsvClick}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-on-surface dark:text-inverse-on-surface hover:bg-surface-variant/60 dark:hover:bg-surface-container transition-colors text-left font-medium cursor-pointer border-t border-outline-variant/40 dark:border-outline-variant/20"
            role="menuitem"
          >
            <span className="material-symbols-outlined text-secondary text-[18px]">
              grid_on
            </span>
            <span className="flex-1">{t('downloadAsCsv')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
