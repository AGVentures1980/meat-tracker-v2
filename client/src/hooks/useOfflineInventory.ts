import { useState, useEffect, useCallback } from 'react';
import localforage from 'localforage';

export interface PendingSyncData {
    timestamp: number;
    counts: Record<string, number>;
}

export function useOfflineInventory() {
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
    const [hasPendingSync, setHasPendingSync] = useState<boolean>(false);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    // Initialize localForage instance
    useEffect(() => {
        localforage.config({
            name: 'BrasaMeatIntelligence',
            storeName: 'offline_inventory'
        });

        // Load drafted counts from IndexedDB on boot
        localforage.getItem<Record<string, number>>('draft_counts').then((savedCounts) => {
            if (savedCounts) {
                setCounts(savedCounts);
            }
        });

        // Check for pending full submission
        localforage.getItem<PendingSyncData>('pending_sync').then((syncData) => {
            if (syncData) setHasPendingSync(true);
        });
    }, []);

    // Network Status Listeners
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Save transient counts to IndexedDB to survive refresh
    const updateCount = useCallback((id: string, value: number) => {
        setCounts(prev => {
            const next = { ...prev, [id]: value };
            localforage.setItem('draft_counts', next).catch(console.error);
            return next;
        });
    }, []);

    // Auto-sync effect when online comes back
    useEffect(() => {
        if (isOnline && hasPendingSync && !isSyncing) {
            triggerSync();
        }
    }, [isOnline, hasPendingSync]);

    const queueForSync = async (finalCounts: Record<string, number>) => {
        const payload: PendingSyncData = {
            timestamp: Date.now(),
            counts: finalCounts
        };
        await localforage.setItem('pending_sync', payload);
        await localforage.removeItem('draft_counts'); // Clear draft
        setHasPendingSync(true);

        // If we are online right now, just fire the sync immediately
        if (navigator.onLine) {
            triggerSync();
        }
    };

    const triggerSync = async () => {
        try {
            setIsSyncing(true);
            const payload = await localforage.getItem<PendingSyncData>('pending_sync');

            if (!payload) {
                setHasPendingSync(false);
                return;
            }

            // TODO: In a real app we'd get token from Auth Context. 
            // For now, simulating the fetch config logic.
            const token = localStorage.getItem('auth_token') || '';

            console.log("[OFFLINE-SYNC] Posting pending inventory counts...");
            // Simulated API Post 
            /*
            const response = await fetch('/api/v1/inventory/weekly', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload.counts)
            });
            if (!response.ok) throw new Error("Sync failed");
            */

            // Simulation of 1000ms delay for visual feedback
            await new Promise(r => setTimeout(r, 1500));

            // Clear the queue 
            await localforage.removeItem('pending_sync');
            setHasPendingSync(false);
            console.log("[OFFLINE-SYNC] Success.");

        } catch (error) {
            console.error("Failed to sync offline data", error);
        } finally {
            setIsSyncing(false);
        }
    };

    return {
        counts,
        updateCount,
        isOnline,
        hasPendingSync,
        isSyncing,
        queueForSync
    };
}
