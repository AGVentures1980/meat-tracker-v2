import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { OfflineQueue } from '../services/OfflineQueue';

export function NetworkSyncManager() {
    const { user, selectedCompany } = useAuth();
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = async () => {
            console.log("🟢 [NetworkSyncManager] Connection restored. Triggering offline sync...");
            setIsOnline(true);
            
            if (user?.token) {
                const API_URL = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');
                const syncedCount = await OfflineQueue.syncAll(API_URL, user.token, selectedCompany || user.companyId);
                if (syncedCount > 0) {
                    // Optional: Dispatch a global success event, or use a toast notification if the app had one
                    console.log(`✅ [NetworkSyncManager] Successfully flushed ${syncedCount} queued items to server.`);
                    window.dispatchEvent(new CustomEvent('global-notification', { detail: { message: `Successfully synced ${syncedCount} offline records.`, type: 'success' }}));
                }
            }
        };

        const handleOffline = () => {
            console.warn("🔴 [NetworkSyncManager] Connection lost. App is now operating in Offline Mode.");
            setIsOnline(false);
            window.dispatchEvent(new CustomEvent('global-notification', { detail: { message: `Connection lost. Working offline.`, type: 'warning' }}));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Also attempt sync on initial load if we have a token
        if (navigator.onLine && user?.token) {
            handleOnline();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [user?.token, selectedCompany]);

    return null; // This is a headless manager component
}
