import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Scale, 
  Scissors, 
  CheckCircle2, 
  AlertTriangle,
  ArrowLeft,
  Settings2,
  ListRestart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type Tab = 'YIELD' | 'PORTION';

export default function MeatYieldStation() {
  const navigate = useNavigate();
  const { selectedCompany } = useAuth();
  
  const [activeTab, setActiveTab] = useState<Tab>('YIELD');

  // Yield State
  const [boxWeight, setBoxWeight] = useState<string>('');
  const [scrapWeight, setScrapWeight] = useState<string>('');
  const [yieldResult, setYieldResult] = useState<{ pct: number, status: 'GOOD' | 'WARN' | 'BAD' } | null>(null);

  // Portion State
  const [targetOz, setTargetOz] = useState<string>('6.0');
  const [actualOz, setActualOz] = useState<string>('');
  const [portionResult, setPortionResult] = useState<{ variance: number, status: 'GOOD' | 'WARN' | 'BAD' } | null>(null);

  const calculateYield = () => {
    const box = parseFloat(boxWeight);
    const scrap = parseFloat(scrapWeight);
    
    if (isNaN(box) || isNaN(scrap) || box <= 0) {
      alert('Please enter valid weights');
      return;
    }

    if (scrap >= box) {
      alert('Scrap cannot be greater than box weight');
      return;
    }

    const netYield = box - scrap;
    const pct = (netYield / box) * 100;
    
    let status: 'GOOD' | 'WARN' | 'BAD' = 'GOOD';
    if (pct < 80) status = 'BAD';
    else if (pct < 85) status = 'WARN';

    setYieldResult({ pct, status });
    // alert('Yield Calculated');
  };

  const calculatePortion = () => {
    const target = parseFloat(targetOz);
    const actual = parseFloat(actualOz);

    if (isNaN(target) || isNaN(actual) || target <= 0) {
      alert('Please enter valid ounces');
      return;
    }

    const variance = actual - target;
    const absVariance = Math.abs(variance);

    let status: 'GOOD' | 'WARN' | 'BAD' = 'GOOD';
    if (absVariance > 0.3) status = 'BAD';       // Over 0.3oz variance is bad
    else if (absVariance > 0.1) status = 'WARN'; // Between 0.1 and 0.3 is warning

    setPortionResult({ variance, status });
  };

  const getStatusColor = (status?: 'GOOD' | 'WARN' | 'BAD') => {
    switch (status) {
      case 'GOOD': return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'WARN': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      case 'BAD': return 'text-red-500 bg-red-500/10 border-red-500/30';
      default: return 'text-neutral-400 bg-neutral-800 border-neutral-700';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 select-none">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-4 hover:bg-neutral-800 rounded-xl transition-colors bg-neutral-950 border border-neutral-800"
            >
              <ArrowLeft className="w-8 h-8 text-neutral-400" />
            </button>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white mb-1">Yield Station</h1>
              <p className="text-lg text-neutral-400 font-medium">Butcher Accountability & Diagnostics</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <div className="bg-indigo-500/10 text-indigo-400 px-6 py-3 rounded-xl border border-indigo-500/20 flex items-center space-x-3">
              <Scale className="w-6 h-6" />
              <span className="font-bold text-lg tracking-wider">A LA CARTE MODE</span>
            </div>
          </div>
        </div>

        {/* Giant Tabs */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setActiveTab('YIELD')}
            className={`p-8 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
              activeTab === 'YIELD' 
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_30px_rgba(79,70,229,0.3)]' 
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            <Scissors className={`w-12 h-12 mb-4 ${activeTab === 'YIELD' ? 'text-white' : 'text-neutral-500'}`} />
            <span className="text-2xl font-bold">1. Box Yield Log</span>
            <span className="text-sm mt-2 opacity-80">Fat & Scraps vs Primal Weight</span>
          </button>

          <button
            onClick={() => setActiveTab('PORTION')}
            className={`p-8 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
              activeTab === 'PORTION' 
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_30px_rgba(5,150,105,0.3)]' 
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            <Scale className={`w-12 h-12 mb-4 ${activeTab === 'PORTION' ? 'text-white' : 'text-neutral-500'}`} />
            <span className="text-2xl font-bold">2. Portion Audit</span>
            <span className="text-sm mt-2 opacity-80">Steak Weight Variance Check</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-8 shadow-2xl">
          
          {activeTab === 'YIELD' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xl font-bold text-neutral-300">Total Box Weight (Lbs)</label>
                  <input
                    type="number"
                    value={boxWeight}
                    onChange={(e) => setBoxWeight(e.target.value)}
                    placeholder="e.g. 64.5"
                    className="w-full bg-black border-2 border-neutral-800 rounded-2xl p-6 text-4xl font-medium text-white placeholder-neutral-700 focus:border-indigo-500 focus:ring-0 outline-none transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xl font-bold text-neutral-300">Total Fat & Scraps (Lbs)</label>
                  <input
                    type="number"
                    value={scrapWeight}
                    onChange={(e) => setScrapWeight(e.target.value)}
                    placeholder="e.g. 12.2"
                    className="w-full bg-black border-2 border-neutral-800 rounded-2xl p-6 text-4xl font-medium text-white placeholder-neutral-700 focus:border-red-500 focus:ring-0 outline-none transition-colors"
                  />
                </div>

                <button 
                  onClick={calculateYield}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-2xl py-6 rounded-2xl transition-colors shadow-lg active:scale-[0.98]"
                >
                  Calculate Net Yield
                </button>
              </div>

              {/* Yield Results Display */}
              <div className="bg-black rounded-3xl border border-neutral-800 p-8 flex flex-col items-center justify-center text-center">
                {yieldResult ? (
                  <div className="space-y-6 w-full animate-in fade-in zoom-in-95 duration-300">
                    <h3 className="text-2xl font-bold text-neutral-400 uppercase tracking-widest">Net Usable Yield</h3>
                    <div className={`text-7xl font-black py-12 rounded-3xl border-4 ${getStatusColor(yieldResult.status)}`}>
                      {yieldResult.pct.toFixed(1)}%
                    </div>
                    
                    {yieldResult.status === 'BAD' && (
                      <div className="bg-red-500/20 text-red-400 p-4 rounded-xl flex items-center justify-center space-x-3 border border-red-500/30">
                        <AlertTriangle className="w-8 h-8" />
                        <span className="text-xl font-bold">Unacceptable Yield. Manager Alerted.</span>
                      </div>
                    )}
                    {yieldResult.status === 'GOOD' && (
                      <div className="bg-green-500/20 text-green-400 p-4 rounded-xl flex items-center justify-center space-x-3 border border-green-500/30">
                        <CheckCircle2 className="w-8 h-8" />
                        <span className="text-xl font-bold">Excellent Yield!</span>
                      </div>
                    )}

                    <button className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xl py-4 rounded-xl transition-colors">
                      Log Result & Clear
                    </button>
                  </div>
                ) : (
                  <div className="text-neutral-600 flex flex-col items-center space-y-4">
                    <Settings2 className="w-24 h-24 mb-4 opacity-50" />
                    <p className="text-2xl font-medium">Awaiting Data Input...</p>
                    <p className="text-lg text-neutral-500">Enter weights to calculate yield.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'PORTION' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                
                <div className="space-y-3">
                  <label className="text-xl font-bold text-neutral-300 flex items-center justify-between">
                    Target Portion (Ounces)
                    <span className="text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg text-sm">Spec: +/- 0.1oz</span>
                  </label>
                  <select
                    value={targetOz}
                    onChange={(e) => setTargetOz(e.target.value)}
                    className="w-full bg-black border-2 border-neutral-800 rounded-2xl p-6 text-4xl font-medium text-white focus:border-emerald-500 focus:ring-0 outline-none appearance-none"
                    title="Target Portion"
                  >
                    <option value="6.0">6 oz (Sirloin / Filet)</option>
                    <option value="8.0">8 oz (Sirloin)</option>
                    <option value="11.0">11 oz (Bone-in)</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-xl font-bold text-neutral-300">Actual Sample Weight (Ounces)</label>
                  <input
                    type="number"
                    value={actualOz}
                    onChange={(e) => setActualOz(e.target.value)}
                    placeholder="e.g. 6.2"
                    step="0.1"
                    className="w-full bg-black border-2 border-neutral-800 rounded-2xl p-6 text-4xl font-medium text-white placeholder-neutral-700 focus:border-emerald-500 focus:ring-0 outline-none transition-colors"
                  />
                  <div className="grid grid-cols-5 gap-2 pt-2">
                    {[5.8, 5.9, 6.0, 6.1, 6.2].map(num => (
                      <button 
                        key={num}
                        onClick={() => setActualOz(num.toString())}
                        className="bg-neutral-800 hover:bg-neutral-700 text-lg font-bold py-4 rounded-xl text-neutral-300"
                      >
                        {num.toFixed(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={calculatePortion}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-2xl py-6 rounded-2xl transition-colors shadow-lg active:scale-[0.98]"
                >
                  Verify Variance
                </button>
              </div>

              {/* Portion Results Display */}
              <div className="bg-black rounded-3xl border border-neutral-800 p-8 flex flex-col items-center justify-center text-center">
                {portionResult ? (
                  <div className="space-y-6 w-full animate-in fade-in zoom-in-95 duration-300">
                    <h3 className="text-2xl font-bold text-neutral-400 uppercase tracking-widest">Weight Variance</h3>
                    <div className={`text-7xl font-black py-12 rounded-3xl border-4 ${getStatusColor(portionResult.status)}`}>
                      {portionResult.variance > 0 ? '+' : ''}{portionResult.variance.toFixed(2)} <span className="text-3xl font-bold tracking-normal opacity-50">oz</span>
                    </div>
                    
                    {portionResult.status === 'BAD' && (
                      <div className="bg-red-500/20 text-red-400 p-4 rounded-xl flex items-center justify-center space-x-3 border border-red-500/30">
                        <AlertTriangle className="w-8 h-8" />
                        <div className="text-left">
                          <p className="text-xl font-bold leading-tight">Portion Rejected</p>
                          <p className="text-sm opacity-80">Variance exceeds 0.3oz limit. Recut required.</p>
                        </div>
                      </div>
                    )}
                    {portionResult.status === 'GOOD' && (
                      <div className="bg-green-500/20 text-green-400 p-4 rounded-xl flex items-center justify-center space-x-3 border border-green-500/30">
                        <CheckCircle2 className="w-8 h-8" />
                        <span className="text-xl font-bold">Perfect Cut! Proceed.</span>
                      </div>
                    )}

                    <button className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xl py-4 rounded-xl transition-colors">
                      Log Audit & Next
                    </button>
                  </div>
                ) : (
                  <div className="text-neutral-600 flex flex-col items-center space-y-4">
                    <Scale className="w-24 h-24 mb-4 opacity-50" />
                    <p className="text-2xl font-medium">Ready for Audit</p>
                    <p className="text-lg text-neutral-500">Enter actual weight to verify specs.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
