import { useState, useEffect, useCallback } from 'react';
import localforage from 'localforage';
import { useAuth } from '../context/AuthContext';

export interface VaultMessageData {
    id: string; // temp ID for local tracking
    text: string | null;
    file_url: string | null;
    file_name: string | null;
    file_type: string | null;
    created_at: string;
}

export function useOfflineVault() {
    const { user, selectedCompany } = useAuth();
    const activeCompanyId = selectedCompany || 'tdb-main';
    const [messages, setMessages] = useState<any[]>([]);
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
    const [pendingMessages, setPendingMessages] = useState<VaultMessageData[]>([]);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    // Initialize localForage instance
    useEffect(() => {
        localforage.config({
            name: 'BrasaMeatIntelligence',
            storeName: 'offline_vault'
        });

        // Load cached server messages
        localforage.getItem<any[]>('cached_vault_messages').then((saved) => {
            if (saved) setMessages(saved);
        });

        // Check for pending unsynced messages
        localforage.getItem<VaultMessageData[]>('pending_vault_messages').then((pending) => {
            if (pending) setPendingMessages(pending);
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

    // Fetch messages from server if online, otherwise serve cache
    const fetchVaultMessages = useCallback(async () => {
        if (!isOnline) return; // rely on cache

        try {
            const res = await fetch(`/api/v1/vault/messages?companyId=${activeCompanyId}`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const data = await res.json();
            if (data.success) {
                setMessages(data.messages);
                localforage.setItem('cached_vault_messages', data.messages).catch(console.error);
            }
        } catch (err) {
            console.error('Failed to fetch vault messages', err);
        }
    }, [isOnline, user?.token]);

    // Save transient message to IndexedDB and try to sync
    const enqueueMessage = useCallback(async (text: string | null, file: File | null) => {

        let file_url = null;
        let file_name = null;
        let file_type = null;

        if (file) {
            // Convert to Base64 to survive localforage caching reliably
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
            file_url = await base64Promise;
            file_name = file.name;
            file_type = file.type;
        }

        const msgPayload: VaultMessageData = {
            id: `temp-${Date.now()}`,
            text,
            file_url,
            file_name,
            file_type,
            created_at: new Date().toISOString()
        };

        setPendingMessages(prev => {
            const next = [...prev, msgPayload];
            localforage.setItem('pending_vault_messages', next).catch(console.error);
            return next;
        });

        // Instantly show in UI as a "ghost" message
        setMessages(prev => [...prev, { ...msgPayload, sender: 'OWNER', isPending: true }]);

        if (navigator.onLine) {
            // Trigger sync immediately if online
            syncPendingMessages([...pendingMessages, msgPayload]);
        }
    }, [pendingMessages]);


    // Auto-sync effect when online comes back
    useEffect(() => {
        if (isOnline && pendingMessages.length > 0 && !isSyncing) {
            syncPendingMessages(pendingMessages);
        }
    }, [isOnline, pendingMessages, isSyncing]);

    const syncPendingMessages = async (queue: VaultMessageData[]) => {
        if (!navigator.onLine || queue.length === 0) return;
        setIsSyncing(true);

        // We process the queue sequentially to maintain order and prevent server load
        let remainingQueue = [...queue];

        for (const msg of queue) {
            try {
                // Determine if we are sending base64 json or multipart formData.
                // Because we cached base64, we can send it directly to the backend parsing logic
                // we'll need to adapt the VaultController to accept a base64 string directly 
                // but the current VaultController uses multer. Let's send a fake file blob.

                const formData = new FormData();
                formData.append('companyId', activeCompanyId);

                if (msg.text) formData.append('text', msg.text);

                if (msg.file_url) {
                    // Convert back from Data URL base64 to Blob for multer
                    const res = await fetch(msg.file_url);
                    const blob = await res.blob();
                    formData.append('file', blob, msg.file_name || 'attachment');
                }

                const response = await fetch('/api/v1/vault/messages', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${user?.token}`
                    },
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    // Remove from queue
                    remainingQueue = remainingQueue.filter(m => m.id !== msg.id);
                    await localforage.setItem('pending_vault_messages', remainingQueue);
                    setPendingMessages(remainingQueue);

                    // If the backend generated an immediate AI response (Pitch Demo)
                    if (data.ai_message) {
                        setMessages(prev => {
                            const updated = [...prev, data.ai_message];
                            localforage.setItem('cached_vault_messages', updated).catch(console.error);
                            return updated;
                        });
                    }
                } else {
                    console.error('Vault generic sync error', data.error);
                    break; // Stop syncing this batch if we hit an error
                }
            } catch (err) {
                console.error('Vault network sync error:', err);
                break; // Stop syncing on network failure
            }
        }

        // Fetch fresh state from server to align temp IDs with real DB UUIDs
        if (remainingQueue.length === 0) {
            await fetchVaultMessages();
        }

        setIsSyncing(false);
    };

    return {
        messages,
        pendingMessages,
        isOnline,
        isSyncing,
        enqueueMessage,
        fetchVaultMessages
    };
}
