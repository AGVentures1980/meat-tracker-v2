import React, { useState, useEffect, useRef } from 'react';
import { Truck, ScanLine, CheckCircle2, XCircle, AlertTriangle, Play, Square, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ReceivingScanner() {
  const { user, selectedCompany } = useAuth();
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'IDLE' | 'LOADING' | 'APPROVED' | 'REJECTED'>('IDLE');
  const [resultMessage, setResultMessage] = useState('');
  const [cameraAccess, setCameraAccess] = useState<boolean | null>(null);
  
  // Ref for the input to keep focus for Bluetooth physical scanners
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input focused for Bluetooth Scanner guns when idle
  useEffect(() => {
    if (scanResult === 'IDLE' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanResult]);

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

  const [extractedWeight, setExtractedWeight] = useState<number | null>(null);

  const verifyBarcode = async (scannedCode: string) => {
    if (!scannedCode) return;
    setScanResult('LOADING');
    setExtractedWeight(null);
    
    try {
      // In production: POST /api/v1/compliance/scan
      // Example payload: { barcode: scannedCode, store_id: user.storeId, company_id: selectedCompany }
      
      // GS1-128 Parsing Logic
      const cleanBarcode = scannedCode.replace(/[\(\)\s\u001D]/g, '');
      let parsedWeight = null;

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

      setExtractedWeight(parsedWeight);
      
      // MOCK LOGIC for demo
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API latency
      
      // Check if Corporate Spec is found inside the barcode
      if (cleanBarcode.includes('4964367') || cleanBarcode.includes('4580211') || cleanBarcode.includes('8820023')) {
        setScanResult('APPROVED');
        if (parsedWeight) {
          setResultMessage(`Corporate Spec Authorized! Box Weight: ${parsedWeight.toFixed(2)} lbs`);
        } else {
          setResultMessage('Match Found! Corporate Spec Authorized (No weight extracted).');
        }
        // Add loud success "BEEP" audio here for the Kitchen environment
      } else {
        setScanResult('REJECTED');
        setResultMessage('UNAUTHORIZED SUBSTITUTION! Reject this box. Alert sent to David Castro.');
        // Add loud warning buzzer audio here
      }
      
      setBarcode('');
      
    } catch (error) {
      setScanResult('REJECTED');
      setResultMessage('NETWORK ERROR. Do not accept delivery until verified.');
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
                className="w-full bg-slate-900 border-2 border-emerald-500/50 text-emerald-400 font-mono text-center text-xl rounded-xl px-4 py-4 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] placeholder:text-slate-600"
                autoFocus
                autoComplete="off"
              />
              <ScanLine className="w-5 h-5 text-emerald-500/50 flex absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </form>
          </div>

          <div className="text-center">
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

    </div>
  );
}
