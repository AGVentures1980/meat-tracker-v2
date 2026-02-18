import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
    user: any | null;
    selectedCompany: string | null;
    login: (email: string, pass: string) => Promise<any | null>;
    logout: () => void;
    setCompany: (id: string) => void;
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
        if (stored) {
            setUser(JSON.parse(stored));
        }
        if (storedCompany) {
            setSelectedCompany(storedCompany);
        }
        setIsLoading(false);
    }, []);

    const setCompany = (id: string) => {
        setSelectedCompany(id);
        localStorage.setItem('brasameat_selected_company', id);
    };

    const login = async (email: string, pass: string) => {
        try {
            const baseUrl = '/api/v1';
            const res = await fetch(`${baseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass })
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
