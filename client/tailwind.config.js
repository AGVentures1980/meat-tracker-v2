/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    black: '#0a0a0a',
                    gold: 'rgb(var(--color-brand-gold, 197 160 89) / <alpha-value>)',
                    red: 'rgb(var(--color-brand-red, 139 0 0) / <alpha-value>)',
                    surface: '#121212',
                }
            },
            fontFamily: {
                serif: ['"Playfair Display"', 'serif'],
                sans: ['"Inter"', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
