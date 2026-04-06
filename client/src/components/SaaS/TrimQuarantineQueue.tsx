import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AlertOctagon, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function TrimQuarantineQueue() {
  const { selectedCompany } = useAuth();
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: any = { 'Authorization': `Bearer ${token}` };
      if (selectedCompany) headers['X-Company-Id'] = selectedCompany;

      const res = await fetch('/api/v1/yield/quarantine-queue', { headers });
      const data = await res.json();
      if (res.ok) {
        setQueue(data);
      }
    } catch (err) {
      console.error('Error fetching quarantine queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [selectedCompany]);

  const resolveItem = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const token = localStorage.getItem('token');
      const headers: any = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      };
      if (selectedCompany) headers['X-Company-Id'] = selectedCompany;

      const res = await fetch(`/api/v1/yield/quarantine/${id}/resolve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action })
      });

      if (res.ok) {
        setQueue(prev => prev.filter(q => q.id !== id));
      } else {
        alert('Failed to resolve.');
      }
    } catch (err) {
      alert('Network error resolving item.');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-red-500" /></div>;
  }

  if (queue.length === 0) {
    return (
      <div className="bg-black/50 border border-neutral-800 rounded-xl p-8 text-center text-neutral-500">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <h3 className="text-xl font-bold">Inbox Zero</h3>
        <p>No quarantine exceptions pending review.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {queue.map(item => (
        <div key={item.id} className="bg-red-950/20 border border-red-900/50 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-4">
             <AlertOctagon className="w-10 h-10 text-red-500 mt-1 flex-shrink-0" />
             <div>
               <div className="flex items-center gap-2 mb-1">
                 <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                   {item.store?.store_name || `Store ID: ${item.store_id}`}
                 </span>
                 <span className="text-neutral-400 text-sm">
                   {new Date(item.created_at).toLocaleString()}
                 </span>
               </div>
               <h3 className="text-lg font-bold text-white mb-1">
                 {item.protein_name || 'Unknown Protein'}
               </h3>
               <p className="text-red-200 text-sm font-medium">
                 {item.quarantine_reason}
               </p>
               <div className="mt-2 text-xs text-neutral-400 font-mono">
                 Starting Wt: {item.input_weight} lbs | Fat Trimmed: {item.trim_weight} lbs | Loss: {((item.trim_weight / item.input_weight) * 100).toFixed(1)}%
               </div>
             </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
               onClick={() => resolveItem(item.id, 'APPROVE')}
               className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-900/40 hover:bg-red-600 border border-red-500/50 hover:border-red-500 text-white font-bold rounded-lg transition-colors"
            >
               ACCEPT (IGNORE AI)
            </button>
            <button 
               onClick={() => resolveItem(item.id, 'REJECT')}
               className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-bold rounded-lg transition-colors"
            >
               <XCircle className="w-4 h-4" /> REJECT
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
