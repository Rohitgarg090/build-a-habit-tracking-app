import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  onClick,
}) => {
  const paddingStyles = {
    none: '0',
    sm: '12px',
    md: '20px',
    lg: '32px',
  };

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e0deff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(79, 70, 229, 0.08), 0 1px 2px rgba(79, 70, 229, 0.04)',
    padding: paddingStyles[padding],
    cursor: onClick ? 'pointer' : 'default',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      e.currentTarget.style.boxShadow =
        '0 4px 12px rgba(79, 70, 229, 0.15), 0 2px 4px rgba(79, 70, 229, 0.08)';
      e.currentTarget.style.transform = 'translateY(-1px)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      e.currentTarget.style.boxShadow =
        '0 1px 3px rgba(79, 70, 229, 0.08), 0 1px 2px rgba(79, 70, 229, 0.04)';
      e.currentTarget.style.transform = 'translateY(0)';
    }
  };

  return (
    <div
      style={cardStyle}
      className={className}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
};