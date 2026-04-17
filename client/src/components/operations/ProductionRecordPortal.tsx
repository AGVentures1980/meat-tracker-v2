import React, { useState } from 'react';

export function ProductionRecordPortal() {
    const [boxId, setBoxId] = useState('');
    const [producedWeight, setProducedWeight] = useState('');
    const [batchId, setBatchId] = useState('TEMP_BATCH_VAR');
    const [alert, setAlert] = useState<string | null>(null);

    const handleProduce = async () => {
         try {
            const res = await fetch('/api/v1/production/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batchId, boxId, weightToProduceLbs: parseFloat(producedWeight) })
            });
            const data = await res.json();
            if (!data.success) {
                setAlert(data.error); 
            } else {
                setAlert(data.warning || "Success: Recorded Physical Transformation");
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-4 border border-slate-300 rounded-lg shadow-sm bg-white mt-6">
            <h2 className="text-xl font-bold mb-4">Butcher Production</h2>

            <label className="block text-sm font-medium text-gray-700">Select Source Box (Status: IN_COOLER)</label>
            <input className="mb-4 mt-1 block w-full border-gray-300 rounded-md shadow-sm" type="text" value={boxId} onChange={e => setBoxId(e.target.value)} placeholder="Box UUID" />

            <label className="block text-sm font-medium text-gray-700">Produced Yield Weight (Lb)</label>
            <input className="mb-4 mt-1 block w-full border-gray-300 rounded-md shadow-sm" type="number" step="0.01" value={producedWeight} onChange={e => setProducedWeight(e.target.value)} />

            <button onClick={handleProduce} className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700">Record Yield</button>

            {alert && (
                <div className={`mt-4 p-3 rounded text-sm font-semibold ${alert.includes('BLOCK') ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {alert}
                </div>
            )}
        </div>
    );
}
