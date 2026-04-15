import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

interface PilotModeInterceptorProps {
    children: React.ReactNode;
}

export const PilotModeInterceptor: React.FC<PilotModeInterceptorProps> = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();
    
    // Feature Flag hardcoded or pulled from ENV. Currently HARDLOCKED to True for target stores.
    // In production, this would be `import.meta.env.VITE_ENABLE_EXEC_PILOT === 'true'`
    const [isPilotActive] = useState(true);

    // List of Stores actively participating in the "Actionable Dashboard Pilot"
    const targetStores = [510]; 

    useEffect(() => {
        if (isPilotActive && user && targetStores.includes(user.storeId || 0)) {
            console.log("PILOT MODE INTERCEPTOR: GM hijacked to Executive Action Console.");
        }
    }, [isPilotActive, user]);

    if (!user) return <>{children}</>;

    const isPilotTargetStore = targetStores.includes(user.storeId || 0);
    // If the GM from 510 tries to access anything other than the executive dashboard or login, HIJACK.
    if (isPilotActive && isPilotTargetStore && user.role === 'store_manager') {
        const allowedPaths = ['/executive', '/login', '/select-company'];
        
        if (!allowedPaths.includes(location.pathname)) {
            return <Navigate to="/executive" replace />;
        }
    }

    // Pass-through
    return <>{children}</>;
};
