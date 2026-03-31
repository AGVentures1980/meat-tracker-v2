import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ShieldAlert, ArrowRight, CheckCircle2, UserPlus, FileSpreadsheet, Plus, Trash2, MapPin, UploadCloud, ScanLine, Sparkles, Link as LinkIcon, Palette } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const TenantArchitect: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const API_URL = (import.meta as any).env.VITE_API_URL || '';
    const [step, setStep] = useState(1);
    
    // Feature Form State
    const [companyName, setCompanyName] = useState('');
    const [ceo, setCeo] = useState({ first_name: '', last_name: '', email: '' });
    
    // Dynamic Arrays using temp IDs for relational binding
    const [areaManagers, setAreaManagers] = useState<any[]>([]);
    const [stores, setStores] = useState<any[]>([]);
    const [proteins, setProteins] = useState<any[]>([
        { id: 'p1', name: 'Picanha', cost_per_lb: 6.50 },
        { id: 'p2', name: 'Fraldinha', cost_per_lb: 5.20 },
        { id: 'p3', name: 'Filet Mignon', cost_per_lb: 12.00 }
    ]);

    const [integrations, setIntegrations] = useState({ pos_provider: 'Micros', pos_api_key: '', olo_api_key: '' });
    const [branding, setBranding] = useState({ theme_primary_color: '#7e1518', theme_logo_url: '', theme_bg_url: '' });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successPayload, setSuccessPayload] = useState<any>(null);

    // AI OCR Simulation State
    const [ocrState, setOcrState] = useState<'idle' | 'scanning' | 'complete'>('idle');
    const simulateOcrScan = () => {
        if(ocrState !== 'idle') return;
        setOcrState('scanning');
        setTimeout(() => {
            setProteins([
                { id: 'ocr1', name: 'Premium Picanha (118A)', cost_per_lb: 6.42 },
                { id: 'ocr2', name: 'Fraldinha Bottom Sirloin', cost_per_lb: 5.18 },
                { id: 'ocr3', name: 'Filet Mignon Tenderloin', cost_per_lb: 11.85 },
                { id: 'ocr4', name: 'Lamb Chops Frenched', cost_per_lb: 14.50 },
                { id: 'ocr5', name: 'Pork Sausage Linguica', cost_per_lb: 3.25 },
            ]);
            setOcrState('complete');
        }, 2500);
    };

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    // Dynamic Lists Actions
    const addAreaManager = () => setAreaManagers([...areaManagers, { temp_id: Date.now().toString(), first_name: '', last_name: '', email: '', region: 'Global' }]);
    const removeAreaManager = (id: string) => setAreaManagers(areaManagers.filter(am => am.temp_id !== id));
    
    const addStore = () => setStores([...stores, { id: Date.now().toString(), name: '', location: '', target_lbs: 1.76, target_cost: 9.50, area_manager_temp_id: '' }]);
    const removeStore = (id: string) => setStores(stores.filter(s => s.id !== id));
    
    const addProtein = () => setProteins([...proteins, { id: Date.now().toString(), name: '', cost_per_lb: 0 }]);
    const removeProtein = (id: string) => setProteins(proteins.filter(p => p.id !== id));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_URL}/api/v1/partner/provision-tenant`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({
                    company_name: companyName,
                    ceo,
                    branding,
                    area_managers: areaManagers,
                    stores,
                    proteins,
                    integrations
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate tenant. Please check logs.');
            }

            setSuccessPayload(data);
            setStep(8); // Success screen
        } catch (err: any) {
            setError(err.message || 'Failed to generate tenant.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto mt-8 animate-fade-in-up pb-24">
            <div className="bg-[#111] border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                
                {/* Header Wizard Steps */}
                <div className="flex items-center justify-between mb-12 border-b border-gray-800 pb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Building2 className="text-emerald-500" />
                            Tenant Architect
                        </h2>
                        <p className="text-sm text-gray-400 mt-2">Self-serve massive deployment engine.</p>
                    </div>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                            <React.Fragment key={num}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= num ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
                                    {num}
                                </div>
                                {num < 7 && <div className={`w-6 h-[2px] mt-4 ${step > num ? 'bg-emerald-500' : 'bg-gray-800'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-4">
                        <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-1" />
                        <div>
                            <h4 className="text-red-400 font-bold mb-1">Provisioning Engine Fault</h4>
                            <p className="text-red-200 text-sm">{error}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={step === 7 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
                    
                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-bold text-emerald-400 border-b border-gray-800 pb-2">1. Organization & Executive Leadership</h3>
                            <p className="text-sm text-gray-400">Define the legal entity and the primary Director (CEO) account.</p>
                            
                            <div className="p-6 bg-[#0a0a0a] border border-gray-800 rounded-xl space-y-6">
                                <Input label="Conglomerate / Company Name" value={companyName} onChange={setCompanyName} required placeholder="e.g. Fogo de Chão North America" />
                                
                                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-800">
                                    <Input label="CEO First Name" value={ceo.first_name} onChange={(v: string) => setCeo({...ceo, first_name: v})} required placeholder="John" />
                                    <Input label="CEO Last Name" value={ceo.last_name} onChange={(v: string) => setCeo({...ceo, last_name: v})} required placeholder="Doe" />
                                    <div className="col-span-2">
                                        <Input label="CEO Secure Email" type="email" value={ceo.email} onChange={(v: string) => setCeo({...ceo, email: v})} required placeholder="john.doe@company.com" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 border-b border-gray-800 pb-2">
                                <Palette className="w-5 h-5 text-emerald-400" />
                                2. Branding & Visual Identity (Whitelabel)
                            </h3>
                            <p className="text-sm text-gray-400">Configure the cinematic layout engine to instantly morph the UI to match the client's official brand.</p>

                            <div className="p-6 bg-[#0a0a0a] border border-gray-800 rounded-xl space-y-6">
                                <div className="grid grid-cols-12 gap-6">
                                    <div className="col-span-8 space-y-4">
                                        <Input label="High-Res Vector Logo URL (SVG/PNG)" value={branding.theme_logo_url} onChange={(v: string) => setBranding({...branding, theme_logo_url: v})} placeholder="https://cdn.example.com/logo-white.svg" />
                                        <p className="text-xs text-gray-500 mt-1">For cinematic video backgrounds, solid white (high-contrast) vectors perform best.</p>
                                    </div>
                                    <div className="col-span-4">
                                        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Primary Brand Accent</label>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="color" 
                                                value={branding.theme_primary_color} 
                                                onChange={(e) => setBranding({...branding, theme_primary_color: e.target.value})}
                                                className="w-12 h-12 rounded cursor-pointer bg-transparent border-0 p-0"
                                            />
                                            <Input label="" value={branding.theme_primary_color} onChange={(v: string) => setBranding({...branding, theme_primary_color: v})} placeholder="#hex" />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-800">
                                    <Input label="Cinematic Background (MP4 Video or HD Image URL)" value={branding.theme_bg_url} onChange={(v: string) => setBranding({...branding, theme_bg_url: v})} placeholder="https://cdn.example.com/ambient-loop.mp4" />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-bold text-emerald-400 border-b border-gray-800 pb-2">3. Regional Hierarchy</h3>
                            <p className="text-sm text-gray-400">Create global Area Managers to supervise specific store clusters.</p>
                            
                            <div className="space-y-4">
                                {areaManagers.map((am, index) => (
                                    <div key={am.temp_id} className="p-5 bg-[#0a0a0a] border border-gray-800 rounded-xl grid grid-cols-12 gap-4 items-end relative group">
                                        <div className="col-span-3">
                                            <Input label="First Name" value={am.first_name} onChange={(v: string) => { const newAm = [...areaManagers]; newAm[index].first_name = v; setAreaManagers(newAm); }} required />
                                        </div>
                                        <div className="col-span-3">
                                            <Input label="Last Name" value={am.last_name} onChange={(v: string) => { const newAm = [...areaManagers]; newAm[index].last_name = v; setAreaManagers(newAm); }} required />
                                        </div>
                                        <div className="col-span-3">
                                            <Input label="Email" type="email" value={am.email} onChange={(v: string) => { const newAm = [...areaManagers]; newAm[index].email = v; setAreaManagers(newAm); }} required />
                                        </div>
                                        <div className="col-span-2">
                                            <Input label="Region" value={am.region} onChange={(v: string) => { const newAm = [...areaManagers]; newAm[index].region = v; setAreaManagers(newAm); }} required />
                                        </div>
                                        <div className="col-span-1 pb-2">
                                            <button title="Remove Area Manager" type="button" onClick={() => removeAreaManager(am.temp_id)} className="text-red-500 hover:text-red-400">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button type="button" onClick={addAreaManager} className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 font-medium bg-emerald-900/20 px-4 py-2 rounded-lg border border-emerald-900/40">
                                <UserPlus className="w-4 h-4" /> Add Area Manager
                            </button>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-bold text-emerald-400 border-b border-gray-800 pb-2">4. Physical Store Network</h3>
                            <p className="text-sm text-gray-400">Provision valid database entities for each restaurant location.</p>
                            
                            <div className="space-y-4">
                                {stores.map((store, index) => (
                                    <div key={store.id} className="p-5 bg-[#0a0a0a] border border-gray-800 rounded-xl grid grid-cols-12 gap-4 items-end relative">
                                        <div className="col-span-3">
                                            <Input label="Store Name" value={store.name} onChange={(v: string) => { const newS = [...stores]; newS[index].name = v; setStores(newS); }} required placeholder="e.g. Miami Beach" />
                                        </div>
                                        <div className="col-span-3">
                                            <div className="space-y-1">
                                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Area Manager Supervisor</label>
                                                <select 
                                                    title="Assign Area Manager"
                                                    value={store.area_manager_temp_id} 
                                                    onChange={(e) => { const newS = [...stores]; newS[index].area_manager_temp_id = e.target.value; setStores(newS); }}
                                                    className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 transition-colors text-sm"
                                                >
                                                    <option value="">-- Master Pool --</option>
                                                    {areaManagers.map(am => (
                                                        <option key={am.temp_id} value={am.temp_id}>{am.first_name} {am.last_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <Input label="Lbs / Guest" type="number" step="0.01" value={store.target_lbs.toString()} onChange={(v: string) => { const newS = [...stores]; newS[index].target_lbs = parseFloat(v); setStores(newS); }} required />
                                        </div>
                                        <div className="col-span-3">
                                            <Input label="Target Cost / Guest" type="number" step="0.01" value={store.target_cost.toString()} onChange={(v: string) => { const newS = [...stores]; newS[index].target_cost = parseFloat(v); setStores(newS); }} required />
                                        </div>
                                        <div className="col-span-1 pb-2 text-right">
                                            <button title="Remove Store" type="button" onClick={() => removeStore(store.id)} className="text-red-500 hover:text-red-400">
                                                <Trash2 className="w-5 h-5 mx-auto" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button type="button" onClick={addStore} className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 font-medium bg-emerald-900/20 px-4 py-2 rounded-lg border border-emerald-900/40">
                                <MapPin className="w-4 h-4" /> Add Corporate Store
                            </button>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-end border-b border-gray-800 pb-2">
                                <div>
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                                        <Sparkles className="w-5 h-5 text-emerald-400" /> 
                                        5. AI Invoice Extraction (OCR)
                                    </h3>
                                    <p className="text-sm text-gray-400 mt-1">Upload vendor invoices to automatically generate the Meat Dictionary and precise $ / Lb Cost Baselines.</p>
                                </div>
                            </div>
                            
                            {/* OCR Upload Zone */}
                            <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all overflow-hidden ${ocrState === 'scanning' ? 'border-emerald-500 bg-emerald-900/10' : ocrState === 'complete' ? 'border-gray-700 bg-[#0a0a0a]' : 'border-gray-800 hover:border-gray-600 bg-[#0a0a0a] cursor-pointer'}`}
                                 onClick={simulateOcrScan}
                            >
                                {ocrState === 'scanning' && (
                                    <div className="absolute inset-0 bg-emerald-500/10 translate-y-[100%] animate-[scan_2s_ease-in-out_infinite]" />
                                )}

                                {ocrState === 'idle' && (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto text-gray-500">
                                            <UploadCloud className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">Drag & Drop Vendor Invoices (or Click to Simulate)</p>
                                            <p className="text-sm text-gray-500 mt-1">PDF, JPG, PNG (Max 5MB)</p>
                                        </div>
                                        <button type="button" className="text-emerald-500 text-sm font-medium pt-2">Browse Files</button>
                                    </div>
                                )}
                                
                                {ocrState === 'scanning' && (
                                    <div className="space-y-4 animate-pulse relative z-10">
                                        <div className="w-16 h-16 bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto text-emerald-400 relative">
                                            <ScanLine className="w-8 h-8 animate-pulse" />
                                        </div>
                                        <div>
                                            <p className="text-emerald-400 font-bold tracking-widest uppercase text-sm">Optical Extraction Active</p>
                                            <p className="text-sm text-gray-400 mt-1">Parsing GS1-128 codes, weights, and billing totals...</p>
                                        </div>
                                    </div>
                                )}
                                
                                {ocrState === 'complete' && (
                                    <div className="space-y-2 relative z-10">
                                        <div className="w-12 h-12 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-2">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <p className="text-white font-medium">Extraction Complete</p>
                                        <p className="text-sm text-emerald-500 font-mono">5 Baseline Proteins Successfully Mapped</p>
                                    </div>
                                )}
                            </div>

                            {/* Extracted Matrix */}
                            <div className="space-y-4 max-w-2xl pt-4">
                                {proteins.map((p, index) => (
                                    <div key={p.id} className="flex gap-4 items-end animate-fade-in-up">
                                        <div className="flex-1">
                                            <Input label="Extracted Protein" value={p.name} onChange={(v: string) => { const n = [...proteins]; n[index].name = v; setProteins(n); }} required />
                                        </div>
                                        <div className="w-48">
                                            <Input label="Cost per LB ($)" type="number" step="0.01" value={p.cost_per_lb.toString()} onChange={(v: string) => { const n = [...proteins]; n[index].cost_per_lb = parseFloat(v); setProteins(n); }} required />
                                        </div>
                                        <div className="pb-2">
                                            <button title="Remove Protein" type="button" onClick={() => removeProtein(p.id)} className="text-red-500 hover:text-red-400 shadow-md">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button type="button" onClick={addProtein} className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 font-medium bg-emerald-900/20 px-4 py-2 rounded-lg border border-emerald-900/40 mt-4 transition-all">
                                <Plus className="w-4 h-4" /> Add Manual Override
                            </button>
                        </div>
                    )}

                    {step === 6 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 border-b border-gray-800 pb-2">
                                <LinkIcon className="w-5 h-5 text-emerald-400" />
                                6. Operational Integrations (API)
                            </h3>
                            <p className="text-sm text-gray-400">Connect the restaurant's Point of Sale and Delivery systems for live metric ingestion.</p>

                            <div className="p-6 bg-[#0a0a0a] border border-gray-800 rounded-xl space-y-6">
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Primary POS Provider</label>
                                    <select 
                                        title="Select POS Provider"
                                        value={integrations.pos_provider} 
                                        onChange={(e) => setIntegrations({...integrations, pos_provider: e.target.value})}
                                        className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 transition-colors text-sm"
                                    >
                                        <option value="Micros">Oracle Micros</option>
                                        <option value="Aloha">NCR Aloha</option>
                                        <option value="Toast">Toast POS</option>
                                        <option value="Square">Square</option>
                                    </select>
                                </div>
                                
                                <Input label={`${integrations.pos_provider} API Key / Webhook Secret`} type="password" value={integrations.pos_api_key} onChange={(v: string) => setIntegrations({...integrations, pos_api_key: v})} placeholder="sk_live_..." />
                                
                                <div className="pt-4 border-t border-gray-800">
                                    <Input label="OLO Delivery API Key (Optional)" type="password" value={integrations.olo_api_key} onChange={(v: string) => setIntegrations({...integrations, olo_api_key: v})} placeholder="olo_key_..." />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 7 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-bold text-emerald-400 border-b border-gray-800 pb-2">7. Master Architecture Review</h3>
                            
                            <div className="p-8 bg-[#0a0a0a] border border-gray-800 rounded-xl space-y-6">
                                <div className="grid grid-cols-2 gap-8 text-sm">
                                    <div>
                                        <span className="text-gray-500 block mb-1">Target Organization</span>
                                        <span className="text-xl font-bold text-white">{companyName}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block mb-1">Director/CEO</span>
                                        <span className="text-lg text-gray-200">{ceo.first_name} {ceo.last_name} ({ceo.email})</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block mb-1">Total Regional Leadership</span>
                                        <span className="text-lg text-emerald-400">{areaManagers.length} Directors Active</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block mb-1">Physical Store Map</span>
                                        <span className="text-lg text-emerald-400">{stores.length} Retail Locations</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block mb-1">Protein Inventory Dictionary</span>
                                        <span className="text-lg text-emerald-400">{proteins.length} Core Meats</span>
                                    </div>
                                </div>
                                
                                <div className="pt-6 border-t border-gray-800">
                                    <div className="flex items-start gap-3 p-4 bg-yellow-900/10 border border-yellow-900/50 rounded-lg">
                                        <FileSpreadsheet className="w-6 h-6 text-yellow-500 shrink-0" />
                                        <div className="text-gray-300 text-sm">
                                            <p className="font-bold text-yellow-500 mb-1">Sandbox Preview Deployment</p>
                                            <p>Clicking build will generate this complex multi-tenant architecture immediately. The instance will be placed into <span className="text-white font-bold">Sandbox Mode</span> for your QA testing.</p>
                                            <p className="mt-2 text-yellow-600/80 italic">To push LIVE and dispatch the CEO login credentials, you must finalize the SLA using the Contract Generator later.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Footer */}
                    {step < 8 && (
                        <div className="mt-12 flex justify-between items-center pt-6 border-t border-gray-800">
                            {step > 1 ? (
                                <button type="button" onClick={handleBack} className="text-gray-400 hover:text-white px-6 py-3 rounded-lg font-medium transition-colors">
                                    Back
                                </button>
                            ) : <div></div>}
                            
                            {step < 7 ? (
                                <button type="submit" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-emerald-900/40 transition-all">
                                    Next Phase <ArrowRight className="w-5 h-5" />
                                </button>
                            ) : (
                                <button disabled={loading || !companyName} type="submit" className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-yellow-900/40 transition-all text-gray-900">
                                    {loading ? 'Compiling Sandbox...' : 'Deploy Architecture Preview'} 
                                    {!loading && <CheckCircle2 className="w-5 h-5 text-gray-900" />}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Success Screen */}
                    {step === 8 && successPayload && (
                        <div className="text-center py-16 space-y-6 animate-fade-in max-w-2xl mx-auto">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yellow-900/30 mb-4 animate-bounce">
                                <ShieldAlert className="w-12 h-12 text-yellow-500" />
                            </div>
                            <h3 className="text-3xl font-bold text-white">Preview Deployed</h3>
                            <p className="text-yellow-500 text-lg">
                                {companyName} is compiled and awaiting the Final Contract Gate.
                            </p>
                            
                            <div className="mt-8 bg-[#0a0a0a] border border-gray-800 rounded-xl p-8 text-left space-y-6">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-800 pb-2">Instance Details</h4>
                                    <ul className="space-y-3 text-sm text-gray-300 font-mono pl-2 border-l-2 border-yellow-900/50">
                                        <li><strong className="text-white text-xs uppercase mr-2">Tenant ID:</strong> {successPayload.company.id}</li>
                                        <li><strong className="text-white text-xs uppercase mr-2">Subdomain:</strong> {successPayload.company.subdomain}</li>
                                        <li><strong className="text-white text-xs uppercase mr-2">POS Link:</strong> {integrations.pos_provider} (Pending Signature)</li>
                                        <li><strong className="text-white text-xs uppercase mr-2">CEO Status:</strong> Credentials Locked</li>
                                    </ul>
                                </div>
                                
                                <div className="bg-yellow-900/10 border border-yellow-900/50 rounded-lg p-5">
                                    <h5 className="font-bold text-yellow-500 mb-2">Next Step: Finalize Checkout</h5>
                                    <p className="text-gray-400 text-sm">
                                        The architecture is complete. Now, open the <strong>Contract Generator</strong> back at the Dashboard to send the Master SaaS Agreement and SLA to {ceo.first_name}. Once they sign and pay, the CEO credentials will be instantly emailed to them and the Sandbox restrictions will be lifted.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="pt-8">
                                <button type="button" onClick={() => navigate('/partner/dashboard')} className="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-lg font-bold shadow-lg transition-colors">
                                    Return to Command Center & Generate Contract
                                </button>
                            </div>
                        </div>
                    )}

                </form>
            </div>
        </div>
    );
};

// Reusable Input Component (Tailwind inline)
const Input = ({ label, type = 'text', value, onChange, required = false, placeholder = '', step }: any) => (
    <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input 
            title={label}
            type={type} 
            value={value}
            step={step}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            placeholder={placeholder}
            className="w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
        />
    </div>
);
