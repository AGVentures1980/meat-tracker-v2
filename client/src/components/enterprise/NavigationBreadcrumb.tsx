import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbLevel {
  label: string;
  href: string;
}

export const NavigationBreadcrumb = ({ levels }: { levels?: BreadcrumbLevel[] }) => {
    if (!levels || levels.length === 0) return null;

    return (
        <nav className="flex items-center text-xs font-mono text-gray-500 mb-6 bg-[#111] py-3 px-4 rounded-lg border border-[#333] tracking-widest uppercase shadow-md">
            {levels.map((level, i) => (
                <React.Fragment key={i}>
                    {i < levels.length - 1 ? (
                        <Link to={level.href} className="hover:text-[#C5A059] transition-colors font-bold text-gray-400">
                            {level.label}
                        </Link>
                    ) : (
                        <span className="text-[#C5A059] font-bold">{level.label}</span>
                    )}
                    {i < levels.length - 1 && <ChevronRight className="w-4 h-4 mx-2 opacity-50 text-gray-600" />}
                </React.Fragment>
            ))}
        </nav>
    );
};
