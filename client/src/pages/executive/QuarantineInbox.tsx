import { ArrowLeft, ActivitySquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TrimQuarantineQueue from '../../components/SaaS/TrimQuarantineQueue';

export default function QuarantineInbox() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-3 bg-black hover:bg-neutral-800 border border-neutral-700 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-neutral-300" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-white capitalize">Supply Chain Inbox</h1>
              <p className="text-red-400 font-mono text-sm tracking-widest mt-1">
                 TRIM QUARANTINE RESOLUTION QUEUE
              </p>
            </div>
          </div>
          <div>
            <ActivitySquare className="w-10 h-10 text-red-500 opacity-50" />
          </div>
        </div>

        {/* Content */}
        <TrimQuarantineQueue />

      </div>
    </div>
  );
}
