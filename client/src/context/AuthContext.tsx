import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
    user: any | null;
    selectedCompany: string | null;
    login: (email: string, pass: string, portalCompany?: string) => Promise<any | null>;
    logout: () => void;
    setCompany: (id: string | null) => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('brasameat_user');
        const storedCompany = localStorage.getItem('brasameat_selected_company');
        
        const decodeJWT = (token: string) => {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
                    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                ).join(''));
                return JSON.parse(jsonPayload);
            } catch (e) { return null; }
        };

        if (stored) {
            const parsedUser = JSON.parse(stored);
            const decoded = parsedUser.token ? decodeJWT(parsedUser.token) : null;
            
            // Validate Token Freshness
            if (!decoded || !decoded.companyId || !decoded.role || (decoded.exp && decoded.exp < Date.now() / 1000)) {
                console.warn("[AUTH] Stale or invalid JWT detected. Forcing re-login.");
                localStorage.removeItem('brasameat_user');
                localStorage.removeItem('brasameat_selected_company');
            } else {
                setUser(parsedUser);
                if (storedCompany) setSelectedCompany(storedCompany);
            }
        }
        setIsLoading(false);
    }, []);

    const setCompany = (id: string | null) => {
        setSelectedCompany(id);
        if (id) {
            localStorage.setItem('brasameat_selected_company', id);
        } else {
            localStorage.removeItem('brasameat_selected_company');
        }
    };

    const login = async (email: string, pass: string, portalCompany?: string) => {
        try {
            const baseUrl = '/api/v1';
            const res = await fetch(`${baseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass, portalCompany })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                const userData = { ...data.user, token: data.token, forceChange: data.forcePasswordChange };
                setUser(userData);
                localStorage.setItem('brasameat_user', JSON.stringify(userData));

                if (data.defaultCompanyId) {
                    setCompany(data.defaultCompanyId);
                }

                return data; // Return full data including redirectPath
            } else {
                return null;
            }
        } catch (err) {
            console.error('Login Failed', err);
            return null;
        }
    };

    const logout = () => {
        setUser(null);
        setSelectedCompany(null);
        localStorage.removeItem('brasameat_user');
        localStorage.removeItem('brasameat_selected_company');
    };

    return (
        <AuthContext.Provider value={{ user, selectedCompany, login, logout, setCompany, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
