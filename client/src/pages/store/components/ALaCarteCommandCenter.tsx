import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { 
  Lock, 
  Map, 
  Calculator, 
  AlertTriangle,
  FileText,
  Save,
  ShieldCheck,
  TrendingDown
} from 'lucide-react';
interface MenuItemLock {
  id: string;
  name: string;
  category: string;
  predictedCount: number;
  managerLockedCount: number | null;
  specOz: number;
}

export default function ALaCarteCommandCenter() {
  const { selectedCompany, user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItemLock[]>([
    { id: '1', name: 'Victoria\'s Filet 6oz', category: 'Steaks', predictedCount: 45, managerLockedCount: null, specOz: 6 },
    { id: '2', name: 'Outback Center-Cut Sirloin 8oz', category: 'Steaks', predictedCount: 120, managerLockedCount: null, specOz: 8 },
    { id: '3', name: 'Ribeye 12oz', category: 'Steaks', predictedCount: 30, managerLockedCount: null, specOz: 12 },
    { id: '4', name: 'Alice Springs Chicken', category: 'Chicken', predictedCount: 60, managerLockedCount: null, specOz: 8 },
  ]);

  const [isLocked, setIsLocked] = useState(false);
  const [totalPrepLbs, setTotalPrepLbs] = useState(0);

  useEffect(() => {
    // Calculate total Lbs needed based on locked or predicted
    let totalOz = 0;
    menuItems.forEach(item => {
      const count = item.managerLockedCount !== null ? item.managerLockedCount : item.predictedCount;
      totalOz += (count * item.specOz);
    });
    setTotalPrepLbs(totalOz / 16);
  }, [menuItems]);

  const handleLockUpdate = (id: string, value: string) => {
    if (isLocked) return;
    
    setMenuItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, managerLockedCount: value === '' ? null : parseInt(value) };
      }
      return item;
    }));
  };

  const submitPrepPlan = () => {
    if (!selectedCompany) { alert('No company selected.'); return; }
    
    // In production, send to YieldController or SmartPrepController
    alert('Shift Prep Plan Locked!');
    setIsLocked(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 to-neutral-900 border border-indigo-500/20 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center text-white">
              <Map className="w-6 h-6 mr-3 text-indigo-400" />
              A La Carte Shift Planner
            </h2>
            <p className="text-neutral-400 mt-1">Predictive menu item locking to determine prep pull requirements.</p>
          </div>
          <div className="bg-black/50 p-4 rounded-xl border border-neutral-800 text-right">
            <p className="text-xs text-neutral-500 uppercase tracking-widest font-bold">Total Prep Pull Required</p>
            <p className="text-3xl font-black text-indigo-400">{totalPrepLbs.toFixed(1)} <span className="text-sm text-neutral-500">lbs</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Item Lock Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-indigo-400" />
                Menu Item Forecast
              </h3>
              {isLocked && <span className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/30">PLAN LOCKED</span>}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-500">
                    <th className="py-3 px-4 font-bold">Menu Item</th>
                    <th className="py-3 px-4 font-bold text-center">Spec (oz)</th>
                    <th className="py-3 px-4 font-bold text-center">AI Predict</th>
                    <th className="py-3 px-4 font-bold text-center">Manager Lock</th>
                    <th className="py-3 px-4 font-bold text-right">Yield Pull (Lbs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {menuItems.map(item => {
                    const activeCount = item.managerLockedCount !== null ? item.managerLockedCount : item.predictedCount;
                    const pullLbs = (activeCount * item.specOz) / 16;
                    // Add 15% buffer for trimming standard
                    const targetPullLbs = pullLbs * 1.15; 

                    return (
                      <tr key={item.id} className="hover:bg-neutral-800/50 transition-colors">
                        <td className="py-4 px-4">
                          <p className="font-bold text-neutral-200">{item.name}</p>
                          <p className="text-xs text-neutral-500">{item.category}</p>
                        </td>
                        <td className="py-4 px-4 text-center font-mono text-neutral-400">{item.specOz}oz</td>
                        <td className="py-4 px-4 text-center font-mono text-neutral-300">{item.predictedCount}</td>
                        <td className="py-4 px-4 text-center w-32">
                          <input
                            type="number"
                            value={item.managerLockedCount === null ? '' : item.managerLockedCount}
                            onChange={(e) => handleLockUpdate(item.id, e.target.value)}
                            placeholder={item.predictedCount.toString()}
                            disabled={isLocked}
                            className="w-full bg-black border border-neutral-700 rounded-lg py-2 px-3 text-center font-bold text-indigo-400 focus:border-indigo-500 outline-none disabled:opacity-50"
                          />
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-white">
                          {targetPullLbs.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={submitPrepPlan}
                disabled={isLocked}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white px-8 py-3 rounded-xl font-bold tracking-wide transition-colors flex items-center shadow-lg shadow-indigo-900/20"
              >
                {isLocked ? (
                  <><Lock className="w-5 h-5 mr-2" /> Shift Prep Locked</>
                ) : (
                  <><Save className="w-5 h-5 mr-2" /> Lock Prep Plan</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Diagnostics */}
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold flex items-center mb-4">
              <ShieldCheck className="w-5 h-5 mr-2 text-green-400" />
              Cost Diagnostics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-black rounded-xl border border-neutral-800">
                <span className="text-sm text-neutral-400">Target Food Cost</span>
                <span className="font-bold text-green-400">28.5%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-black rounded-xl border border-neutral-800">
                <span className="text-sm text-neutral-400">Current Yield Trend</span>
                <span className="font-bold flex items-center text-amber-500">
                  <TrendingDown className="w-4 h-4 mr-1" /> 84.2%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <FileText className="w-24 h-24 text-indigo-500" />
             </div>
             <h3 className="text-lg font-bold text-indigo-400 mb-2">Instructions</h3>
             <p className="text-sm text-neutral-400 leading-relaxed relative z-10">
               Review the AI predictive forecast for today's shift. If you anticipate party changes or walk-ins, adjust the Manager Lock count. Locking the plan will dictate how many pounds the Butcher is authorized to pull from the cooler.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
