import React from 'react';

interface InputProps {
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  name?: string;
  id?: string;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  disabled = false,
  placeholder,
  value,
  onChange,
  type = 'text',
  name,
  id,
  required = false,
}) => {
  const inputId = id || name || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#1e1b4b',
            marginBottom: '2px',
          }}
        >
          {label}
          {required && (
            <span style={{ color: '#f97316', marginLeft: '4px' }}>*</span>
          )}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        style={{
          backgroundColor: '#ffffff',
          border: `1.5px solid ${error ? '#ef4444' : '#e0deff'}`,
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '14px',
          color: '#1e1b4b',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
          fontFamily: 'inherit',
        }}
        onFocus={(e) => {
          if (!disabled) {
            e.target.style.borderColor = error ? '#ef4444' : '#4f46e5';
            e.target.style.boxShadow = error
              ? '0 0 0 3px rgba(239, 68, 68, 0.15)'
              : '0 0 0 3px rgba(79, 70, 229, 0.15)';
          }
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? '#ef4444' : '#e0deff';
          e.target.style.boxShadow = 'none';
        }}
      />
      {error && (
        <span
          style={{
            fontSize: '12px',
            color: '#ef4444',
            marginTop: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
};