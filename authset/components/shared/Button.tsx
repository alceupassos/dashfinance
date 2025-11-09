import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClasses =
    'w-full text-center py-3 px-4 rounded-2xl font-semibold transition-all duration-300 ease-in-out flex items-center justify-center gap-2 focus:outline-none active:scale-[0.98]';

  const variantClasses = {
    primary: 'btn-gradient shadow-lg shadow-[#FF7A00]/20',
    secondary: 'bg-white/10 border border-white/15 text-white hover:bg-white/15',
    ghost: 'text-[#FF7A00] bg-transparent border border-white/10 hover:border-white/25'
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
