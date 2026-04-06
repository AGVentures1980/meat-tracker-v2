export interface OfflinePayload {
    id: string; // Unique ID (timestamp or UUID)
    endpoint: string; // API Endpoint
    method: 'POST' | 'PUT' | 'DELETE';
    payload: any; // Body payload
    headers?: Record<string, string>;
    timestamp: number; // When the action occurred
    status: 'PENDING' | 'FAILED'; // FAILED if we tried to sync and it threw 400
    retryCount: number;
}

const STORAGE_KEY = 'brasa_offline_queue';

export class OfflineQueue {
    /**
     * Reads the current queue from LocalStorage
     */
    static getQueue(): OfflinePayload[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error("Failed to parse OfflineQueue from LocalStorage", e);
            return [];
        }
    }

    /**
     * Writes the queue to LocalStorage
     */
    static saveQueue(queue: OfflinePayload[]) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
            // Dispatch a custom event so UI (like navbars) can react immediately
            window.dispatchEvent(new CustomEvent('offline-queue-updated', { detail: queue.length }));
        } catch (e) {
            console.error("Failed to save OfflineQueue. LocalStorage might be full.", e);
        }
    }

    /**
     * Pushes a new failed request into the queue to be retried later
     */
    static push(endpoint: string, method: 'POST' | 'PUT' | 'DELETE', payload: any, headers?: Record<string, string>) {
        const queue = this.getQueue();
        
        const newItem: OfflinePayload = {
            id: `off_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            endpoint,
            method,
            payload,
            headers,
            timestamp: Date.now(),
            status: 'PENDING',
            retryCount: 0
        };

        queue.push(newItem);
        this.saveQueue(queue);
        console.log(`[OfflineQueue] Stored payload for deferred sync: ${endpoint}`, newItem);
        return newItem.id;
    }

    /**
     * Removes an item from the queue after successful synchronization
     */
    static remove(id: string) {
        const queue = this.getQueue();
        const newQueue = queue.filter(item => item.id !== id);
        this.saveQueue(newQueue);
    }

    /**
     * Mark an item as failed so we don't infinitely retry 400 Bad Requests
     */
    static markFailed(id: string) {
        const queue = this.getQueue();
        const idx = queue.findIndex(item => item.id === id);
        if (idx !== -1) {
            queue[idx].status = 'FAILED';
            queue[idx].retryCount += 1;
            this.saveQueue(queue);
        }
    }

    /**
     * Clears everything (useful for hard resets)
     */
    static purge() {
        localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('offline-queue-updated', { detail: 0 }));
    }

    /**
     * Attempts to synchronize all PENDING items in the queue.
     * Usually called when the 'online' event fires.
     */
    static async syncAll(baseUrl: string, defaultToken?: string, companyId?: string): Promise<number> {
        if (!navigator.onLine) {
            console.warn("[OfflineQueue] Cannot sync. Browser reports offline.");
            return 0;
        }

        const queue = this.getQueue();
        // Only sync PENDING that haven't hit max retries, or try them all once
        const pendingItems = queue.filter(item => item.status === 'PENDING' && item.retryCount < 5);

        if (pendingItems.length === 0) return 0;

        console.log(`[OfflineQueue] Commencing sync of ${pendingItems.length} items...`);
        let successCount = 0;

        for (const item of pendingItems) {
            try {
                // Determine headers
                const syncHeaders: Record<string, string> = {
                    'Content-Type': 'application/json',
                    ...(item.headers || {})
                };
                
                if (defaultToken && !syncHeaders['Authorization']) {
                    syncHeaders['Authorization'] = `Bearer ${defaultToken}`;
                }
                if (companyId && !syncHeaders['x-company-id']) {
                    syncHeaders['x-company-id'] = companyId;
                }

                const url = item.endpoint.startsWith('http') ? item.endpoint : `${baseUrl}${item.endpoint}`;

                // Fire the request!
                const res = await fetch(url, {
                    method: item.method,
                    headers: syncHeaders,
                    body: JSON.stringify(item.payload)
                });

                if (res.ok) {
                    console.log(`[OfflineQueue] Successfully synced ${item.id} -> ${item.endpoint}`);
                    this.remove(item.id);
                    successCount++;
                } else if (res.status >= 400 && res.status < 500) {
                    // Client Error (4xx). It will likely never succeed. Mark as failed to avoid infinite blocking.
                    console.error(`[OfflineQueue] Item ${item.id} rejected by server with ${res.status}. Marking FAILED.`);
                    this.markFailed(item.id);
                } else {
                    // Server Error (5xx). Keep it PENDING to try again later.
                    console.warn(`[OfflineQueue] Server returned ${res.status} for ${item.id}. Retrying later.`);
                    const q = this.getQueue();
                    const i = q.find(x => x.id === item.id);
                    if (i) { i.retryCount++; this.saveQueue(q); }
                }

            } catch (err) {
                console.error(`[OfflineQueue] Network error while syncing ${item.id}`, err);
                const q = this.getQueue();
                const i = q.find(x => x.id === item.id);
                if (i) { i.retryCount++; this.saveQueue(q); }
            }
        }

        return successCount;
    }
}
