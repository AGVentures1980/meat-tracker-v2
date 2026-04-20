import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeConfig {
    primaryColor: string;
    logoUrl: string | null;
    bgUrl: string | null;
    companyName: string;
}

interface ThemeContextType {
    theme: ThemeConfig | null;
    loading: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: null,
    loading: true,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setTheme] = useState<ThemeConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTheme = async () => {
            try {
                const hostname = window.location.hostname;
                // e.g. "tdb.brasameat.com" -> extract "tdb".
                // In local dev, handles "tdb.localhost" as well.
                const parts = hostname.split('.');
                // Assuming domain structure like subdomain.domain.com.
                // If it's just 'localhost' or 'www.brasameat.com', subdomain is parts[0].
                // We'll pass the first part as a simplistic approach, the backend handles fallbacks.
                let subdomain = parts[0];

                // Map the frontend 'fdc' alias to the database 'fogo' tenant
                if (subdomain.toLowerCase() === 'fdc') {
                    subdomain = 'fogo';
                }

                // In React Vite dev server, typically running at localhost:5173
                let baseUrl = import.meta.env.VITE_API_URL || '';
                baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
                const response = await fetch(`${baseUrl}/api/v1/theme/${subdomain}?t=${Date.now()}`);

                if (response.ok) {
                    const data = await response.json();
                    setTheme({
                        primaryColor: data.primary_color,
                        logoUrl: data.logo_url,
                        bgUrl: data.bg_url,
                        companyName: data.company_name
                    });

                    // Inject the primary color into the CSS Variables root so Tailwind can pick it up
                    document.documentElement.style.setProperty('--color-brand-red', data.primary_color);
                    document.documentElement.style.setProperty('--color-brand-gold', data.primary_color);
                } else {
                    console.error('Failed to fetch theme rules');
                }
            } catch (error) {
                console.error('Error fetching theme:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTheme();
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, loading }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useThemeContext = () => useContext(ThemeContext);
