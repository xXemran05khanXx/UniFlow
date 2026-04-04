import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, CheckCircle, XCircle, Clock, Search, AlertCircle } from 'lucide-react';

const BASE_URL = '/api';

function authHeaders() {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export default function AdminSwapsPage() {
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPendingSwaps = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/swaps/admin`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) {
        setSwaps(json.data || []);
      } else {
        setError(json.error || 'Failed to fetch swaps');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSwaps();
  }, []);

  const handleAction = async (swapId: string, action: 'approve' | 'reject') => {
    if (!window.confirm(`Are you sure you want to ${action} this swap?`)) return;
    
    try {
      setProcessingId(swapId);
      const res = await fetch(`${BASE_URL}/swaps/${swapId}/admin-action`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ action })
      });
      const json = await res.json();
      
      if (json.success) {
        // Remove the processed swap from the list
        setSwaps(prev => prev.filter(s => s._id !== swapId));
      } else {
        alert(json.error || `Failed to ${action} swap`);
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading pending swaps...</div>;
  if (error) return <div className="p-6 text-center text-red-500"><AlertCircle className="mx-auto mb-2"/>{error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Swap Requests</h1>
          <p className="text-gray-500">Review and approve lecture swaps between faculty members.</p>
        </div>
        <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg font-medium flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          {swaps.length} Pending
        </div>
      </div>

      {swaps.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
          <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
          <p>There are no swap requests waiting for admin approval.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {swaps.map((swap) => (
            <div key={swap._id} className="bg-white rounded-lg shadow p-5 border-l-4 border-orange-400">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                
                {/* Requestor Info */}
                <div className="flex-1 bg-gray-50 p-4 rounded-md">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Requestor</p>
                  <p className="font-semibold text-gray-900">{swap.requestedBy?.user?.name || 'Unknown'}</p>
                  <div className="text-sm text-gray-600 mt-2">
                    <p>📚 {swap.fromSession?.courseName || swap.fromSession?.courseCode || 'Course N/A'}</p>
                    <p>📅 {swap.fromSession?.dayOfWeek} at {swap.fromSession?.startTime}</p>
                  </div>
                </div>

                <div className="hidden md:flex flex-col items-center justify-center text-gray-400 px-2">
                  <ArrowLeftRight className="w-6 h-6" />
                </div>

                {/* Target Teacher Info */}
                <div className="flex-1 bg-gray-50 p-4 rounded-md">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Target Teacher</p>
                  <p className="font-semibold text-gray-900">{swap.requestedTo?.user?.name || 'Unknown'}</p>
                  <div className="text-sm text-gray-600 mt-2">
                    <p>📚 {swap.toSession?.courseName || swap.toSession?.courseCode || 'Course N/A'}</p>
                    <p>📅 {swap.toSession?.dayOfWeek} at {swap.toSession?.startTime}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex md:flex-col gap-2 w-full md:w-auto mt-4 md:mt-0">
                  <button
                    disabled={processingId === swap._id}
                    onClick={() => handleAction(swap._id, 'approve')}
                    className="flex-1 md:flex-none flex items-center justify-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </button>
                  <button
                    disabled={processingId === swap._id}
                    onClick={() => handleAction(swap._id, 'reject')}
                    className="flex-1 md:flex-none flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-md transition disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </button>
                </div>

              </div>
              
              {swap.reason && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
                  <span className="font-semibold text-gray-800">Reason: </span>
                  {swap.reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}