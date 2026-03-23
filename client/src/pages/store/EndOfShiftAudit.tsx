import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Calculator, 
  Scale, 
  AlertOctagon, 
  FileCheck2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EndOfShiftAudit() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mocked state from the backend for the day's operations
  const [totalBoxesPulledLbs] = useState(380.5); 
  const [totalSoldLbs] = useState(295.0); // Derived from POS

  const [totalScrapsWeighedLbs, setTotalScrapsWeighedLbs] = useState<string>('');
  
  const [auditResult, setAuditResult] = useState<{
    calculatedYieldLbs: number;
    unaccountedLbs: number;
    variancePct: number;
    status: 'PASS' | 'FAIL' | 'REVIEW';
  } | null>(null);

  const calculateGhostMath = () => {
    const scraps = parseFloat(totalScrapsWeighedLbs);
    if (isNaN(scraps) || scraps < 0) {
      alert("Enter a valid weight for the total fat and scraps.");
      return;
    }

    // Ghost Math Calculation
    const calculatedYieldLbs = totalBoxesPulledLbs - scraps;
    
    // Variance: Usable Meat vs Sold Meat
    // If we yielded 300lbs, but only sold 295lbs, we have 5lbs unaccounted for (Steak dropped on floor? Over-portioning? Theft?)
    const unaccountedLbs = calculatedYieldLbs - totalSoldLbs;
    const variancePct = (unaccountedLbs / totalBoxesPulledLbs) * 100;

    let status: 'PASS' | 'FAIL' | 'REVIEW' = 'PASS';
    if (variancePct > 5) status = 'FAIL'; // More than 5% of the total box weights went missing
    else if (variancePct > 2) status = 'REVIEW'; // 2-5% variance requires manager explanation

    setAuditResult({
      calculatedYieldLbs,
      unaccountedLbs,
      variancePct,
      status
    });

    // alert("Audit Calculated");
  };

  const lockShift = async () => {
    if (!auditResult) return;

    try {
      const response = await fetch(`/api/v1/yield/${user?.storeId}/ghost-math`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          calculatedYieldLbs: auditResult.calculatedYieldLbs,
          unaccountedLbs: auditResult.unaccountedLbs,
          variancePct: auditResult.variancePct,
          status: auditResult.status
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record Ghost Math');
      }

      alert("Shift Closed and Ghost Math Recorded!");
      navigate('/command-center');
    } catch (error) {
      console.error(error);
      alert('Failed to lock shift and record audit.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-900/40 to-neutral-900 border border-red-500/20 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center tracking-tight">
              <AlertOctagon className="w-8 h-8 mr-3 text-red-500" />
              End of Shift Audit
            </h1>
            <p className="text-neutral-400 mt-2 text-lg">Catastrophic Fail-Safe & Ghost Math Reconciliation</p>
          </div>
          <div className="bg-red-500/10 text-red-400 px-4 py-2 rounded-lg border border-red-500/20 font-mono text-sm uppercase font-bold text-center">
            MANAGER REQUIRED
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* System Data (Knowns) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 space-y-6">
          <h2 className="text-xl font-bold flex items-center text-white border-b border-neutral-800 pb-4">
            <Calculator className="w-6 h-6 mr-3 text-indigo-400" />
            System Verified Data
          </h2>
          
          <div className="space-y-4">
            <div className="bg-black border border-neutral-800 rounded-2xl p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-neutral-500 uppercase tracking-widest font-bold mb-1">Total GS1 Boxes Pulled</p>
                <p className="text-xs text-neutral-600">From Pull-To-Prep Scanners</p>
              </div>
              <p className="text-3xl font-black text-white">{totalBoxesPulledLbs.toFixed(1)} <span className="text-sm text-neutral-500">lbs</span></p>
            </div>

            <div className="bg-black border border-neutral-800 rounded-2xl p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-neutral-500 uppercase tracking-widest font-bold mb-1">Total Sales Yield</p>
                <p className="text-xs text-neutral-600">From POS / OLO Integrations</p>
              </div>
              <p className="text-3xl font-black text-indigo-400">{totalSoldLbs.toFixed(1)} <span className="text-sm text-neutral-500">lbs</span></p>
            </div>
          </div>
        </div>

        {/* Input & Calculation (The Unknowns) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 space-y-6">
          <h2 className="text-xl font-bold flex items-center text-white border-b border-neutral-800 pb-4">
            <Scale className="w-6 h-6 mr-3 text-emerald-400" />
            Physical Verification
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm text-neutral-400 uppercase tracking-widest font-bold mb-3">
                Total Fat/Scraps Weighed (Lbs)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={totalScrapsWeighedLbs}
                  onChange={(e) => setTotalScrapsWeighedLbs(e.target.value)}
                  placeholder="e.g. 80.5"
                  className="w-full bg-black border-2 border-neutral-800 rounded-2xl p-6 text-4xl font-medium text-white placeholder-neutral-700 focus:border-red-500 focus:ring-0 outline-none transition-colors"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-600 font-bold text-xl">LBS</div>
              </div>
              <p className="text-xs text-neutral-500 mt-2">Dump all trim buckets on the main scale and enter the total.</p>
            </div>

            <button
              onClick={calculateGhostMath}
              className="w-full bg-red-600 hover:bg-red-700 text-white p-6 rounded-2xl font-black text-xl tracking-wider uppercase transition-colors flex justify-center items-center shadow-lg shadow-red-900/20"
            >
              Execute Ghost Math Reconciliation
            </button>
          </div>
        </div>

      </div>

      {/* Audit Results Overlay */}
      {auditResult && (
        <div className="bg-black border border-neutral-800 rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
          <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-widest flex items-center">
            <FileCheck2 className="w-6 h-6 mr-3" /> Result Analysis
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
              <p className="text-sm text-neutral-500 uppercase tracking-widest font-bold mb-2">Theoretical Yield</p>
              <p className="text-3xl font-black text-white">{auditResult.calculatedYieldLbs.toFixed(1)} <span className="text-base text-neutral-500 font-bold">lbs</span></p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
              <p className="text-sm text-neutral-500 uppercase tracking-widest font-bold mb-2">Unaccounted Meat</p>
              <p className={`text-3xl font-black ${auditResult.unaccountedLbs > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {auditResult.unaccountedLbs > 0 ? '+' : ''}{auditResult.unaccountedLbs.toFixed(1)} <span className="text-base text-neutral-500 font-bold">lbs</span>
              </p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
               <p className="text-sm text-neutral-500 uppercase tracking-widest font-bold mb-2">Variance %</p>
               <p className={`text-3xl font-black ${
                  auditResult.status === 'PASS' 
                    ? 'text-emerald-500' 
                    : auditResult.status === 'REVIEW' ? 'text-amber-500' : 'text-red-500'
               }`}>
                 {auditResult.variancePct.toFixed(1)}%
               </p>
            </div>
          </div>

          <div className={`p-6 rounded-2xl border flex items-start gap-4 ${
            auditResult.status === 'PASS' 
              ? 'bg-emerald-500/10 border-emerald-500/20' 
              : auditResult.status === 'REVIEW' 
                ? 'bg-amber-500/10 border-amber-500/20' 
                : 'bg-red-500/10 border-red-500/20'
          }`}>
             <div className="mt-1">
               {auditResult.status === 'PASS' && <FileCheck2 className="w-8 h-8 text-emerald-500" />}
               {auditResult.status === 'REVIEW' && <AlertOctagon className="w-8 h-8 text-amber-500" />}
               {auditResult.status === 'FAIL' && <AlertOctagon className="w-8 h-8 text-red-500 animate-pulse" />}
             </div>
             <div>
               <h3 className={`text-xl font-black uppercase tracking-wider mb-2 ${
                  auditResult.status === 'PASS' ? 'text-emerald-500' : auditResult.status === 'REVIEW' ? 'text-amber-500' : 'text-red-500'
               }`}>
                 {auditResult.status === 'PASS' ? 'Shift Verified OK' : auditResult.status === 'REVIEW' ? 'Manager Review Required' : 'Critical Failure Detected'}
               </h3>
               <p className="text-white opacity-80 leading-relaxed font-medium">
                 {auditResult.status === 'PASS' && "The ghost math checks out. The combination of scrapped fat and sold meat closely matches the primal boxes pulled."}
                 {auditResult.status === 'REVIEW' && "There is a slight discrepancy in the numbers indicating minor over-portioning or unlogged floor drops. Please note this in the shift log."}
                 {auditResult.status === 'FAIL' && "UNACCEPTABLE VARIANCE. A significant amount of meat is missing. This indicates severe over-portioning, theft, or catastrophic unlogged waste. Central intelligence has been notified."}
               </p>

               {auditResult.status !== 'PASS' && (
                  <div className="mt-4">
                    <input 
                      type="text" 
                      placeholder="Enter discrepancy explanation here..." 
                      className="w-full bg-black/50 border border-neutral-700/50 rounded-xl p-4 text-white placeholder-neutral-500 focus:border-white focus:ring-0 outline-none"
                    />
                  </div>
               )}

             </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={lockShift}
              className="bg-white hover:bg-neutral-200 text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-colors flex items-center"
            >
              <Lock className="w-4 h-4 mr-2" /> Lock Shift & Finalize
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
