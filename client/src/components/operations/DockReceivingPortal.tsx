import React, { useState } from 'react';

export function DockReceivingPortal() {
    const [scannedBarcode, setScannedBarcode] = useState('');
    const [manualWeightLb, setManualWeightLb] = useState('');
    const [shipmentId, setShipmentId] = useState('');
    const [status, setStatus] = useState<any>(null);

    const handleScan = async () => {
        try {
            const res = await fetch('/api/v1/receiving/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    shipmentId, 
                    scannedBarcode, 
                    extractedWeightLb: parseFloat(manualWeightLb) 
                })
            });
            const data = await res.json();
            setStatus(data);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-4 border border-slate-300 rounded-lg shadow-sm bg-white">
            <h2 className="text-xl font-bold mb-4">Dock Receiving</h2>
            
            <label className="block text-sm font-medium text-gray-700">Shipment ID (Mandatory)</label>
            <input className="mb-4 mt-1 block w-full border-gray-300 rounded-md shadow-sm" type="text" value={shipmentId} onChange={e => setShipmentId(e.target.value)} />

            <label className="block text-sm font-medium text-gray-700">Scanned Barcode</label>
            <input className="mb-4 mt-1 block w-full border-gray-300 rounded-md shadow-sm" type="text" value={scannedBarcode} onChange={e => setScannedBarcode(e.target.value)} />

            <label className="block text-sm font-medium text-gray-700">Manual Weight (Lb)</label>
            <input className="mb-4 mt-1 block w-full border-gray-300 rounded-md shadow-sm" type="number" step="0.01" value={manualWeightLb} onChange={e => setManualWeightLb(e.target.value)} />

            <button onClick={handleScan} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Scan & Match</button>

            {status && (
                <div className="mt-4 p-3 bg-gray-100 rounded text-sm text-gray-800 break-words">
                    <strong>Result:</strong> <pre>{JSON.stringify(status, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}
