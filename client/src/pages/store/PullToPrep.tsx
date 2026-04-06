import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Scan, 
  Box, 
  CheckCircle2, 
  AlertTriangle,
  Camera,
  Keyboard,
  ListRestart
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../../context/AuthContext';
interface PulledBox {
  id: string;
  barcode: string;
  weightLbs: number;
  lotNumber: string;
  pulledAt: string;
  protein: string;
}

export default function PullToPrep() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [manualBarcode, setManualBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [pulledBoxes, setPulledBoxes] = useState<PulledBox[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Focus management for Bluetooth ring scanners
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Keep focus on input for Bluetooth scanners if not in camera mode
    if (!isScanning && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isScanning]);

  const parseGS1128 = (barcode: string) => {
    if (barcode.length < 10) return null;
    
    let weight = 0;
    // Extract weight based on standard GS1 (3102 / 3202) for Meat boxes
    const weightMatch = barcode.match(/(310|320)(\d)(\d{6})/);
    if (weightMatch) {
        const isLbs = weightMatch[1] === '320';
        const decimals = parseInt(weightMatch[2], 10);
        const rawWeight = parseInt(weightMatch[3], 10);
        let calculatedWeight = rawWeight / Math.pow(10, decimals);
        if (!isLbs) calculatedWeight = calculatedWeight * 2.20462;
        weight = parseFloat(calculatedWeight.toFixed(2));
    } else {
        const customSyscoMatch = barcode.match(/^(\d{8})(\d{4})(\d{10})(.+)$/);
        const nzProprietaryMatch = barcode.match(/^(\d{8})(\d{4})(00\d{2})(\d{6})$/);
        const weightMatchGroup = customSyscoMatch || nzProprietaryMatch;
        
        if (weightMatchGroup) {
            const rawKg = parseInt(weightMatchGroup[2], 10) / 100;
            weight = parseFloat((rawKg * 2.20462).toFixed(2));
        }
    }
    
    const lotMatch = barcode.match(/10([a-zA-Z0-9]{1,10})/);
    const lotNumber = lotMatch ? lotMatch[1].substring(0, 6) : barcode.substring(barcode.length - 6);

    return {
      weightLbs: weight,
      lotNumber: lotNumber,
      protein: 'Searching...' // Real DB protein is returned from backend now
    };
  };

  const handleBarcodeSubmit = async (barcode: string) => {
    if (!barcode.trim()) return;
    
    setIsLoading(true);
    try {
      const cleanBarcode = barcode.replace(/[\(\)\[\]\s]/g, '');
      const parsedData = parseGS1128(cleanBarcode);
      
      if (!parsedData) {
        alert('Invalid Barcode Format');
        return;
      }

      // Important fix: Call the actual backend endpoint
      const res = await fetch(`/api/v1/inventory/pull-to-prep`, {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${user?.token}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              store_id: user?.storeId,
              barcode: cleanBarcode
          })
      });

      const responseData = await res.json();

      if (!res.ok) {
          throw new Error(responseData.error || 'Failed to verify box in Store Inventory.');
      }

      const newBox: PulledBox = {
        id: Math.random().toString(36).substr(2, 9),
        barcode: cleanBarcode,
        weightLbs: parsedData.weightLbs,
        lotNumber: parsedData.lotNumber,
        protein: responseData.protein || 'Generic / Manual Map Required',
        pulledAt: new Date().toISOString()
      };

      setPulledBoxes(prev => [newBox, ...prev]);
      
      // Vibrate if supported (mobile/tablet UX)
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

    } catch (error: any) {
      console.error('Error pulling box:', error);
      const msg = error.response?.data?.error || 'Failed to verify box in Store Inventory. Are you sure you received this box at the Dock?';
      alert(msg);
    } finally {
      setIsLoading(false);
      setManualBarcode('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const toggleScanner = () => {
    if (isScanning) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
      setIsScanning(false);
    } else {
      setIsScanning(true);
      setTimeout(() => {
        scannerRef.current = new Html5QrcodeScanner(
          'reader',
          { fps: 10, qrbox: { width: 250, height: 150 } },
          false
        );
        scannerRef.current.render(
          (decodedText) => {
            handleBarcodeSubmit(decodedText);
            // Optionally auto-close scanner on success, but for prep pulling
            // they might want to scan multiple boxes rapidly.
          },
          (error) => {
            // Ignore ongoing read errors
          }
        );
      }, 100);
    }
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate(`/dashboard`)}
              className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-neutral-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Daily Prep Par Levels</h1>
              <p className="text-neutral-400">Transfer primal cuts from Cooler to WIP</p>
            </div>
          </div>
          <div className="bg-amber-500/10 text-amber-500 px-4 py-2 rounded-lg border border-amber-500/20 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">A La Carte Mode</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Scanner / Input Section */}
          <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-6 flex flex-col">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Scan className="w-5 h-5 mr-2 text-indigo-400" />
              Scan Box Barcode
            </h2>

            {/* Camera Scanner Container */}
            {isScanning && (
              <div className="mb-6 rounded-lg overflow-hidden border border-neutral-700 bg-black">
                <div id="reader" className="w-full"></div>
              </div>
            )}

            {/* Input Actions */}
            <div className="mt-auto space-y-4">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleBarcodeSubmit(manualBarcode);
                }}
                className="relative"
              >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Keyboard className="h-5 w-5 text-neutral-500" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Awaiting Bluetooth Scanner or Type GS1-128..."
                  className="block w-full pl-10 pr-3 py-4 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                  disabled={isLoading || isScanning}
                  autoFocus
                />
              </form>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={toggleScanner}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium flex items-center justify-center transition-colors ${
                    isScanning 
                      ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <Camera className="w-5 h-5 mr-2" />
                  {isScanning ? 'Close Camera' : 'Use Device Camera'}
                </button>
              </div>
            </div>
            
            <p className="text-xs text-neutral-500 mt-4 text-center">
              Ensure the barcode includes the (3102) net weight application identifier for accurate yield tracking.
            </p>
          </div>

          {/* Activity Log Section */}
          <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-6 flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <ListRestart className="w-5 h-5 mr-2 text-green-400" />
                Session History
              </h2>
              <span className="text-sm text-neutral-400">
                Total: <span className="text-white font-bold">{pulledBoxes.reduce((sum, box) => sum + box.weightLbs, 0).toFixed(2)} lbs</span>
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-neutral-700">
              {pulledBoxes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500 space-y-2">
                  <Box className="w-12 h-12 opacity-20" />
                  <p>No boxes pulled in this session yet.</p>
                  <p className="text-sm">Scan a box to begin.</p>
                </div>
              ) : (
                pulledBoxes.map((box, index) => (
                  <div 
                    key={box.id} 
                    className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 animate-in fade-in slide-in-from-left-4"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-green-500/10 p-2 rounded-full">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{box.protein}</p>
                          <p className="text-xs text-neutral-400 font-mono mt-0.5">Lot: #{box.lotNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{box.weightLbs.toFixed(2)} <span className="text-sm font-normal text-neutral-400">lbs</span></p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {new Date(box.pulledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
