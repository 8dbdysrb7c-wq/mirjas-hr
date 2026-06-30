import React from 'react';

export const Badge = ({ children, variant = 'default', className = '', style = {} }) => {
  let baseClass = 'px-3 py-1 text-xs font-bold rounded-full text-white shadow-sm ';
  
  if (variant === 'success') baseClass += 'bg-emerald-500 ';
  else if (variant === 'danger') baseClass += 'bg-rose-500 ';
  else if (variant === 'warning') baseClass += 'bg-amber-500 ';
  else if (variant === 'info') baseClass += 'bg-sky-500 ';
  else baseClass += 'bg-slate-500 ';

  return (
    <span className={`${baseClass} ${className}`} style={style}>
      {children}
    </span>
  );
};
