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
        const fetchSession = async () => {
            try {
                const res = await fetch('/api/v1/auth/me', {
                    credentials: 'include'
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.user) {
                        setUser(data.user);
                        const serverCompanyId = data.user.companyId || data.user.company_id;
                        const storedCompany = localStorage.getItem('brasameat_selected_company');
                        const resolvedCompany = serverCompanyId || storedCompany;
                        console.log(`[BRASA_TENANT_SWITCH_TRACE] AUTH_SESSION_BOOTSTRAP host=${window.location.hostname} serverCompanyId=${serverCompanyId} storedCompany=${storedCompany} resolvedCompany=${resolvedCompany}`);
                        if (resolvedCompany) {
                            setSelectedCompany(resolvedCompany);
                            localStorage.setItem('brasameat_selected_company', resolvedCompany);
                        }
                        setIsLoading(false);
                        return;
                    }
                }
            } catch (e) {
                console.error('[AUTH] Server session bootstrap failed:', e);
            }

            // Fallback: If unauthenticated or token expired, clear user state
            setUser(null);
            setSelectedCompany(null);
            localStorage.removeItem('brasameat_user');
            localStorage.removeItem('brasameat_selected_company');
            setIsLoading(false);
        };

        fetchSession();
    }, []);

    const setCompany = (id: string | null) => {
        console.log(`[BRASA_TENANT_SWITCH_TRACE] SET_COMPANY_CALLED targetId=${id} currentSelected=${selectedCompany} host=${window.location.hostname}`);
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
                credentials: 'include',
                body: JSON.stringify({ email, password: pass, portalCompany })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                const userData = { ...data.user, forceChange: data.forcePasswordChange };
                setUser(userData);
                // Safe non-secret metadata stored in localStorage for UI hints (NO raw bearer token)
                localStorage.setItem('brasameat_user', JSON.stringify({
                    id: userData.id,
                    email: userData.email,
                    role: userData.role,
                    companyId: userData.companyId
                }));

                const effectiveCompany = data.defaultCompanyId || userData.companyId || userData.company_id;
                if (effectiveCompany) {
                    setCompany(effectiveCompany);
                }

                return data; // Return full data including redirectPath
            } else {
                return { success: false, error: data?.error || data?.message || 'Invalid email or password' };
            }
        } catch (err) {
            console.error('Login Failed', err);
            return { success: false, error: 'Network error or service unavailable' };
        }
    };

    const logout = async () => {
        setUser(null);
        setSelectedCompany(null);
        localStorage.removeItem('brasameat_user');
        localStorage.removeItem('brasameat_selected_company');
        try {
            await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (e) {}
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
