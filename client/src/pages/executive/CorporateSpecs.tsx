import React, { useState, useEffect } from 'react';
import { Network, Search, Plus, ShieldCheck, Box, Barcode, Trash2, ShieldAlert } from 'lucide-react';

interface CorporateSpec {
  id: string;
  protein_name: string;
  approved_brand: string;
  approved_item_code: string;
  created_at: string;
}

export default function CorporateSpecs() {
  const [specs, setSpecs] = useState<CorporateSpec[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    protein_name: '',
    approved_brand: '',
    approved_item_code: ''
  });

  // Example User ID/Company constraint. In a real app we derive companyId from the logged in user context.
  const userCompanyId = "texas-de-brazil-demo"; 

  // Mock Fetching on Load
  useEffect(() => {
    // In production: fetch(`/api/v1/compliance/specs/${userCompanyId}`)
    setSpecs([
      {
        id: '1',
        protein_name: 'Picanha / Sirloin Cap',
        approved_brand: 'Swift Black',
        approved_item_code: '4580211',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        protein_name: 'Beef Tenderloin (Filet Mignon)',
        approved_brand: 'Omaha Steaks',
        approved_item_code: '8820023',
        created_at: new Date().toISOString()
      }
    ]);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Optimistic UI Update
    const newSpec: CorporateSpec = {
      id: Math.random().toString(),
      protein_name: formData.protein_name,
      approved_brand: formData.approved_brand,
      approved_item_code: formData.approved_item_code,
      created_at: new Date().toISOString()
    };
    
    setSpecs([newSpec, ...specs]);
    setIsModalOpen(false);
    setFormData({ protein_name: '', approved_brand: '', approved_item_code: '' });

    // In production: POST /api/v1/compliance/specs
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

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 glass-effect">
          <div className="flex items-center gap-4 text-rose-400 mb-4">
            <div className="bg-rose-400/10 p-3 rounded-lg">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-200">Bait & Switch Prevented</h3>
          </div>
          <p className="text-3xl font-bold text-white">0</p>
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
                <th className="px-6 py-4">Locked Item Barcode</th>
                <th className="px-6 py-4">Status & Sync</th>
                <th className="px-6 py-4 text-right rounded-tr-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {specs.map((spec) => (
                <tr key={spec.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-200">
                    {spec.protein_name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-900/50 px-3 py-1 rounded-md border border-slate-700">{spec.approved_brand}</span>
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
                    <button className="text-slate-400 hover:text-rose-400 transition-colors p-2 hover:bg-rose-500/10 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {specs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No approved specifications locked in yet. Click "Add Corporate Spec" to begin.
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
                <label className="block text-sm font-medium text-slate-300 mb-1">Master Item Barcode (GS1-128 / UPC)</label>
                <input
                  type="text"
                  required
                  placeholder="Scan or type code (e.g., 4964367)"
                  value={formData.approved_item_code}
                  onChange={(e) => setFormData({ ...formData, approved_item_code: e.target.value })}
                  className="w-full bg-slate-900 border border-emerald-500/50 text-emerald-400 font-mono text-lg rounded-lg px-4 py-3 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-5 h-5" />
                  Lock Spec to 57 Stores
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
