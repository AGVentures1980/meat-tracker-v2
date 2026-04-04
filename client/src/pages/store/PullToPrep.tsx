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
import api from '../../services/api';
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
    // Extremely simplified mock parser for UI demonstration
    // In production, this would use a robust GS1-128 library
    if (barcode.length < 10) return null;
    
    // Mock parsing based on length/format
    const weightMatch = barcode.match(/3102(\d{6})/);
    const weight = weightMatch ? parseInt(weightMatch[1]) / 100 : (Math.random() * 20 + 40).toFixed(2);
    
    return {
      weightLbs: Number(weight),
      lotNumber: barcode.substring(barcode.length - 6),
      protein: 'Sirloin / Picanha' // Mock inference
    };
  };

  const handleBarcodeSubmit = async (barcode: string) => {
    if (!barcode.trim()) return;
    
    setIsLoading(true);
    try {
      // 1. Parse Barcode Locally for UI feedback
      const parsedData = parseGS1128(barcode);
      
      if (!parsedData) {
        alert('Invalid GS1-128 Barcode');
        setIsLoading(false);
        setManualBarcode('');
        return;
      }

      // 2. Send to API (Mocked for now as backend controller is pending)
      // await api.post(`/api/stores/${storeId}/prep/pull`, { barcode, ...parsedData });
      
      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 500));

      const newBox: PulledBox = {
        id: Math.random().toString(36).substr(2, 9),
        barcode,
        weightLbs: parsedData.weightLbs,
        lotNumber: parsedData.lotNumber,
        protein: parsedData.protein,
        pulledAt: new Date().toISOString()
      };

      setPulledBoxes(prev => [newBox, ...prev]);
      // alert(`Pulled ${newBox.weightLbs} lbs of ${newBox.protein}`);
      
      // Vibrate if supported (mobile/tablet UX)
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

    } catch (error) {
      console.error('Error pulling box:', error);
      alert('Failed to register pulled box');
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
