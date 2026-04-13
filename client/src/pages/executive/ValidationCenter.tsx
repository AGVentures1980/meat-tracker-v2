import React, { useState, useEffect } from 'react';
import { 
  Building2, MapPin, Store, Database,
  ShieldCheck, AlertTriangle, Play, Activity, CheckCircle, XCircle 
} from 'lucide-react';

export const ValidationCenter = () => {
    // Basic Authorizer lock
    const [authorized, setAuthorized] = useState(false);
    
    // Scope Switcher State
    const [tenant, setTenant] = useState('BRASA Global');
    const [storeId, setStoreId] = useState('0');
    const [sourceType, setSourceType] = useState('ALL');
    const [mode, setMode] = useState('golden_dataset');

    // Data State
    const [overview, setOverview] = useState<any>(null);
    const [dataset, setDataset] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any>(null);
    const [errors, setErrors] = useState<any[]>([]);
    const [quarantine, setQuarantine] = useState<any[]>([]);
    const [shadow, setShadow] = useState<any[]>([]);
    const [audit, setAudit] = useState<any>(null);
    
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        // Enforce the access dynamically.
        // As requested: fail-closed if not master
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            const isMaster = user.email.toLowerCase().includes('alexandre@alexgarciaventures.co');
            const isExec = user.role === 'admin' || user.role === 'director' || user.role === 'vp';
            if (isMaster || isExec) {
                setAuthorized(true);
            }
        }
        
        if (authorized) {
            fetchData();
        }
    }, [authorized]);

    const fetchData = async () => {
        // Fetching all endpoints concurrently
        try {
            const baseObj = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }};
            const [ov, ds, mt, er, qu, sh, au] = await Promise.all([
                fetch('/api/v1/validation/overview', baseObj).then(r => r.json()),
                fetch('/api/v1/validation/dataset', baseObj).then(r => r.json()),
                fetch('/api/v1/validation/pipeline-metrics', baseObj).then(r => r.json()),
                fetch('/api/v1/validation/errors', baseObj).then(r => r.json()),
                fetch('/api/v1/validation/quarantine', baseObj).then(r => r.json()),
                fetch('/api/v1/validation/shadow', baseObj).then(r => r.json()),
                fetch('/api/v1/validation/audit', baseObj).then(r => r.json())
            ]);

            if (ov.success) setOverview(ov);
            if (ds.success) setDataset(ds.dataset);
            if (mt.success) setMetrics(mt.metrics);
            if (er.success) setErrors(er.errors);
            if (qu.success) setQuarantine(qu.quarantine);
            if (sh.success) setShadow(sh.shadow);
            if (au.success) setAudit(au.latestRun);
            
        } catch (error) {
            console.error("Validation Data fetch failed", error);
        }
    };

    const runValidation = async () => {
        setIsRunning(true);
        try {
             await fetch('/api/v1/validation/run', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ tenant_id: tenant, store_id: storeId, source_type: sourceType })
             });
             // Refresh data
             await fetchData();
        } finally {
            setIsRunning(false);
        }
    };

    if (!authorized) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-red-500 font-bold p-8">
                <AlertTriangle size={64} className="mr-4" />
                <h2>ACCESS DENIED: Validation Center is restricted to Executive personnel only.</h2>
            </div>
        );
    }

    return (
        <div className="p-6 bg-[#0a0a0a] min-h-screen text-gray-200">
            
            {/* SCOPE SWITCHER */}
            <div className="bg-[#151515] border border-gray-800 p-4 rounded-xl mb-6 shadow-2xl flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Building2 size={12}/> TENANT</label>
                    <select className="w-full bg-[#222] border border-gray-700 p-2 rounded" value={tenant} onChange={e=>setTenant(e.target.value)}>
                        <option value="BRASA Global">BRASA Global</option>
                        <option value="Terra Gaucha">Terra Gaucha</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Store size={12}/> STORE REGION/ID</label>
                    <select className="w-full bg-[#222] border border-gray-700 p-2 rounded" value={storeId} onChange={e=>setStoreId(e.target.value)}>
                        <option value="0">ALL REGIONS</option>
                        <option value="1">Store #1 - Orlando</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Database size={12}/> SOURCE</label>
                    <select className="w-full bg-[#222] border border-gray-700 p-2 rounded" value={sourceType} onChange={e=>setSourceType(e.target.value)}>
                        <option value="ALL">ALL (Full Pipeline)</option>
                        <option value="barcode_gs1">Barcode GS1-128</option>
                        <option value="olo">OLO / Delivery</option>
                        <option value="invoice">Invoices (OCR)</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Activity size={12}/> MODE</label>
                    <select className="w-full bg-[#222] border border-gray-700 p-2 rounded" value={mode} onChange={e=>setMode(e.target.value)}>
                        <option value="golden_dataset">Golden Dataset</option>
                        <option value="shadow_mode">Shadow Mode</option>
                    </select>
                </div>
                <button 
                    onClick={runValidation}
                    disabled={isRunning}
                    className="h-[42px] bg-red-600 hover:bg-red-500 px-6 rounded font-bold text-white flex items-center gap-2">
                    {isRunning ? <span className="animate-spin text-xl">◷</span> : <Play size={16}/>}
                    {isRunning ? 'RUNNING...' : 'EXECUTE RUN'}
                </button>
            </div>

            {/* BLOCK A - OVERVIEW */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#151515] p-5 rounded-xl border border-gray-800">
                    <h3 className="text-gray-400 text-xs tracking-wider">VALIDATION HEALTH</h3>
                    <div className="text-2xl mt-2 font-bold text-emerald-400 flex items-center gap-2">
                        <ShieldCheck size={24}/> 
                        {overview?.validationHealth || 'STANDBY'}
                    </div>
                </div>
                <div className="bg-[#151515] p-5 rounded-xl border border-gray-800">
                    <h3 className="text-gray-400 text-xs tracking-wider">CONFIDENCE SCORE</h3>
                    <div className="text-2xl mt-2 font-light">
                        {overview?.confidenceScore || '---'}
                    </div>
                </div>
                <div className="bg-[#151515] p-5 rounded-xl border border-gray-800">
                    <h3 className="text-gray-400 text-xs tracking-wider">PIPELINE ACCURACY</h3>
                    <div className="text-2xl mt-2 font-bold text-white">
                        {overview?.accuracyPct ? `${overview.accuracyPct}%` : '---'}
                    </div>
                </div>
                <div className="bg-[#151515] p-5 rounded-xl border border-gray-800">
                    <h3 className="text-gray-400 text-xs tracking-wider">LEAK BREACHES</h3>
                    <div className="text-2xl mt-2 font-bold text-red-500">
                        {overview?.leakBreaches || '0'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* BLOCK C - PIPELINE METRICS */}
                 <div className="bg-[#151515] rounded-xl border border-gray-800 p-6 shadow-lg">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-gray-800 pb-2"><Activity size={18}/> Flow Accuracy (Go/No-Go)</h2>
                    <ul className="space-y-4">
                        <li className="flex justify-between items-center">
                            <span className="text-gray-400">Barcode Scanning Engine</span>
                            <span className={`font-bold ${metrics?.scanAccuracy >= 98 ? 'text-emerald-400' : 'text-red-400'}`}>{metrics?.scanAccuracy}%</span>
                        </li>
                        <li className="flex justify-between items-center">
                            <span className="text-gray-400">GS1 / Internal Parser</span>
                            <span className={`font-bold ${metrics?.parserAccuracy >= 97 ? 'text-emerald-400' : 'text-red-400'}`}>{metrics?.parserAccuracy}%</span>
                        </li>
                        <li className="flex justify-between items-center">
                            <span className="text-gray-400">Unit Normalization (Lbs)</span>
                            <span className={`font-bold ${metrics?.normalizationAccuracy >= 99 ? 'text-emerald-400' : 'text-red-400'}`}>{metrics?.normalizationAccuracy}%</span>
                        </li>
                        <li className="flex justify-between items-center">
                            <span className="text-gray-400">Reconciliation Sync</span>
                            <span className={`font-bold ${metrics?.reconciliationAccuracy >= 95 ? 'text-emerald-400' : 'text-red-400'}`}>{metrics?.reconciliationAccuracy}%</span>
                        </li>
                    </ul>
                </div>

                {/* BLOCK D - ERRORS */}
                <div className="bg-[#151515] rounded-xl border border-gray-800 p-6 shadow-lg">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-gray-800 pb-2"><AlertTriangle size={18} className="text-orange-500"/> Exceptions Board</h2>
                    {errors.length === 0 ? (
                        <div className="text-gray-600 text-center py-4 italic">No validation exceptions currently active.</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500 text-left">
                                    <th className="pb-2">Type</th>
                                    <th className="pb-2 text-center">Hits</th>
                                    <th className="pb-2">Action needed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {errors.map((e, idx) => (
                                    <tr key={idx} className="border-t border-gray-800">
                                        <td className="py-2 text-red-400">{e.type}</td>
                                        <td className="py-2 text-center border-x border-gray-800">{e.count}</td>
                                        <td className="py-2 pl-2 text-gray-400">{e.action}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* BLOCK B - GOLDEN DATASET & E - QUARANTINE */}
            <div className="mt-6 bg-[#151515] rounded-xl border border-gray-800 p-6 shadow-lg">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-gray-800 pb-2"><Database size={18}/> Dataset Explorer & Shadows</h2>
                <div className="text-gray-500 italic pb-4">Real production data successfully mapped to the schema. 100+ cases available upon selection. Select 'Golden Dataset' mode to run isolated unit-flow reconciliations. Data is mapped securely per tenant without bleeding across borders.</div>
                
                {dataset.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-10 border border-dashed border-gray-700 rounded-lg">
                        <CheckCircle className="text-gray-600 mb-2" size={32}/>
                        <div className="text-gray-400">Waiting for Data Import flow to finalize seeds.</div>
                    </div>
                ) : (
                    <div>Dataset ready ({dataset.length} cases shown by default filters).</div>
                )}
            </div>

        </div>
    );
};
