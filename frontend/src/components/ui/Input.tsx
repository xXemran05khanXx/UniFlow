import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const reactId = React.useId();
  const inputId = id || `input-${reactId}`;

  const inputClasses = `
    w-full px-3 py-2.5 border rounded-xl shadow-sm transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary-500
    disabled:bg-secondary-50 disabled:cursor-not-allowed
    ${error
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 bg-red-50/20'
      : 'border-secondary-300 focus:border-primary-500 bg-white'
    }
    ${className}
  `;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-secondary-700 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-secondary-500">{helperText}</p>
      )}
    </div>
  );
};

export default Input;
