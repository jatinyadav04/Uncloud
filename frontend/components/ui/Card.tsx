import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'gradient' | 'outlined' | 'purple' | 'success' | 'accent';
  hoverable?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  hoverable = false,
  ...props
}) => {
  const baseStyles = 'rounded-xl shadow p-6';
  
  const variantStyles = {
    default: 'bg-white',
    gradient: 'bg-gradient-to-br from-purple-200 to-purple-800',
    outlined: 'bg-white border border-gray-200',
    purple: 'bg-purple-400 border-l-4 border-l-primary text-white shadow-sm',
    success: 'bg-green-50 border-l-4 border-l-green-500',
    accent: 'bg-gradient-to-br from-accent to-bg-light border border-primary/20'
  };
  
  const hoverStyles = hoverable 
    ? 'transition-all duration-300 hover:shadow-lg hover:transform hover:scale-[1.01] hover:border-primary/40' 
    : '';
  
  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;