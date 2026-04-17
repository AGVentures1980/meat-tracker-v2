import React, { useState } from 'react';

export function InventorySubmitPortal() {
    const [proteinId, setProteinId] = useState('');
    const [countedLbs, setCountedLbs] = useState('');
    const [status, setStatus] = useState<any>(null);

    const handleSubmit = async () => {
        try {
            const res = await fetch('/api/v1/inventory/weekly', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cycleId: 'CYC_DEFAULT', proteinId, countedLbs: parseFloat(countedLbs) })
            });
            const data = await res.json();
            setStatus(data);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-4 border border-slate-300 rounded-lg shadow-sm bg-white mt-6">
            <h2 className="text-xl font-bold mb-4">Weekly Inventory Baseline</h2>

            <label className="block text-sm font-medium text-gray-700">Protein ID</label>
            <input className="mb-4 mt-1 block w-full border-gray-300 rounded-md shadow-sm" type="text" value={proteinId} onChange={e => setProteinId(e.target.value)} />

            <label className="block text-sm font-medium text-gray-700">Total Counted (Leftovers Lb)</label>
            <input className="mb-4 mt-1 block w-full border-gray-300 rounded-md shadow-sm" type="number" step="0.01" value={countedLbs} onChange={e => setCountedLbs(e.target.value)} />

            <button onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Submit Count</button>
            
            {status && (
                <div className={`mt-4 p-3 rounded text-sm font-semibold break-words ${status.error ? 'bg-red-100 text-red-800' : (status.status === 'WARNING_REQUIRE_CONFIRMATION' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800')}`}>
                    {status.error || status.message || `Success! Delta Pct: ${status.metrics?.deltaPct.toFixed(2)}%`}
                </div>
            )}
        </div>
    );
}
