import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatCardProps {
    title: string;
    value: string | number;
    highlight?: boolean;
    subtext?: string;
    icon?: LucideIcon;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, highlight, subtext, icon: Icon }) => {
    return (
        <div className={cn(
            "p-6 rounded-xl border transition-all duration-300",
            highlight ? "bg-brand-red border-brand-red shadow-lg shadow-brand-red/20" : "bg-brand-surface border-white/5 hover:border-brand-gold/30"
        )}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className={cn("text-sm font-medium", highlight ? "text-white/80" : "text-gray-400")}>{title}</p>
                    <h3 className="text-3xl font-bold mt-1 text-white">{value}</h3>
                </div>
                {Icon && <Icon className={cn("w-6 h-6", highlight ? "text-white" : "text-brand-gold")} />}
            </div>
            {subtext && <p className={cn("text-xs", highlight ? "text-white/60" : "text-gray-500")}>{subtext}</p>}
        </div>
    );
};
