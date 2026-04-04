import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'highlighted' | 'warning';
  padding?: string;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({ children, variant = 'default', padding = '1.25rem', className = '', onClick, style }: CardProps) {
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {},
    highlighted: { borderColor: 'rgba(108, 92, 231, 0.3)', boxShadow: '0 0 20px rgba(108, 92, 231, 0.1)' },
    warning: { borderColor: 'rgba(225, 112, 85, 0.3)', boxShadow: '0 0 20px rgba(225, 112, 85, 0.1)' },
  };

  return (
    <div
      className={`glass ${className}`}
      onClick={onClick}
      style={{
        padding,
        cursor: onClick ? 'pointer' : undefined,
        transition: 'all var(--transition-base)',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </div>
  );
}
