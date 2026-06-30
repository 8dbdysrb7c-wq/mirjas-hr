import React from 'react';

export const GlassCard = ({ children, className = '', style = {}, ...props }) => {
  return (
    <div className={`glass-card ${className}`} style={style} {...props}>
      {children}
    </div>
  );
};
