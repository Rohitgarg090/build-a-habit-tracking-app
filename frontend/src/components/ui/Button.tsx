import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  children,
  className = '',
  type = 'button',
}) => {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'inherit',
    fontWeight: 600,
    borderRadius: '8px',
    border: '1px solid transparent',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    pointerEvents: disabled || loading ? 'none' : 'auto',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s ease',
    outline: 'none',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: '6px 12px',
      fontSize: '13px',
      height: '32px',
    },
    md: {
      padding: '8px 16px',
      fontSize: '14px',
      height: '40px',
    },
    lg: {
      padding: '12px 24px',
      fontSize: '16px',
      height: '48px',
    },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '#4f46e5',
      color: '#ffffff',
      borderColor: '#4f46e5',
    },
    secondary: {
      backgroundColor: '#ffffff',
      color: '#1e1b4b',
      borderColor: '#e0deff',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#4f46e5',
      borderColor: 'transparent',
    },
    danger: {
      backgroundColor: '#ef4444',
      color: '#ffffff',
      borderColor: '#ef4444',
    },
  };

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
  };

  const spinnerStyles: React.CSSProperties = {
    width: size === 'sm' ? '12px' : size === 'lg' ? '18px' : '14px',
    height: size === 'sm' ? '12px' : size === 'lg' ? '18px' : '14px',
    border: '2px solid currentColor',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'button-spin 0.7s linear infinite',
    flexShrink: 0,
  };

  return (
    <>
      <style>{`
        @keyframes button-spin {
          to { transform: rotate(360deg); }
        }
        .btn-primary:hover:not(:disabled) {
          background-color: #4338ca !important;
          border-color: #4338ca !important;
        }
        .btn-secondary:hover:not(:disabled) {
          background-color: #f8f7ff !important;
          border-color: #4f46e5 !important;
        }
        .btn-ghost:hover:not(:disabled) {
          background-color: #f8f7ff !important;
          border-color: #e0deff !important;
        }
        .btn-danger:hover:not(:disabled) {
          background-color: #dc2626 !important;
          border-color: #dc2626 !important;
        }
      `}</style>
      <button
        type={type}
        style={combinedStyles}
        className={`btn-${variant} ${className}`}
        onClick={onClick}
        disabled={disabled || loading}
      >
        {loading && (
          <span style={spinnerStyles} aria-hidden="true" />
        )}
        {loading ? (
          <span>{children ? 'Loading...' : 'Loading...'}</span>
        ) : (
          <span>{children}</span>
        )}
      </button>
    </>
  );
};