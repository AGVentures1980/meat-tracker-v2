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
        // Simulate API delay
        await new Promise(r => setTimeout(r, 500));

        const cleanEmail = email.toLowerCase().trim();
        const account = ACCOUNTS[cleanEmail];

        if (account && account.pass === pass) {
            const userData = { ...account, email: cleanEmail };
            setUser(userData);
            localStorage.setItem('brasameat_user', JSON.stringify(userData));
            return true;
        }
        return false;
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
