
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: 'default' | 'glass' | 'ghost';
    noPadding?: boolean;
}

export function Card({
    children,
    variant = 'default',
    className = '',
    noPadding = false,
    ...props
}: CardProps) {
    const baseStyles = "rounded-2xl sm:rounded-3xl transition-all duration-300";

    const variants = {
        default: "bg-white/95 backdrop-blur-md shadow-xl border border-white/20",
        glass: "bg-white/80 backdrop-blur-md shadow-lg border border-white/30",
        ghost: "bg-white/50 backdrop-blur-sm border border-transparent hover:bg-white/80"
    };

    const padding = noPadding ? "" : "p-6 sm:p-8 lg:p-10";

    return (
        <div
            className={`${baseStyles} ${variants[variant]} ${padding} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
