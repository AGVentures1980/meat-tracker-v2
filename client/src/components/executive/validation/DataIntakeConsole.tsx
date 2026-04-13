import React, { useState } from 'react';
import { Upload, ScanLine, FileText, Image as ImageIcon, DatabaseZap, X } from 'lucide-react';

export const DataIntakeConsole = ({ tenant, storeId, onImportSuccess }: { tenant: string, storeId: string, onImportSuccess: () => void }) => {
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [rawInput, setRawInput] = useState('');
    const [fileName, setFileName] = useState('');
    const [priority, setPriority] = useState('NORMAL');
    const [notes, setNotes] = useState('');
    const [importedItems, setImportedItems] = useState<any[]>([]);

    const isScopeValid = !!tenant && tenant !== 'BRASA Global';

    const handleImport = async (endpoint: string, payload: any) => {
        setLoading(true);
        try {
            const token = JSON.parse(localStorage.getItem('brasameat_user') || '{}')?.token;
            
            // Build fail-closed tracking
            let companyIdHeader = tenant;
            // Map the frontend literal to what the backend expects for tenant ID
            // For now, we pass the literal name as the ID for consistency with UI mock
            if (tenant === 'Terra Gaucha') companyIdHeader = 'terra-gaucha-123'; // Mock mapping if needed or just pass string. 
            // Based on earlier logic, the backend accepts whatever string via X-Company-Id for scoping in datasets, so we pass `tenant`.
            
            const reqPayload = { ...payload, store_id: storeId, priority, validation_notes: notes };

            const res = await fetch(`/api/v1/validation/import/${endpoint}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Company-Id': tenant 
                },
                body: JSON.stringify(reqPayload)
            });

            const data = await res.json();
            if (data.success) {
                // Prepend to our local preview
                setImportedItems(prev => [data.item || data, ...prev]);
                onImportSuccess();
                closeModal();
            } else {
                alert(`Import Failed: ${data.error}`);
            }
        } catch (error: any) {
            alert(`Network Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setActiveModal(null);
        setRawInput('');
        setFileName('');
        setPriority('NORMAL');
        setNotes('');
    };

    const renderModal = () => {
        if (!activeModal) return null;

        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="bg-[#151515] border border-gray-700 w-full max-w-lg rounded-xl p-6 shadow-2xl relative">
                    <button onClick={closeModal} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                    <h2 className="text-xl font-bold mb-4 uppercase text-[#C5A059] border-b border-gray-800 pb-2">
                        {activeModal.replace('_', ' ')} INTAKE
                    </h2>

                    <div className="space-y-4">
                        {(activeModal === 'BARCODE' || activeModal === 'OLO_UPLOAD') && (
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Raw Payload Input</label>
                                <textarea 
                                    className="w-full bg-[#0a0a0a] border border-gray-700 p-3 rounded font-mono text-sm text-gray-300 h-32"
                                    placeholder={activeModal === 'BARCODE' ? "Paste GS1-128 barcode..." : "Paste JSON payload..."}
                                    value={rawInput}
                                    onChange={(e) => setRawInput(e.target.value)}
                                />
                            </div>
                        )}

                        {(activeModal === 'INVOICE_UPLOAD' || activeModal === 'IMAGE_UPLOAD') && (
                            <div>
                                <label className="text-xs text-gray-500 uppercase mb-2 block">Upload File</label>
                                <div className="border-2 border-dashed border-gray-700 p-8 text-center rounded bg-[#0a0a0a] cursor-pointer hover:border-gray-500">
                                    <input type="file" className="hidden" id="file_up" onChange={(e) => {
                                        setFileName(e.target.files?.[0]?.name || '');
                                        setRawInput('mock_file_data_bytes');
                                    }}/>
                                    <label htmlFor="file_up" className="cursor-pointer text-gray-400 font-mono text-sm">
                                        {fileName ? `Attached: ${fileName}` : 'Click to select file...'}
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 uppercase">Priority Rating</label>
                                <select className="w-full bg-[#0a0a0a] border border-gray-700 p-2 rounded" value={priority} onChange={e=>setPriority(e.target.value)}>
                                    <option value="CRITICAL">CRITICAL</option>
                                    <option value="HIGH">HIGH</option>
                                    <option value="NORMAL">NORMAL</option>
                                    <option value="LOW">LOW</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 uppercase">Validation Notes (Audit Trail)</label>
                            <input 
                                type="text"
                                className="w-full bg-[#0a0a0a] border border-gray-700 p-2 rounded text-sm"
                                placeholder="Why is this being logged?"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button onClick={closeModal} className="px-4 py-2 hover:bg-gray-800 rounded text-gray-400">Cancel</button>
                            <button 
                                onClick={() => {
                                    if (activeModal === 'BARCODE') handleImport('barcode', { raw_input: rawInput, expected_output: { source: 'manual' } });
                                    if (activeModal === 'OLO_UPLOAD') handleImport('olo', { raw_input: rawInput, expected_output: { mapping: 'pending' } });
                                    if (activeModal === 'INVOICE_UPLOAD') handleImport('invoice', { file_name: fileName, extracted_text: 'MOCK OCR', expected_output: { total: 0 } });
                                    if (activeModal === 'IMAGE_UPLOAD') handleImport('image', { image_base64: 'base64_mock', expected_output: {} });
                                }} 
                                disabled={loading || !rawInput}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'PARSE & SAVE TO DATASET'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#C5A059] border-b border-gray-800 pb-2">
                <DatabaseZap size={20}/> Data Intake Console
            </h2>

            {!isScopeValid ? (
                <div className="bg-[#FF2A6D]/10 border border-[#FF2A6D]/30 text-[#FF2A6D] p-4 text-sm font-mono flex items-center gap-3">
                    <XCircle size={16}/> FAIL-CLOSED: Intake requires EXPLICIT organization selection. Cannot ingest data globally.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <button onClick={() => setActiveModal('BARCODE')} className="flex flex-col gap-2 items-center justify-center bg-[#151515] p-4 border border-gray-800 hover:border-[#C5A059] rounded transition-all text-gray-300 hover:text-white">
                        <ScanLine size={24} className="text-blue-400"/>
                        <span className="text-xs tracking-wider uppercase font-bold">Barcode Input</span>
                    </button>
                    <button onClick={() => setActiveModal('OLO_UPLOAD')} className="flex flex-col gap-2 items-center justify-center bg-[#151515] p-4 border border-gray-800 hover:border-[#C5A059] rounded transition-all text-gray-300 hover:text-white">
                        <DatabaseZap size={24} className="text-orange-400"/>
                        <span className="text-xs tracking-wider uppercase font-bold">OLO Upload</span>
                    </button>
                    <button onClick={() => setActiveModal('INVOICE_UPLOAD')} className="flex flex-col gap-2 items-center justify-center bg-[#151515] p-4 border border-gray-800 hover:border-[#C5A059] rounded transition-all text-gray-300 hover:text-white">
                        <FileText size={24} className="text-emerald-400"/>
                        <span className="text-xs tracking-wider uppercase font-bold">Invoice / NF Upload</span>
                    </button>
                    <button onClick={() => setActiveModal('IMAGE_UPLOAD')} className="flex flex-col gap-2 items-center justify-center bg-[#151515] p-4 border border-gray-800 hover:border-[#C5A059] rounded transition-all text-gray-300 hover:text-white">
                        <ImageIcon size={24} className="text-purple-400"/>
                        <span className="text-xs tracking-wider uppercase font-bold">Image Upload</span>
                    </button>
                    <button onClick={() => alert('Bulk Import Module coming soon')} className="flex flex-col gap-2 items-center justify-center bg-[#1a1a1a] p-4 border border-gray-700 hover:border-[#00FF94] rounded transition-all text-gray-300 hover:text-white border-dashed">
                        <Upload size={24} className="text-gray-400"/>
                        <span className="text-xs tracking-wider uppercase font-bold">Import Dataset</span>
                    </button>
                </div>
            )}

            {importedItems.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-3">Imported Items Preview</h3>
                    <div className="bg-[#151515] border border-gray-800 rounded">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#222]">
                                <tr className="text-gray-400">
                                    <th className="p-3">Source</th>
                                    <th className="p-3">Tenant Scope</th>
                                    <th className="p-3 font-mono">Raw Summary</th>
                                    <th className="p-3">Priority</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {importedItems.map((item, i) => (
                                    <tr key={i} className="border-t border-gray-800">
                                        <td className="p-3 text-emerald-400 uppercase font-mono text-xs">{item.source_type || 'Unknown'}</td>
                                        <td className="p-3">{item.tenant_id}</td>
                                        <td className="p-3 text-gray-500 font-mono text-xs truncate max-w-[200px]">{item.raw_input}</td>
                                        <td className="p-3"><span className="bg-[#333] px-2 py-1 rounded text-xs">{item.priority || 'NORMAL'}</span></td>
                                        <td className="p-3"><span className="text-blue-400 border border-blue-400/30 bg-blue-400/10 px-2 py-1 rounded text-xs">SAVED</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {renderModal()}
        </div>
    );
};
