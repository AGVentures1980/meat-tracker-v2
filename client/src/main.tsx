import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary'

// --- SECURE ENVIRONMENT RESOLUTION GUARD ---
// Phase 3 Hardening: Intercept and block localhost websockets on production domains
const OriginalWebSocket = window.WebSocket;
(window as any).WebSocket = function(url: string | URL, protocols?: string | string[]) {
    const urlStr = url.toString();
    const hostname = window.location.hostname;
    // Consider production if it's not localhost/127.0.0.1
    const isProductionSite = !hostname.includes('localhost') && !hostname.includes('127.0.0.1');

    if (isProductionSite && (urlStr.includes('localhost') || urlStr.includes('127.0.0.1'))) {
        console.error('🛑 [ENVIRONMENT_CORRUPTION_DETECTED] Attempted to open local WebSocket in production:', urlStr);
        console.warn('Realtime module disabled due to invalid configuration. Proceeding in fail-safe mode.');
        
        // Return a dummy websocket that gracefully handles the failure
        const dummySocket: any = {
            url: urlStr,
            readyState: 3, // CLOSED
            close: () => {},
            send: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
        };
        // Ensure properties like onerror exist
        dummySocket.onerror = null;
        dummySocket.onclose = null;
        dummySocket.onopen = null;
        dummySocket.onmessage = null;

        // Optionally, simulate failing asynchronously
        setTimeout(() => {
            if (typeof dummySocket.onerror === 'function') dummySocket.onerror(new Event('error'));
            if (typeof dummySocket.onclose === 'function') dummySocket.onclose(new CloseEvent('close', { wasClean: false, code: 1006 }));
        }, 100);

        return dummySocket as WebSocket;
    }
    return new OriginalWebSocket(url, protocols);
};
Object.assign((window as any).WebSocket, OriginalWebSocket);
// ------------------------------------------

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <GlobalErrorBoundary>
            <App />
        </GlobalErrorBoundary>
    </React.StrictMode>,
)
