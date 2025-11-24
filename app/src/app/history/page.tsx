'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js';

interface Transaction {
  signature: string;
  slot: number;
  blockTime: number;
  status: 'success' | 'error';
  type: string;
}

export default function HistoryPage() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (publicKey && connection) {
      fetchHistory();
    }
  }, [publicKey, connection]);

  const fetchHistory = async () => {
    if (!publicKey || !connection) return;

    setLoading(true);
    try {
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 20 });
      
      const formattedTxs: Transaction[] = signatures.map(sig => ({
        signature: sig.signature,
        slot: sig.slot,
        blockTime: sig.blockTime || 0,
        status: sig.err ? 'error' : 'success',
        type: 'Transaction' 
      }));

      setTransactions(formattedTxs);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (!publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 glass-panel rounded-2xl">
          <p className="text-gray-400 mb-4">Please connect your wallet to view history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="text-accent">Transaction</span> History
        </h1>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-semibold py-2 px-4 rounded-xl disabled:opacity-50 transition-all duration-300 flex items-center gap-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : (
            <span>🔄 Refresh</span>
          )}
        </button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
        {loading && transactions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-6xl mb-4">📜</div>
            <h3 className="text-xl text-white font-medium mb-2">No History Found</h3>
            <p className="text-gray-400">You haven't made any transactions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/20">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Signature</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Slot</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx) => (
                  <tr key={tx.signature} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                      {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                      {tx.slot}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatDate(tx.blockTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.status === 'success' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a
                        href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-white transition-colors flex items-center gap-1"
                      >
                        View <span className="text-xs">↗</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
