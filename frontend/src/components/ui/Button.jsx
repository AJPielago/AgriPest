import React from 'react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  icon: Icon
}) => {
  const base = "inline-flex items-center justify-center font-bold transition-all duration-100 rounded-md focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border active:scale-[0.99]";
  
  const variants = {
    primary: "bg-slate-900 hover:bg-slate-800 text-white border-slate-900 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 dark:border-white",
    secondary: "bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700",
    danger: "bg-red-700 hover:bg-red-800 text-white border-red-800 focus-visible:ring-red-600",
    outline: "bg-transparent text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700",
    ghost: "bg-transparent text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent active:scale-100"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5 min-h-[36px]",
    md: "px-4 py-2 text-xs sm:text-sm gap-2 min-h-[40px]",
    lg: "px-5 py-2.5 text-sm sm:text-base gap-2.5 font-bold min-h-[44px]"
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
      {children}
    </button>
  );
};



