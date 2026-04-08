import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  noPadding?: boolean;
  variant?: 'default' | 'flat' | 'elevated';
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  headerAction,
  noPadding = false,
  variant = 'default',
}) => {
  const variants: Record<string, string> = {
    default: 'bg-white rounded-xl border border-secondary-200 shadow-sm',
    flat: 'bg-white rounded-xl border border-secondary-200',
    elevated: 'bg-white rounded-xl shadow-md',
  };

  return (
    <div className={`${variants[variant]} ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="flex items-start justify-between px-6 py-4 border-b border-secondary-100">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-secondary-900 leading-snug">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-secondary-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && <div className="ml-4 shrink-0">{headerAction}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  );
};

export default Card;
