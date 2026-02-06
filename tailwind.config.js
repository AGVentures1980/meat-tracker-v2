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
                    red: '#963038',
                    black: '#383A3C',
                    gold: '#C5A059', // Added a gold accent for premium feel
                    dark: '#1a1a1a',
                }
            }
        },
    },
    plugins: [],
}
