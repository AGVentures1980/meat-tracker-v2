import React, { useState, useEffect } from 'react';
import { Network, Search, Plus, ShieldCheck, Box, Barcode, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface CorporateSpec {
  id: string;
  protein_name: string;
  approved_brand: string;
  supplier: string | null;
  approved_item_code: string;
  created_at: string;
  cost_per_lb?: number;
}

export default function CorporateSpecs() {
  const { user, selectedCompany } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
      const isDavid = user?.email?.toLowerCase().includes('davidcastro');
      const isMaster = user?.email?.toLowerCase().includes('alexandre@alexgarciaventures.co') || user?.email?.toLowerCase().includes('admin');
      if (user && !isDavid && !isMaster) {
          navigate('/dashboard', { replace: true });
      }
  }, [user, navigate]);

  const [specs, setSpecs] = useState<CorporateSpec[]>([]);
  const [preventedCount, setPreventedCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBaitModalOpen, setIsBaitModalOpen] = useState(false);
  const [preventedAttempts, setPreventedAttempts] = useState<any[]>([]);
  const [isFetchingAttempts, setIsFetchingAttempts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    protein_name: '',
    approved_brand: '',
    supplier: '',
    approved_item_code: '',
    cost_per_lb: ''
  });
  const [isCopilotActive, setIsCopilotActive] = useState(false);
  const [isAgentSearching, setIsAgentSearching] = useState(false);

  const activeCompanyId = selectedCompany || user?.companyId || 'tdb-main';

  useEffect(() => {
      const barcodeString = formData.approved_item_code;
      if (!barcodeString) {
          setIsCopilotActive(false);
          setIsAgentSearching(false);
          return;
      }

      const timeoutId = setTimeout(async () => {
          let cleanBarcode = barcodeString.replace(/[\(\)\[\]\s]/g, '');
          if (cleanBarcode.length < 8) {
              setIsCopilotActive(false);
              return;
          }

          // NZ Proprietary Decoupling (Match ReceivingScanner.tsx)
          const customSyscoMatch = cleanBarcode.match(/^(\d{8})(\d{4})(\d{10})(.+)$/);
          const nzProprietaryMatch = cleanBarcode.match(/^(\d{8})(\d{4})(00\d{2})(\d{6})$/);
          const targetProprietary = customSyscoMatch ? customSyscoMatch[3] : (nzProprietaryMatch ? nzProprietaryMatch[3] : null);
          
          if (targetProprietary && targetProprietary.startsWith('00')) {
               const plantId = parseInt(targetProprietary.substring(0, 4), 10);
               cleanBarcode = `NZ-ME${plantId}`;
          }

          let requiresAgent = false;
          const gtinMatch = cleanBarcode.match(/(01|02)(\d{14})/);
          if (cleanBarcode.length >= 14 || gtinMatch) {
              requiresAgent = true;
          }

          // If it doesn't meet criteria to go to the Agent, just update state directly
          if (!requiresAgent && cleanBarcode !== formData.approved_item_code) {
               setFormData(prev => ({
                   ...prev,
                   approved_item_code: cleanBarcode
               }));
          }

          if (requiresAgent) {
              setIsAgentSearching(true);
              setIsCopilotActive(false);
              
              // Call the Global SaaS Agent Intelligence API
              try {
                  const res = await fetch(`/api/v1/intelligence/resolve-gtin?gtin=${encodeURIComponent(cleanBarcode)}`, {
                      headers: { 'Authorization': `Bearer ${user?.token}` }
                  });
                  const data = await res.json();
                  
                  if (data.success && data.found) {
                      setFormData(prev => ({
                          ...prev,
                          approved_item_code: data.extracted_gtin || cleanBarcode,
                          protein_name: data.protein_name,
                          approved_brand: data.brand
                      }));
                      setIsCopilotActive(true);
                  } else {
                      setFormData(prev => ({
                          ...prev,
                          protein_name: 'AI Pending: Manual Verification Required',
                          approved_brand: `Unknown Packer`,
                          approved_item_code: cleanBarcode // Fallback to raw if logic fails
                      }));
                      setIsCopilotActive(false);
                  }
              } catch (e) {
                  setFormData(prev => ({
                      ...prev,
                      protein_name: 'AI Pending: Manual Verification Required',
                      approved_brand: `API Timeout: Unknown Packer`,
                      approved_item_code: cleanBarcode
                  }));
              } finally {
                  setIsAgentSearching(false);
              }
          }
      }, 500); // 500ms debounce to give the user time to finish scanning

      return () => clearTimeout(timeoutId);
  }, [formData.approved_item_code]); // removed isCopilotActive to prevent infinite loop

  const fetchSpecs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/compliance/specs/${activeCompanyId}`, {
        headers: {
            'Authorization': `Bearer ${user?.token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSpecs(data.specs || []);
        if (data.preventedCount !== undefined) {
          setPreventedCount(data.preventedCount);
        }
      }
    } catch (error) {
      console.error('Error fetching specs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPreventedAttempts = async () => {
    setIsFetchingAttempts(true);
    setIsBaitModalOpen(true);
    try {
      const res = await fetch(`/api/v1/compliance/prevented-attempts/${activeCompanyId}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPreventedAttempts(data.attempts || []);
      }
    } catch (error) {
      console.error('Error fetching attempts:', error);
    } finally {
      setIsFetchingAttempts(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
        fetchSpecs();
    }
  }, [user?.token, activeCompanyId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
        const res = await fetch('/api/v1/compliance/specs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user?.token}`
            },
            body: JSON.stringify({
                company_id: activeCompanyId,
                protein_name: formData.protein_name,
                approved_brand: formData.approved_brand,
                supplier: formData.supplier || null,
                approved_item_code: formData.approved_item_code,
                created_by: `${user?.first_name} ${user?.last_name}`
            })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            setSpecs([data.spec, ...specs]);
            setIsModalOpen(false);
            setFormData({ protein_name: '', approved_brand: '', supplier: '', approved_item_code: '', cost_per_lb: '' });
        } else {
            alert('Failed to save compliance spec.');
        }
    } catch (error) {
        console.error('Error saving spec:', error);
    } finally {
        setIsSaving(false);
    }
  };

  const filteredSpecs = specs.filter(spec => 
    spec.protein_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    spec.approved_item_code.includes(searchTerm) ||
    spec.approved_brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (spec.supplier && spec.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this specification? Deliveries using this barcode will no longer be auto-approved.')) return;

    try {
        const res = await fetch(`/api/v1/compliance/specs/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${user?.token}`
            }
        });

        const data = await res.json();
        if (res.ok && data.success) {
            setSpecs(specs.filter(s => s.id !== id));
        } else {
            alert(data.error || 'Failed to delete specification.');
        }
    } catch (error) {
        console.error('Error deleting spec:', error);
        alert('Network error deleting spec.');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
            Corporate Protein & Barcode Standards
          </h1>
          <p className="text-slate-400 mt-2 max-w-2xl">
            Lock in the exact brand and GS1-128 barcode specifications for all high-value proteins. 
            Deliveries matching these item codes will be securely auto-approved at the loading dock.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        >
          <Plus className="w-5 h-5" />
          Add Corporate Spec
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 glass-effect">
          <div className="flex items-center gap-4 text-emerald-400 mb-4">
            <div className="bg-emerald-400/10 p-3 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-200">Active Specs</h3>
          </div>
          <p className="text-3xl font-bold text-white">{specs.length}</p>
          <p className="text-sm text-slate-400 mt-1">Locked Network Standards</p>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 glass-effect">
          <div className="flex items-center gap-4 text-blue-400 mb-4">
            <div className="bg-blue-400/10 p-3 rounded-lg">
              <Network className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-200">Stores Compliant</h3>
          </div>
          <p className="text-3xl font-bold text-white">100%</p>
          <p className="text-sm text-slate-400 mt-1">Enforced across 57 locations</p>
        </div>

        <div 
          onClick={fetchPreventedAttempts}
          className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 glass-effect cursor-pointer hover:border-rose-500/50 transition-all group"
        >
          <div className="flex items-center gap-4 text-rose-400 mb-4">
            <div className="bg-rose-400/10 p-3 rounded-lg group-hover:bg-rose-500/20 transition-colors">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-200">Bait & Switch Prevented</h3>
          </div>
          <p className="text-3xl font-bold text-white group-hover:text-rose-100 transition-colors">{preventedCount}</p>
          <p className="text-sm text-slate-400 mt-1">Unauthorized attempts</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden glass-effect">
        <div className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/60">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Box className="w-5 h-5 text-slate-400" />
            Locked Inventory Specifications
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search protein or item code..."
              className="bg-slate-900/50 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-64 pl-10 p-2.5 transition-colors placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900/30">
              <tr>
                <th className="px-6 py-4 rounded-tl-lg">Protein Category</th>
                <th className="px-6 py-4">Approved Brand / Packer</th>
                <th className="px-6 py-4">Authorized Supplier</th>
                <th className="px-6 py-4">Max Price / Lb</th>
                <th className="px-6 py-4">Locked Item Barcode</th>
                <th className="px-6 py-4">Status & Sync</th>
                <th className="px-6 py-4 text-right rounded-tr-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin mb-4 text-emerald-500" />
                    Loading Corporate Specs...
                  </td>
                </tr>
              ) : filteredSpecs.map((spec) => (
                <tr key={spec.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-200">
                    {spec.protein_name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-900/50 px-3 py-1 rounded-md border border-slate-700">{spec.approved_brand}</span>
                  </td>
                  <td className="px-6 py-4">
                    {spec.supplier ? (
                      <span className="bg-slate-800 px-3 py-1 rounded-md border border-slate-600 text-slate-300">{spec.supplier}</span>
                    ) : (
                      <span className="text-slate-500 italic text-xs">Direct / Any</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                    {spec.cost_per_lb ? `$${spec.cost_per_lb.toFixed(2)}` : '--'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-mono text-emerald-400 bg-emerald-900/20 px-3 py-1 rounded-md w-fit border border-emerald-900/50">
                      <Barcode className="w-4 h-4" />
                      {spec.approved_item_code}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      Synced to 57 Stores
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(spec.id)}
                      className="text-slate-400 hover:text-rose-400 transition-colors p-2 hover:bg-rose-500/10 rounded-lg"
                      title="Delete specification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredSpecs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    {searchTerm ? "No specs match your search." : "No approved specifications locked in yet. Click \"Add Corporate Spec\" to begin."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Barcode className="w-6 h-6 text-emerald-500" />
              Lock New Standard
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Enter the exact item code/barcode from your master supplier invoice. All stores will immediately reject deliveries that do not match this spec.
            </p>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Generic Protein Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Pork Rib St. Louis 2.75# Down"
                  value={formData.protein_name}
                  onChange={(e) => setFormData({ ...formData, protein_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Approved Packer / Brand</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Farmland Foods"
                  value={formData.approved_brand}
                  onChange={(e) => setFormData({ ...formData, approved_brand: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Authorized Supplier <span className="text-slate-500 font-normal">(Optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g., Sysco, US Foods..."
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Max Contract Price ($/lb)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g., 3.45"
                  value={formData.cost_per_lb}
                  onChange={(e) => setFormData({ ...formData, cost_per_lb: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Master Item Barcode (GS1-128 / UPC)</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Scan or type code (e.g., 4964367)"
                  value={formData.approved_item_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, approved_item_code: e.target.value }))}
                  className="w-full bg-slate-900 border border-emerald-500/50 text-emerald-400 font-mono text-lg rounded-lg px-4 py-3 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                />
              </div>

              {isAgentSearching && (
                <div className="bg-slate-800 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-3 animate-pulse">
                  <div className="bg-slate-700 p-2 rounded-full">
                     <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  </div>
                  <div>
                     <p className="text-emerald-400 text-sm font-bold m-0 leading-tight">Agent Searching Global Network...</p>
                     <p className="text-slate-400 text-xs m-0 mt-0.5 leading-tight">Querying Brasa Meat Intelligence Graph</p>
                  </div>
                </div>
              )}

              {isCopilotActive && (
                <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-3 animate-fade-in">
                  <div className="bg-emerald-500/20 p-2 rounded-full">
                     <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                     <p className="text-emerald-400 text-sm font-bold m-0 leading-tight">Copilot Auto-Detected!</p>
                     <p className="text-slate-300 text-xs m-0 mt-0.5 leading-tight">GS1-128 successfully decoded. Please verify the protein details before saving.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                      setIsModalOpen(false);
                      setIsCopilotActive(false);
                      setFormData({ protein_name: '', approved_brand: '', supplier: '', approved_item_code: '', cost_per_lb: '' });
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 text-white px-4 py-3 rounded-lg font-medium transition-colors shadow-lg flex items-center justify-center gap-2 ${isCopilotActive ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                >
                  <ShieldCheck className="w-5 h-5" />
                  {isCopilotActive ? 'Confirm Copilot Analysis' : 'Lock Spec to 57 Stores'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bait and Switch Prevented Details Modal */}
      {isBaitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-5xl w-full shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                      <ShieldAlert className="w-6 h-6 text-rose-500" />
                      Unauthorized Receiving Attempts (Bait & Switch)
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">
                      Detailed log of all deliveries rejected by the scanner engine across the fleet.
                    </p>
                </div>
                <button
                    onClick={() => setIsBaitModalOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                >
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">X</div>
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {isFetchingAttempts ? (
                    <div className="py-12 text-center text-slate-400">
                        <Loader2 className="w-8 h-8 mx-auto animate-spin mb-4 text-emerald-500" />
                        Pulling Security Logs...
                    </div>
                ) : preventedAttempts.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                        No unauthorized attempts logged in this company.
                    </div>
                ) : (
                    <table className="w-full text-sm text-left text-slate-300">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-900/30 sticky top-0 backdrop-blur-md">
                        <tr>
                          <th className="px-4 py-4 rounded-tl-lg">Date & Time</th>
                          <th className="px-4 py-4">Store Location</th>
                          <th className="px-4 py-4">Analyzed Meat Identity</th>
                          <th className="px-4 py-4">Extracted Supplier</th>
                          <th className="px-4 py-4">Weight / Lot</th>
                          <th className="px-4 py-4 rounded-tr-lg">Intercepted Raw Barcode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {preventedAttempts.map((attempt) => (
                           <tr key={attempt.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-4 font-mono text-xs">
                                  {new Date(attempt.scanned_at).toLocaleString()}
                              </td>
                              <td className="px-4 py-4 font-medium text-slate-200">
                                  {attempt.store?.store_name}
                              </td>
                              <td className="px-4 py-4">
                                  <span className="text-rose-400 font-semibold">{attempt.protein_name || "Unidentified Protein"}</span>
                              </td>
                              <td className="px-4 py-4">
                                  <span className="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">{attempt.supplier || "Supplier Unknown"}</span>
                              </td>
                              <td className="px-4 py-4">
                                  <div className="flex flex-col gap-1">
                                      {attempt.weight && <span className="text-slate-300">{attempt.weight.toFixed(2)} LBS</span>}
                                      {attempt.metadata?.serial && <span className="text-xs text-slate-500 font-mono">L/N: {attempt.metadata.serial}</span>}
                                  </div>
                              </td>
                              <td className="px-4 py-4 max-w-[200px] truncate">
                                  <div className="font-mono text-rose-500/80 bg-rose-500/10 px-2 py-1 rounded w-fit border border-rose-500/20 text-xs">
                                      {attempt.scanned_barcode}
                                  </div>
                              </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
