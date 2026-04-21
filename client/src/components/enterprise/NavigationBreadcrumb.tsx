import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const NavigationBreadcrumb = () => {
    const location = useLocation();
    const { user } = useAuth();
    
    // We parse the URL to determine the breadcrumb path
    const pathParts = location.pathname.split('/').filter(p => p);
    
    if (pathParts.length < 2) return null; // Not in a drill-down path

    const isPropertyLevel = pathParts.includes('property');
    const isOutletLevel = pathParts.includes('outlet') || pathParts.includes('ops');
    
    const slugPosition = pathParts.length - 1;
    const currentSlug = pathParts[slugPosition];

    const formatSlug = (slug: string) => slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    return (
        <nav className="flex items-center text-sm font-mono text-gray-500 mb-4 bg-[#1a1a1a] p-2 rounded-md border border-[#333]">
            {user?.role === 'corporate_director' || user?.role === 'regional_director' || user?.role === 'admin' ? (
                <>
                    <Link to="/enterprise-dashboard" className="hover:text-[#C5A059] flex items-center gap-1 transition-colors">
                        <Home className="w-4 h-4" />
                        Network
                    </Link>
                    <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
                </>
            ) : null}

            {isPropertyLevel && (
                <span className="text-[#C5A059] font-bold tracking-wide">
                    {formatSlug(currentSlug)} Property
                </span>
            )}

            {isOutletLevel && (
                <>
                    {/* For outlet level, if they are corporate/regional, they might have clicked through a property. 
                        For now, we just show Outlet as the terminal node. */}
                    <span className="text-gray-400">
                        Property
                    </span>
                    <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
                    <span className="text-[#C5A059] font-bold tracking-wide">
                        {formatSlug(currentSlug)}
                    </span>
                </>
            )}
        </nav>
    );
};
