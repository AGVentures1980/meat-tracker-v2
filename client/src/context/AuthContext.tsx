import React, { createContext, useContext, useState, useEffect } from 'react';
import { ACCOUNTS, Account } from '../lib/constants';

interface AuthContextType {
    user: any | null; // using any temporarily to match Account shape dynamically
    login: (email: string, pass: string) => Promise<boolean>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check local storage for persistent login (simple version)
        const stored = localStorage.getItem('brasameat_user');
        if (stored) {
            setUser(JSON.parse(stored));
        }
        setIsLoading(false);
    }, []);

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
                return true;
            } else {
                return false;
            }
        } catch (err) {
            console.error('Login Failed', err);
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('brasameat_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
