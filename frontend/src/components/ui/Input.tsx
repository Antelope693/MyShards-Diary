
import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    icon,
    className = '',
    ...props
}, ref) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        {icon}
                    </div>
                )}
                <input
                    ref={ref}
                    className={`
            w-full bg-gray-50/50 border-2 rounded-xl transition-all duration-200
            placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10
            ${error
                            ? 'border-rose-300 focus:border-rose-500'
                            : 'border-gray-200 hover:border-gray-300 focus:border-purple-500'
                        }
            ${icon ? 'pl-11' : 'px-4'}
            py-3 text-gray-800
            ${className}
          `}
                    {...props}
                />
            </div>
            {error && (
                <p className="mt-1 ml-1 text-xs text-rose-500 font-medium">{error}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';
