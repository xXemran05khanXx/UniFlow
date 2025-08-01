import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md border border-secondary-200 ${className}`}>
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-secondary-200">
          {title && <h3 className="text-lg font-semibold text-secondary-900">{title}</h3>}
          {subtitle && <p className="text-sm text-secondary-600 mt-1">{subtitle}</p>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;
