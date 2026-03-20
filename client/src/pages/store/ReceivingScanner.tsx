import React, { useState, useEffect, useRef } from 'react';
import { Truck, ScanLine, CheckCircle2, XCircle, AlertTriangle, Play, Square, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ReceivingScanner() {
  const { user, selectedCompany } = useAuth();
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'IDLE' | 'LOADING' | 'APPROVED' | 'REJECTED' | 'UNMAPPED' | 'NEEDS_WEIGHT'>('IDLE');
  const [resultMessage, setResultMessage] = useState('');
  const [cameraAccess, setCameraAccess] = useState<boolean | null>(null);
  const [extractedWeight, setExtractedWeight] = useState<number | null>(null);
  const [manualWeight, setManualWeight] = useState('');
  
  // States for Admin On-the-fly mapping
  const [scannedGtin, setScannedGtin] = useState('');
  const [roster, setRoster] = useState<string[]>([]);
  const [selectedProtein, setSelectedProtein] = useState('');
  const [isMapping, setIsMapping] = useState(false);

  // Ref for the input to keep focus for Bluetooth physical scanners
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input focused for Bluetooth Scanner guns when idle
  useEffect(() => {
    if (scanResult === 'IDLE' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanResult]);

  // Auto-submit debounce for scanners that don't send Enter
  useEffect(() => {
    if (scanResult !== 'IDLE' || !barcode) return;
    
    // Scanners input characters very fast. If there is a pause of 500ms and the barcode is > 10 chars, auto-trigger.
    const timeout = setTimeout(() => {
        if (barcode.replace(/[\(\)\s\u001D]/g, '').length >= 10) {
            verifyBarcode(barcode);
        }
    }, 500);

    return () => clearTimeout(timeout);
  }, [barcode, scanResult]);

  const toggleCamera = async () => {
    if (!isScanning) {
      try {
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setCameraAccess(true);
        setIsScanning(true);
      } catch (err) {
        console.error("Camera access denied:", err);
        setCameraAccess(false);
      }
    } else {
      setIsScanning(false);
    }
  };

  const verifyBarcode = async (inputBarcode: string, manualWeightOverride?: number) => {
    if (!inputBarcode) return;
    
    setIsScanning(false);
    setScanResult('LOADING');
    setExtractedWeight(null);
    setScannedGtin('');
    setRoster([]);
    setSelectedProtein('');
    
    try {
      // 1. Clean the barcode (remove spaces, braces)
      const cleanBarcode = inputBarcode.replace(/[\(\)\[\]\s]/g, '');
      
      // 2. Extract GTIN
      const parsedGtinMatch = cleanBarcode.match(/(01|02)(\d{14})/);
      let parsedGtin = null;
      if (parsedGtinMatch) {
          parsedGtin = parsedGtinMatch[2];
      }

      // 3. Extract Weight
      let parsedWeight = 0;

      if (manualWeightOverride) {
          parsedWeight = manualWeightOverride;
      } else {
          // 310n (Net Weight in Kg) or 320n (Net Weight in Lbs)
          const weightMatch = cleanBarcode.match(/(310|320)(\d)(\d{6})/);
          if (weightMatch) {
              const isLbs = weightMatch[1] === '320';
              const decimals = parseInt(weightMatch[2], 10);
              const rawWeight = parseInt(weightMatch[3], 10);
              let weight = rawWeight / Math.pow(10, decimals);
              if (!isLbs) weight = weight * 2.20462;
              parsedWeight = parseFloat(weight.toFixed(2));
          } else {
              // Fallback patterns
              const demoWeightMatch = cleanBarcode.match(/W(\d{4})/);
              if (demoWeightMatch) parsedWeight = parseInt(demoWeightMatch[1], 10) / 100;
              const lambMatch = cleanBarcode.match(/^(\d{8})(\d{4})(\d{10})$/);
              if (lambMatch && cleanBarcode.length === 22) {
                  const rawKg = parseInt(lambMatch[2], 10) / 100;
                  parsedWeight = parseFloat((rawKg * 2.20462).toFixed(2));
              }
          }
      }

      setExtractedWeight(parsedWeight);
      
      if (parsedWeight === 0) {
          setScanResult('NEEDS_WEIGHT');
          return;
      }
      
      const res = await fetch('/api/v1/compliance/scan', {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${user?.token}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              barcode: cleanBarcode,
              gtin: parsedGtin || cleanBarcode.substring(0, 14),
              weight: parsedWeight,
              store_id: user?.storeId
          })
      });

      const data = await res.json();

      if (data.status === 'APPROVED') {
          setScanResult('APPROVED');
          setResultMessage(`Box Authorized! 🥩 ${data.protein}`);
      } else if (data.status === 'UNMAPPED_ALLOW_MAPPING') {
          setScanResult('UNMAPPED');
          setResultMessage('New Unknown Barcode Detected! You are an Admin. Please map this product.');
          setScannedGtin(data.gtin || parsedGtin || cleanBarcode.substring(0, 14));
          setRoster(data.roster || []);
      } else {
          setScanResult('REJECTED');
          setResultMessage(data.error || 'UNAUTHORIZED SUBSTITUTION! Reject this box. Alert sent to David Castro.');
      }
      
    } catch (error) {
      setScanResult('REJECTED');
      setResultMessage('NETWORK ERROR. Do not accept delivery until verified.');
    }
  };

  const handleMapBarcode = async () => {
      if (!selectedProtein) return;
      setIsMapping(true);
      try {
          const res = await fetch('/api/v1/compliance/map-barcode', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${user?.token}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  gtin: scannedGtin,
                  protein_name: selectedProtein,
                  barcode: barcode || scannedGtin,
                  weight: extractedWeight,
                  store_id: user?.storeId
              })
          });
          const data = await res.json();
          if (data.status === 'APPROVED') {
              setScanResult('APPROVED');
              setResultMessage(`Successfully Mapped! 🥩 ${data.protein}`);
          } else {
              setScanResult('REJECTED');
              setResultMessage('Failed to map barcode.');
          }
      } catch (err) {
          setScanResult('REJECTED');
          setResultMessage('Network Error mapping barcode.');
      } finally {
          setIsMapping(false);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyBarcode(barcode);
  };

  const resetScanner = () => {
    setScanResult('IDLE');
    setResultMessage('');
    setBarcode('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-4xl mx-auto overflow-hidden animate-fade-in relative pt-4">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 px-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <ScanLine className="w-8 h-8 text-[#C5A059]" />
            Receiving QC Gateway
          </h1>
          <p className="text-slate-400 mt-1 max-w-lg text-sm">
            Garcia Rule Enforced: No protein enters the walk-in without a validated Barcode Match.
          </p>
        </div>
      </div>

      {/* Main Scanner Area */}
      {scanResult === 'IDLE' && (
        <div className="flex-1 flex flex-col gap-6 px-4">
          
          {/* Hardware Connection Card */}
          <div className="bg-slate-800/60 border border-emerald-500/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-[0_0_20px_rgba(16,185,129,0.1)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full pointer-events-none"></div>
            
            <Truck className="w-16 h-16 text-emerald-500 mb-4 opacity-80" />
            <h2 className="text-xl font-bold text-white mb-2">Ready to Receive Delivery</h2>
            <p className="text-slate-400 text-sm max-w-md mb-6">
              Use your paired Bluetooth Scanner on the Sysco boxes, or type the code manually below.
            </p>
            <form onSubmit={handleSubmit} className="w-full max-w-sm relative">
              <input 
                ref={inputRef}
                type="text" 
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Awaiting Barcode Input..."
                className="w-full bg-slate-900 border-2 border-emerald-500/50 text-emerald-400 font-mono text-center text-xl rounded-xl px-4 py-4 pr-14 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] placeholder:text-slate-600"
                autoFocus
                autoComplete="off"
              />
              <button 
                type="submit"
                disabled={!barcode}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:opacity-50 p-2 text-white rounded-lg transition-colors"
                title="Verify Barcode"
              >
                <ScanLine className="w-6 h-6" />
              </button>
            </form>
            <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">OR</span>
          </div>

          {/* iPad Camera Fallback */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center flex-1">
             <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
               <ScanLine className="w-8 h-8 text-slate-400" />
             </div>
             <h3 className="text-lg font-bold text-white mb-1">Use iPad Camera</h3>
             <p className="text-slate-400 text-xs max-w-xs mb-6">
               If your physical scanner is broken, activate the device camera as a fallback.
             </p>
             
             {cameraAccess === false ? (
               <p className="text-rose-400 text-sm font-medium bg-rose-500/10 px-4 py-2 rounded-lg">Camera Access Denied. Check Safari/Chrome Settings.</p>
             ) : (
               <button 
                onClick={toggleCamera}
                className={`px-8 py-3 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg flex items-center gap-2 ${
                  isScanning 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30' 
                    : 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600'
                }`}
              >
                {isScanning ? <><Square className="w-4 h-4 fill-current"/> Stop Camera</> : <><Play className="w-4 h-4 fill-current"/> Start Camera Scanner</>}
              </button>
             )}

             {isScanning && (
               <div className="mt-6 w-full max-w-sm aspect-video bg-black rounded-lg border-2 border-[#C5A059] relative overflow-hidden flex items-center justify-center">
                  <p className="text-[#C5A059] font-mono text-xs animate-pulse z-10">Searching for visual barcode...</p>
                  <div className="absolute inset-x-8 h-0.5 bg-red-500/80 top-1/2 -translate-y-1/2 shadow-[0_0_10px_red]"></div>
               </div>
             )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {scanResult === 'LOADING' && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in text-center px-4">
          <Loader2 className="w-20 h-20 text-blue-500 animate-spin mb-6" />
          <h2 className="text-4xl font-bold text-white mb-2 font-mono tracking-tight">VERIFYING CODE</h2>
          <p className="text-xl text-blue-400 font-mono tracking-widest">{barcode}</p>
          <div className="mt-8 text-slate-400 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Cross-referencing Corporate DB
          </div>
        </div>
      )}

      {/* NEEDS WEIGHT SCREEN */}
      {scanResult === 'NEEDS_WEIGHT' && (
        <div className="absolute inset-0 bg-blue-900/95 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-in slide-in-from-bottom text-center px-6">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.4)] animate-pulse">
            <ScanLine className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">WEIGHT REQUIRED</h2>
          <p className="text-blue-100 mb-8 max-w-md">The scanner could not extract the weight from this barcode. Please enter the case weight manually in LBS.</p>
          <input 
             type="number" 
             step="0.01"
             autoFocus
             value={manualWeight} 
             onChange={e => setManualWeight(e.target.value)}
             className="w-full max-w-xs text-center text-3xl font-black p-4 rounded-xl mb-6 bg-white/10 text-white border-2 border-blue-400 focus:border-white outline-none"
             placeholder="0.00"
          />
          <div className="flex gap-4 w-full max-w-xs">
            <button 
              onClick={resetScanner}
              className="px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white flex-1 font-bold transition-all"
            >
              Cancel
            </button>
            <button 
              disabled={!manualWeight || parseFloat(manualWeight) <= 0}
              onClick={() => verifyBarcode(barcode, parseFloat(manualWeight))}
              className="px-6 py-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white flex-1 font-bold disabled:opacity-50 transition-all"
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {/* GREEN APPROVED SCREEN - O "SIM" */}
      {scanResult === 'APPROVED' && (
        <div className="absolute inset-0 bg-emerald-600/95 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-in slide-in-from-bottom text-center px-6">
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.4)] animate-bounce">
            <CheckCircle2 className="w-24 h-24 text-emerald-600" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-2 uppercase tracking-tighter">APPROVED</h2>
          <p className="text-xl text-emerald-100 font-medium mb-8 max-w-md leading-relaxed">
            {resultMessage}
          </p>

          {/* New Weight Verification Block as Requested */}
          {extractedWeight !== null && (
            <div className="bg-white/10 px-8 py-6 rounded-2xl border-2 border-emerald-300/50 mb-8 w-full max-w-md shadow-2xl backdrop-blur-xl">
              <p className="text-emerald-200 text-sm uppercase font-bold tracking-widest mb-2">Extracted Box Weight</p>
              <div className="flex items-end justify-center gap-2">
                <span className="text-6xl font-black text-white tabular-nums tracking-tighter">{extractedWeight.toFixed(2)}</span>
                <span className="text-2xl font-bold text-emerald-200 mb-2">LBS</span>
              </div>
              <p className="text-emerald-100/70 text-xs mt-4">Manager: Verify this weight matches the physical box label.</p>
            </div>
          )}

          <div className="bg-emerald-900/50 px-6 py-4 rounded-xl border border-emerald-400/30 mb-8 w-full max-w-md">
            <p className="text-emerald-200 text-sm uppercase font-bold tracking-widest mb-1">Scanned Code</p>
            <p className="text-xl text-white font-mono break-all">{barcode}</p>
          </div>
          
          <button 
            onClick={resetScanner}
            className="bg-white text-emerald-700 hover:bg-emerald-50 px-12 py-5 rounded-xl font-black text-xl tracking-wider transition-all shadow-xl uppercase w-full max-w-md flex items-center justify-center gap-3"
          >
            <CheckCircle2 className="w-6 h-6" /> OK - Next Box
          </button>
        </div>
      )}

      {/* RED REJECTED SCREEN (THE GARCIA RULE) - O "NÃO" */}
      {scanResult === 'REJECTED' && (
        <div className="absolute inset-0 bg-rose-600/95 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-in zoom-in-95 text-center px-6">
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(255,255,255,0.4)] animate-pulse">
            <XCircle className="w-24 h-24 text-rose-600" />
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-white mb-4 uppercase tracking-tighter leading-none">DO NOT ACCEPT</h2>
          <div className="flex items-center justify-center gap-2 mb-8 bg-black/30 px-4 py-2 rounded-full border border-rose-400/30">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 font-bold uppercase tracking-widest text-sm">GARCIA RULE TRIGGERED</span>
          </div>
          
          <p className="text-xl md:text-2xl text-rose-50 font-medium mb-12 max-w-lg leading-relaxed px-4">
            {resultMessage}
          </p>
          
          <div className="bg-rose-900/50 px-6 py-4 rounded-xl border border-rose-400/30 mb-12 w-full max-w-md">
            <p className="text-rose-200 text-sm uppercase font-bold tracking-widest mb-1">Scanned Invalid Code</p>
            <p className="text-3xl text-white font-mono">{barcode}</p>
          </div>
          
          <button 
            onClick={resetScanner}
            className="bg-black text-white hover:bg-slate-900 border border-slate-800 px-12 py-5 rounded-xl font-black text-xl tracking-wider transition-all shadow-2xl uppercase w-full max-w-md"
          >
            Return to Delivery Log
          </button>
        </div>
      )}

      {/* YELLOW UNMAPPED SCREEN (ADMIN ON-THE-FLY MAPPING) */}
      {scanResult === 'UNMAPPED' && (
        <div className="absolute inset-0 bg-yellow-600/95 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-in slide-in-from-bottom text-center px-6">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.4)] animate-pulse">
            <AlertTriangle className="w-16 h-16 text-yellow-600" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-2 uppercase tracking-tighter">UNKNOWN PRODUCT</h2>
          <p className="text-lg text-yellow-100 font-medium mb-6 max-w-md leading-relaxed">
            {resultMessage}
          </p>

          <div className="bg-black/40 px-6 py-6 rounded-2xl border-2 border-yellow-300/50 mb-8 w-full max-w-md shadow-2xl backdrop-blur-xl text-left">
              <p className="text-yellow-200 text-sm uppercase font-bold tracking-widest mb-4">MAP GTIN TO ROSTER</p>
              
              <div className="flex flex-col gap-2 mb-4">
                  <label className="text-xs font-bold text-gray-400 uppercase">Item Code / GTIN (Edit if necessary)</label>
                  <input
                      type="text"
                      title="Item Code / GTIN"
                      value={scannedGtin}
                      onChange={(e) => setScannedGtin(e.target.value)}
                      className="w-full bg-[#252525] text-white p-3 border-2 border-white/10 rounded-xl focus:outline-none focus:border-yellow-500 font-mono text-sm"
                  />
                  {extractedWeight && <div className="mt-1"><span className="bg-white/10 text-white font-mono text-xs px-2 py-1 rounded border border-white/20">Weight: {extractedWeight.toFixed(2)} lbs</span></div>}
              </div>
              
              <div className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Select Target Product</label>
                      <select 
                          title="Select Target Product"
                          value={selectedProtein}
                          onChange={(e) => setSelectedProtein(e.target.value)}
                          className="w-full bg-[#252525] text-white p-4 border-2 border-white/10 rounded-xl focus:outline-none focus:border-yellow-500 font-bold"
                      >
                          <option value="">-- Choose from Master Roster --</option>
                          {roster.map(item => (
                              <option key={item} value={item}>{item}</option>
                          ))}
                      </select>
                  </div>

                  <button
                      onClick={handleMapBarcode}
                      disabled={!selectedProtein || isMapping}
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-black p-4 rounded-xl font-black uppercase tracking-widest disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-xl"
                  >
                      {isMapping ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Saving Configuration...</>
                      ) : (
                          'Save Mapping & Authorize Box'
                      )}
                  </button>
              </div>
          </div>
          
          <button 
            onClick={resetScanner}
            className="text-white hover:text-yellow-200 text-sm font-bold tracking-wider transition-colors uppercase mt-4 underline decoration-yellow-400/50 underline-offset-4"
          >
            Cancel and Reject Box
          </button>
        </div>
      )}

    </div>
  );
}
