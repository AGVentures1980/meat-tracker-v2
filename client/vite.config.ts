import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'brasa-logo-v3-dark.png', 'masked-icon.svg', 'brasa-logo-v3.png'],
            manifest: {
                name: 'Brasa Meat Intelligence',
                short_name: 'Brasa',
                description: 'Operational Intelligence for Brazilian Steakhouses',
                theme_color: '#0a0a0a',
                background_color: '#0a0a0a',
                display: 'standalone',
                icons: [
                    {
                        src: 'brasa-logo-v3-dark.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'brasa-logo-v3-dark.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: 'brasa-logo-v3-dark.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
                maximumFileSizeToCacheInBytes: 5000000,
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gstatic-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    }
                ]
            }
        })
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        host: true, // Listen on all addresses
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false,
            }
        }
    }
})
