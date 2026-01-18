
import React, { forwardRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
    label,
    error,
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
                <textarea
                    ref={ref}
                    className={`
            w-full bg-gray-50/50 border-2 rounded-xl transition-all duration-200
            placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10
            ${error
                            ? 'border-rose-300 focus:border-rose-500'
                            : 'border-gray-200 hover:border-gray-300 focus:border-purple-500'
                        }
            px-4 py-3 text-gray-800 resize-y min-h-[120px]
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

Textarea.displayName = 'Textarea';
